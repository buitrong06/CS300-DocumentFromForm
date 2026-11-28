from __future__ import annotations

import hashlib
import os
import subprocess
import tempfile
import threading
from collections.abc import Callable
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from zipfile import ZIP_DEFLATED, ZipFile

import httpx
from lxml import etree
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.validation import ValidationResult
from app.core.config import Settings
from app.core.models import DocumentDraft, FileArtifact, RenderSnapshot, TemplateField
from app.modules.drafts.service import get_owned_draft
from app.modules.rendering.schemas import ExportRequest, PreviewRequest, RenderSnapshotView
from app.modules.templates.lifecycle import (
    TemplatePublishError,
    generation_from_template,
    load_source,
)
from app.modules.templates.schemas import FillRequest
from app.modules.templates.services.docx_filler import DocxFiller, DocxFillError
from app.modules.validation.service import validate_draft

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
PDF_MEDIA_TYPE = "application/pdf"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W}
SAFE_XML_PARSER = etree.XMLParser(resolve_entities=False, no_network=True)
MAX_CONCURRENT_CONVERSIONS = 2
_conversion_slots = threading.BoundedSemaphore(MAX_CONCURRENT_CONVERSIONS)


class RenderError(RuntimeError):
    pass


class RenderConflictError(RuntimeError):
    pass


class FinalExportBlockedError(RenderError):
    def __init__(self, validation: ValidationResult) -> None:
        super().__init__("Final export is blocked by deterministic validation failures")
        self.validation = validation


def fields_for_template(db: Session, template_id: int) -> list[TemplateField]:
    return list(
        db.scalars(
            select(TemplateField)
            .where(TemplateField.template_id == template_id)
            .order_by(TemplateField.display_order, TemplateField.id)
        )
    )


def snapshot_view(snapshot: RenderSnapshot, artifact: FileArtifact) -> RenderSnapshotView:
    return RenderSnapshotView(
        id=snapshot.id,
        draft_id=snapshot.draft_id or 0,
        source_draft_version=snapshot.source_draft_version or 0,
        format=snapshot.format,
        purpose=snapshot.purpose,
        artifact_id=artifact.id,
        sha256=artifact.sha256,
        filename=artifact.original_filename,
        rendered_at=snapshot.rendered_at,
        content_url=f"/api/render-snapshots/{snapshot.id}/content",
    )


def get_owned_snapshot(
    db: Session, owner_id: int, snapshot_id: int
) -> tuple[RenderSnapshot, FileArtifact] | None:
    return db.execute(
        select(RenderSnapshot, FileArtifact)
        .join(FileArtifact, RenderSnapshot.artifact_id == FileArtifact.id)
        .join(DocumentDraft, RenderSnapshot.draft_id == DocumentDraft.id)
        .where(
            RenderSnapshot.id == snapshot_id,
            DocumentDraft.owner_id == owner_id,
            DocumentDraft.deleted_at.is_(None),
        )
    ).one_or_none()


def read_snapshot_content(storage_dir: Path, artifact: FileArtifact) -> bytes:
    try:
        return (storage_dir / artifact.storage_key).read_bytes()
    except FileNotFoundError as exc:
        raise RenderError("Rendered artifact is no longer available") from exc


def export_filename(template_name: str, purpose: str, format_name: str) -> str:
    suffix = ".docx" if format_name == "docx" else ".pdf"
    return output_filename(template_name, purpose, suffix)


def preview_draft(
    db: Session,
    owner_id: int,
    draft_id: int,
    request: PreviewRequest,
    settings: Settings,
) -> RenderSnapshotView | None:
    return render_draft(
        db,
        owner_id,
        draft_id,
        expected_version=request.expected_version,
        format_name="pdf",
        purpose="preview",
        settings=settings,
    )


def export_draft(
    db: Session,
    owner_id: int,
    draft_id: int,
    request: ExportRequest,
    settings: Settings,
) -> RenderSnapshotView | None:
    view = render_draft(
        db,
        owner_id,
        draft_id,
        expected_version=request.expected_version,
        format_name=request.format,
        purpose=request.purpose,
        settings=settings,
    )
    if view is None:
        return None
    with db.begin():
        row = get_owned_draft(db, owner_id, draft_id)
        if row is None:
            return None
        _, template = row
    return view.model_copy(
        update={"filename": export_filename(template.name, request.purpose, request.format)}
    )


def render_draft(
    db: Session,
    owner_id: int,
    draft_id: int,
    *,
    expected_version: int,
    format_name: str,
    purpose: str,
    settings: Settings,
) -> RenderSnapshotView | None:
    storage_dir = Path(settings.storage_local_dir)
    with db.begin():
        row = get_owned_draft(db, owner_id, draft_id)
        if row is None:
            return None
        draft, template = row
        if draft.version != expected_version:
            raise RenderConflictError("This Draft changed elsewhere. Reload before rendering.")
        fields = fields_for_template(db, template.id)
        validation = validate_draft(draft, fields)
        if purpose == "final_export" and not validation.gate.final_export_allowed:
            raise FinalExportBlockedError(validation)
        existing = existing_snapshot(db, draft.id, draft.version, format_name, purpose)
        if existing is not None:
            snapshot, artifact = existing
            if (storage_dir / artifact.storage_key).is_file():
                return snapshot_view(snapshot, artifact)
        if format_name == "pdf" and purpose != "draft_export":
            shared = reuse_canonical_pdf(db, storage_dir, draft.id, draft.version, purpose)
            if shared is not None:
                return shared
        source_artifact = db.get(FileArtifact, template.source_artifact_id)
        if source_artifact is None:
            raise RenderError("This Template has no renderable DOCX source artifact")
        generation = generation_from_template(template, source_artifact)
        if generation is None:
            raise RenderError("This Template has no reviewed field bindings")
        try:
            source = load_source(storage_dir, source_artifact)
        except TemplatePublishError as exc:
            raise RenderError(str(exc)) from exc
        values = {key: str(value) for key, value in draft.field_values.items()}
        draft_version = draft.version

    try:
        docx = DocxFiller().fill(
            source,
            generation,
            FillRequest(values=values),
            allow_missing_required=purpose in {"draft_export", "preview"},
        )
        if purpose == "draft_export":
            docx = mark_as_draft(docx)
        content = (
            docx
            if format_name == "docx"
            else convert_to_pdf(
                docx, settings, lambda: require_draft_version(db, owner_id, draft_id, draft_version)
            )
        )
    except (DocxFillError, OSError, subprocess.SubprocessError) as exc:
        raise RenderError(str(exc)) from exc

    suffix = ".docx" if format_name == "docx" else ".pdf"
    filename = output_filename(template.name, purpose, suffix)
    artifact, written_path = write_artifact(
        storage_dir,
        content,
        filename=filename,
        mime_type=DOCX_MEDIA_TYPE if format_name == "docx" else PDF_MEDIA_TYPE,
        owner_id=owner_id,
    )
    try:
        with db.begin():
            # The row lock serializes concurrent persists so one version keeps one PDF.
            current = db.scalar(
                select(DocumentDraft.version)
                .where(
                    DocumentDraft.id == draft_id,
                    DocumentDraft.owner_id == owner_id,
                    DocumentDraft.deleted_at.is_(None),
                )
                .with_for_update()
            )
            if current is None:
                return None
            if current != draft_version:
                raise RenderConflictError(
                    "This Draft changed during rendering. Reload before rendering."
                )
            if format_name == "pdf" and purpose != "draft_export":
                shared = reuse_canonical_pdf(db, storage_dir, draft_id, draft_version, purpose)
                if shared is not None:
                    written_path.unlink(missing_ok=True)
                    return shared
            db.add(artifact)
            db.flush()
            snapshot = RenderSnapshot(
                draft_id=draft_id,
                source_draft_version=draft_version,
                format=format_name,
                purpose=purpose,
                artifact_id=artifact.id,
            )
            db.add(snapshot)
            db.flush()
            return snapshot_view(snapshot, artifact)
    except Exception:
        written_path.unlink(missing_ok=True)
        raise


def require_draft_version(db: Session, owner_id: int, draft_id: int, version: int) -> None:
    """Raise unless the Draft is still at ``version``; uses its own short transaction."""
    with db.begin():
        current = db.scalar(
            select(DocumentDraft.version).where(
                DocumentDraft.id == draft_id, DocumentDraft.owner_id == owner_id
            )
        )
    if current != version:
        raise RenderConflictError("This Draft changed before rendering. Reload before rendering.")


def reuse_canonical_pdf(
    db: Session, storage_dir: Path, draft_id: int, version: int, purpose: str
) -> RenderSnapshotView | None:
    """Point this purpose at the already rendered preview/final PDF bytes, if any."""
    canonical = canonical_pdf_snapshot(db, draft_id, version)
    if canonical is None:
        return None
    snapshot, artifact = canonical
    if not (storage_dir / artifact.storage_key).is_file():
        return None
    if snapshot.purpose == purpose:
        return snapshot_view(snapshot, artifact)
    reference = RenderSnapshot(
        draft_id=draft_id,
        source_draft_version=version,
        format="pdf",
        purpose=purpose,
        artifact_id=artifact.id,
    )
    db.add(reference)
    db.flush()
    return snapshot_view(reference, artifact)


def existing_snapshot(
    db: Session, draft_id: int, version: int, format_name: str, purpose: str
) -> tuple[RenderSnapshot, FileArtifact] | None:
    return db.execute(
        select(RenderSnapshot, FileArtifact)
        .join(FileArtifact, RenderSnapshot.artifact_id == FileArtifact.id)
        .where(
            RenderSnapshot.draft_id == draft_id,
            RenderSnapshot.source_draft_version == version,
            RenderSnapshot.format == format_name,
            RenderSnapshot.purpose == purpose,
        )
        .order_by(RenderSnapshot.id.desc())
    ).first()


def canonical_pdf_snapshot(
    db: Session, draft_id: int, version: int
) -> tuple[RenderSnapshot, FileArtifact] | None:
    """Return a non-draft PDF for preview/final-export byte parity."""
    return db.execute(
        select(RenderSnapshot, FileArtifact)
        .join(FileArtifact, RenderSnapshot.artifact_id == FileArtifact.id)
        .where(
            RenderSnapshot.draft_id == draft_id,
            RenderSnapshot.source_draft_version == version,
            RenderSnapshot.format == "pdf",
            RenderSnapshot.purpose.in_(("preview", "final_export")),
        )
        .order_by(RenderSnapshot.id.desc())
    ).first()


def write_artifact(
    storage_dir: Path,
    content: bytes,
    *,
    filename: str,
    mime_type: str,
    owner_id: int,
) -> tuple[FileArtifact, Path]:
    extension = Path(filename).suffix
    storage_key = f"render-snapshots/{uuid4()}{extension}"
    destination = storage_dir / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix(f"{extension}.tmp-{uuid4().hex}")
    try:
        temp.write_bytes(content)
        os.replace(temp, destination)
    finally:
        temp.unlink(missing_ok=True)
    return (
        FileArtifact(
            storage_key=storage_key,
            original_filename=filename,
            mime_type=mime_type,
            byte_size=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
            uploaded_by=owner_id,
        ),
        destination,
    )


def output_filename(template_name: str, purpose: str, suffix: str) -> str:
    stem = Path(template_name).stem.strip() or "document"
    marker = {
        "draft_export": "-draft",
        "final_export": "-final",
        "preview": "-preview",
    }[purpose]
    return f"{stem}{marker}{suffix}"


def convert_to_pdf(
    docx: bytes, settings: Settings, still_wanted: Callable[[], None] | None = None
) -> bytes:
    """Convert under the DEC-003 concurrency cap and timeout.

    A configured render service is authoritative: there is no fallback to the host's
    LibreOffice, whose fonts and version could produce a different layout.
    """
    if not _conversion_slots.acquire(timeout=settings.render_timeout_seconds):
        raise RenderError("The PDF renderer is busy. Please try again.")
    try:
        if still_wanted is not None:
            still_wanted()  # the queue wait may have outlived the requested version
        render = _run_render_service if settings.render_service_url else _run_libreoffice
        return render(docx, settings)
    finally:
        _conversion_slots.release()


def _run_render_service(docx: bytes, settings: Settings) -> bytes:
    url = f"{settings.render_service_url.rstrip('/')}/forms/libreoffice/convert"
    try:
        # trust_env=False keeps document bytes away from any ambient HTTP proxy.
        with httpx.Client(timeout=settings.render_timeout_seconds, trust_env=False) as client:
            response = client.post(url, files={"files": ("document.docx", docx, DOCX_MEDIA_TYPE)})
    except (httpx.HTTPError, httpx.InvalidURL) as exc:
        raise RenderError("The PDF render service is unavailable. Please try again.") from exc
    if response.status_code != 200:
        raise RenderError(f"The PDF render service failed with status {response.status_code}")
    if not response.content.startswith(b"%PDF"):
        raise RenderError("The PDF render service did not produce a valid PDF artifact")
    return response.content


def _run_libreoffice(docx: bytes, settings: Settings) -> bytes:
    work_root = Path(settings.render_work_dir)
    work_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="docfill-render-", dir=work_root) as temporary:
        root = Path(temporary)
        source = root / "document.docx"
        output = root / "output"
        profile = root / "profile"
        home = root / "home"
        cache = root / "cache"
        config = root / "config"
        output.mkdir()
        home.mkdir()
        cache.mkdir()
        config.mkdir()
        source.write_bytes(docx)
        environment = {
            **os.environ,
            "HOME": str(home),
            "XDG_CACHE_HOME": str(cache),
            "XDG_CONFIG_HOME": str(config),
        }
        command = [
            settings.libreoffice_binary,
            f"-env:UserInstallation={profile.as_uri()}",
            "--headless",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            str(output),
            str(source),
        ]
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=settings.render_timeout_seconds,
            env=environment,
        )
        pdf = output / "document.pdf"
        if completed.returncode != 0 or not pdf.is_file():
            detail = (completed.stderr or completed.stdout).strip()[-1000:]
            raise RenderError(f"LibreOffice PDF rendering failed: {detail or 'no output artifact'}")
        content = pdf.read_bytes()
        if not content.startswith(b"%PDF"):
            raise RenderError("LibreOffice did not produce a valid PDF artifact")
        return content


def mark_as_draft(docx: bytes) -> bytes:
    try:
        with ZipFile(BytesIO(docx)) as archive:
            parts = {name: archive.read(name) for name in archive.namelist()}
        root = etree.fromstring(parts["word/document.xml"], SAFE_XML_PARSER)
        body = root.find("w:body", NS)
        if body is None:
            raise RenderError("DOCX has no document body")
        paragraph = etree.Element(f"{{{W}}}p")
        run = etree.SubElement(paragraph, f"{{{W}}}r")
        properties = etree.SubElement(run, f"{{{W}}}rPr")
        etree.SubElement(properties, f"{{{W}}}b")
        color = etree.SubElement(properties, f"{{{W}}}color")
        color.set(f"{{{W}}}val", "C00000")
        text = etree.SubElement(run, f"{{{W}}}t")
        text.text = "BẢN NHÁP"
        body.insert(0, paragraph)
        parts["word/document.xml"] = etree.tostring(
            root, xml_declaration=True, encoding="UTF-8", standalone=True
        )
        result = BytesIO()
        with ZipFile(result, "w", ZIP_DEFLATED) as archive:
            for name, payload in parts.items():
                archive.writestr(name, payload)
        return result.getvalue()
    except KeyError as exc:
        raise RenderError("DOCX is missing its document XML") from exc

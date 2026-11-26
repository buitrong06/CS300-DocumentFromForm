import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createDraft } from "../document-filling/api";
import { DraftFieldInput } from "../document-filling/components/DraftFieldInput";
import { BindingPicker } from "./components/BindingPicker";
import { FieldEditor } from "./components/FieldEditor";
import {
  addBinding,
  manualField,
  mergeFields,
  prepareForSave,
  removeBinding,
  TYPE_LABELS,
} from "./reviewEditing";
import { ApiError } from "../../shared/api/http";
import {
  createPresetTemplate,
  getTemplate,
  getTemplateSourcePreview,
  listAvailablePresets,
  publishTemplate,
  saveTemplateReview,
  testCheckTemplate,
  testFillTemplate,
  uploadTemplate,
} from "./api";
import type {
  ContentCheck,
  FieldCandidate,
  FormattingPresetOption,
  SourceLocation,
  TemplateDraft,
} from "./formGeneration";

const PA04_SUPPORTED_DOCUMENT_TYPE = "to_trinh";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Dữ liệu đã được thay đổi ở nơi khác. Hãy tải lại trước khi tiếp tục.";
  }
  return error instanceof Error ? error.message : "Không thể hoàn tất yêu cầu.";
}

function downloadBlob(blob: Blob, filename: string | null, fallback: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? fallback;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function candidateValues(candidates: FieldCandidate[]): Record<string, string> {
  return Object.fromEntries(
    candidates
      .filter((candidate) => candidate.status === "accepted")
      .map((candidate) => [candidate.id, candidate.default_value ?? ""]),
  );
}

export function TemplateImportPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<TemplateDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<{ templateId: number; html: string } | null>(null);
  const [presetOptions, setPresetOptions] = useState<FormattingPresetOption[]>([]);
  const [sourceMode, setSourceMode] = useState<"upload" | "preset">("upload");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState(false);
  const [contentCheck, setContentCheck] = useState<ContentCheck | null>(null);
  const [unsavedReview, setUnsavedReview] = useState(false);
  // Bumped after every server round-trip so FieldEditor re-reads normalized text.
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [draftTitle, setDraftTitle] = useState("");
  const [presetForm, setPresetForm] = useState({
    presetId: "",
    documentTypeKey: "",
    name: "",
    issuingOrg: "",
    governingOrg: "",
    signerTitle: "",
  });

  useEffect(() => {
    if (!templateId) return;
    let active = true;
    void getTemplate(Number(templateId))
      .then((loaded) => {
        if (!active) return;
        setTemplate(loaded);
        setSelectedId(loaded.review?.candidates[0]?.id ?? null);
        setTestValues(candidateValues(loaded.review?.candidates ?? []));
        setDraftTitle(`${loaded.name} – Bản nháp`);
      })
      .catch((error: unknown) => active && setMessage(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (sourceMode !== "preset") return;
    let active = true;
    void listAvailablePresets()
      .then((options) => {
        if (!active) return;
        const supported = options.filter((option) =>
          option.document_type_keys.includes(PA04_SUPPORTED_DOCUMENT_TYPE),
        );
        setPresetOptions(supported);
        setPresetForm((current) => ({
          ...current,
          presetId: current.presetId || String(supported[0]?.id ?? ""),
          documentTypeKey: PA04_SUPPORTED_DOCUMENT_TYPE,
        }));
        if (!supported.length) {
          setMessage("Chưa có FormattingPreset nào hỗ trợ loại văn bản to_trinh trong PA04.");
        }
      })
      .catch((error: unknown) => active && setMessage(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [sourceMode]);

  const previewTemplateId = template?.id;
  const reviewRevision = template?.review?.revision;

  useEffect(() => {
    if (!previewTemplateId) return;
    let active = true;
    void getTemplateSourcePreview(previewTemplateId)
      .then((html) => active && setSourcePreview({ templateId: previewTemplateId, html }))
      .catch((error: unknown) => active && setMessage(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [previewTemplateId, reviewRevision]);

  const review = template?.review ?? null;
  const previewHtml =
    sourcePreview && sourcePreview.templateId === template?.id ? sourcePreview.html : "";
  const selected = review?.candidates.find((candidate) => candidate.id === selectedId) ?? null;
  const acceptedCount = useMemo(
    () => review?.candidates.filter((candidate) => candidate.status === "accepted").length ?? 0,
    [review],
  );
  const unresolvedCount = useMemo(
    () => review?.candidates.filter((candidate) => candidate.status === "proposed").length ?? 0,
    [review],
  );
  function replaceTemplate(next: TemplateDraft): void {
    setTemplate(next);
    setSelectedId((current) =>
      next.review?.candidates.some((candidate) => candidate.id === current)
        ? current
        : (next.review?.candidates[0]?.id ?? null),
    );
    // Sample values survive a save; they stay in this tab only and are never persisted.
    setTestValues((current) => ({ ...candidateValues(next.review?.candidates ?? []), ...current }));
    setUnsavedReview(false);
    setEditorGeneration((value) => value + 1);
    setDraftTitle(`${next.name} – Bản nháp`);
  }

  async function upload(file: File): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const created = await uploadTemplate(file);
      // The route remounts per Template id and loads it there.
      navigate(`/templates/${created.id}`, { replace: true });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function createFromPreset(): Promise<void> {
    if (!presetForm.presetId || !presetForm.documentTypeKey || !presetForm.name.trim()) {
      setMessage("Chọn preset, loại văn bản và nhập tên Mẫu biểu.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const created = await createPresetTemplate({
        preset_id: Number(presetForm.presetId),
        document_type_key: presetForm.documentTypeKey,
        name: presetForm.name.trim(),
        org_constants: {
          issuing_org: presetForm.issuingOrg,
          governing_org: presetForm.governingOrg,
          signer_title: presetForm.signerTitle,
        },
      });
      // The route remounts per Template id and loads it there.
      navigate(`/templates/${created.id}`, { replace: true });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function setCandidates(candidates: FieldCandidate[]): void {
    if (!template || !review) return;
    setTemplate({ ...template, review: { ...review, candidates } });
    setUnsavedReview(true);
    setTestMode(false);
    setContentCheck(null);
  }

  function updateCandidate(change: Partial<FieldCandidate>): void {
    if (!review || !selected) return;
    setCandidates(
      review.candidates.map((candidate) =>
        candidate.id === selected.id ? { ...candidate, ...change } : candidate,
      ),
    );
  }

  function createManualField(label: string, binding: SourceLocation): void {
    if (!review) return;
    const created = manualField(`manual-${crypto.randomUUID()}`, label, binding);
    setCandidates([...review.candidates, created]);
    setSelectedId(created.id);
  }

  function deleteSelected(): void {
    if (!review || !selected) return;
    setCandidates(review.candidates.filter((candidate) => candidate.id !== selected.id));
    setSelectedId(null);
  }

  async function saveReview(): Promise<TemplateDraft | null> {
    if (!template || !review) return null;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await saveTemplateReview(
        template.id,
        review.revision,
        prepareForSave(review.candidates),
      );
      replaceTemplate(saved);
      setMessage("Đã lưu cấu hình Field.");
      return saved;
    } catch (error) {
      setMessage(errorMessage(error));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openTestMode(): Promise<void> {
    if (unsavedReview && !(await saveReview())) return;
    setTestMode(true);
  }

  function testSamples(fields: TemplateDraft["fields"]): Record<string, string> {
    return Object.fromEntries(
      fields.map((field) => [field.field_key, testValues[field.field_key] ?? ""]),
    );
  }

  async function runContentCheck(): Promise<void> {
    if (!template) return;
    setBusy(true);
    setMessage(null);
    try {
      setContentCheck(await testCheckTemplate(template.id, testSamples(template.fields)));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function downloadTestFill(): Promise<void> {
    if (!template) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await testFillTemplate(template.id, testSamples(template.fields));
      downloadBlob(result.blob, result.filename, "test-fill.docx");
      setMessage("Đã tải bản test-fill. Dữ liệu thử không được lưu thành Bản nháp.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function publish(): Promise<void> {
    if (!template || !review) return;
    if (
      !contentCheck &&
      !window.confirm(
        "Bạn chưa chạy kiểm tra nội dung trong chế độ test. Mẫu biểu đã xuất bản không thể sửa. Vẫn xuất bản?",
      )
    ) {
      return;
    }
    const saved = unsavedReview ? await saveReview() : template;
    if (!saved) return;
    setBusy(true);
    try {
      const published = await publishTemplate(saved.id);
      replaceTemplate(published);
      setTestMode(false);
      setTestValues({});
      setContentCheck(null);
      setMessage("Mẫu biểu đã được xuất bản và không thể sửa trực tiếp.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function openDraft(): Promise<void> {
    if (!template || template.status !== "published" || !draftTitle.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const editor = await createDraft(template.id, draftTitle.trim());
      navigate(`/drafts/${editor.draft.id}`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <main className="pa04-shell">
        <section className="pa04-hero">
          <p className="pa04-eyebrow">UC-A02 · UC-A03 · UC-A05</p>
          <h1>Tạo Mẫu biểu</h1>
          <p>
            Tạo một DocumentTemplate từ DOCX giữ nguyên định dạng, hoặc từ FormattingPreset được hỗ
            trợ. Sau đó review Field, test-fill và xuất bản vào thư viện.
          </p>
          <div className="pa04-tabs" role="tablist" aria-label="Nguồn Mẫu biểu">
            <button
              className={sourceMode === "upload" ? "active" : ""}
              onClick={() => setSourceMode("upload")}
              role="tab"
              aria-selected={sourceMode === "upload"}
            >
              Tải DOCX
            </button>
            <button
              className={sourceMode === "preset" ? "active" : ""}
              onClick={() => setSourceMode("preset")}
              role="tab"
              aria-selected={sourceMode === "preset"}
            >
              Tạo từ Preset
            </button>
          </div>
          {sourceMode === "upload" ? (
            <div className="pa04-card pa04-create-card">
              <h2>DOCX nguồn</h2>
              <p>Hệ thống nhận diện marker, comment, dòng chấm, gạch dưới và ô bảng trống.</p>
              <button disabled={busy} onClick={() => fileInput.current?.click()} className="pa04-primary">
                {busy ? "Đang phân tích…" : "Chọn tệp DOCX"}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".docx"
                aria-label="Chọn tệp DOCX"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
          ) : (
            <form
              className="pa04-card pa04-create-card pa04-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void createFromPreset();
              }}
            >
              <label>
                FormattingPreset
                <select
                  required
                  value={presetForm.presetId}
                  onChange={(event) => {
                    setPresetForm((current) => ({
                      ...current,
                      presetId: event.target.value,
                      documentTypeKey: PA04_SUPPORTED_DOCUMENT_TYPE,
                    }));
                  }}
                >
                  <option value="">Chọn Preset</option>
                  {presetOptions.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} · v{preset.version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Loại văn bản được hỗ trợ trong PA04
                <input readOnly value={PA04_SUPPORTED_DOCUMENT_TYPE} aria-label="Loại văn bản" />
              </label>
              <label>
                Tên Mẫu biểu
                <input
                  required
                  value={presetForm.name}
                  onChange={(event) => setPresetForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Cơ quan chủ quản
                <input
                  value={presetForm.governingOrg}
                  onChange={(event) =>
                    setPresetForm((current) => ({ ...current, governingOrg: event.target.value }))
                  }
                />
              </label>
              <label>
                Cơ quan ban hành
                <input
                  value={presetForm.issuingOrg}
                  onChange={(event) =>
                    setPresetForm((current) => ({ ...current, issuingOrg: event.target.value }))
                  }
                />
              </label>
              <label>
                Chức danh người ký
                <input
                  value={presetForm.signerTitle}
                  onChange={(event) =>
                    setPresetForm((current) => ({ ...current, signerTitle: event.target.value }))
                  }
                />
              </label>
              <button disabled={busy} className="pa04-primary" type="submit">
                {busy ? "Đang tạo…" : "Tạo bản nháp Mẫu biểu"}
              </button>
            </form>
          )}
          {message && (
            <p className="pa04-message" role="status">
              {message}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="pa04-shell">
      <header className="pa04-page-header">
        <div>
          <p className="pa04-eyebrow">UC-A03 · Cấu hình Field</p>
          <h1>{template.name}</h1>
          <p>
            {template.status === "published" ? "Đã xuất bản" : "Bản nháp"} · {acceptedCount} Field được
            chấp nhận · {unresolvedCount} Field chưa review
          </p>
        </div>
        <div className="pa04-actions">
          {template.status === "draft" && (
            <>
              <button disabled={busy} className="pa04-secondary" onClick={() => void saveReview()}>
                Lưu cấu hình
              </button>
              <button disabled={busy} className="pa04-secondary" onClick={() => void openTestMode()}>
                Chế độ test
              </button>
              <button
                disabled={busy || unresolvedCount > 0}
                className="pa04-primary"
                onClick={() => void publish()}
              >
                Xuất bản Mẫu biểu
              </button>
            </>
          )}
          {template.status === "published" && (
            <>
              <input
                aria-label="Tên Bản nháp"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
              <button disabled={busy || !draftTitle.trim()} className="pa04-primary" onClick={() => void openDraft()}>
                Tạo Bản nháp
              </button>
            </>
          )}
        </div>
      </header>
      {message && (
        <p className="pa04-message" role="status">
          {message}
        </p>
      )}
      <div className="pa04-authoring-grid">
        <section className="pa04-card pa04-field-list" aria-label="Danh sách Field phát hiện">
          <h2>Field phát hiện</h2>
          {review?.candidates.map((candidate) => (
            <button
              key={candidate.id}
              className={candidate.id === selectedId ? "pa04-field-row active" : "pa04-field-row"}
              onClick={() => setSelectedId(candidate.id)}
            >
              <strong>{candidate.label}</strong>
              <span>{TYPE_LABELS[candidate.type]}</span>
              <span className={`pa04-status ${candidate.status}`}>{candidate.status}</span>
            </button>
          ))}
        </section>
        <section className="pa04-card pa04-source-preview">
          <h2>DOCX nguồn</h2>
          <p className="pa04-help">Nội dung cố định giữ nguyên; vùng xanh là Binding có thể điền.</p>
          {previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="pa04-help">Đang tải bản xem trước…</p>
          )}
        </section>
        <section className="pa04-card pa04-field-editor">
          <h2>Thiết lập Field</h2>
          {selected && review ? (
            <FieldEditor
              key={`${selected.id}:${selected.occurrences.length}:${editorGeneration}`}
              field={selected}
              blocks={review.blocks}
              otherFields={review.candidates.filter((candidate) => candidate.id !== selected.id)}
              disabled={template.status !== "draft"}
              onChange={updateCandidate}
              onRemoveBinding={(index) =>
                setCandidates(removeBinding(review.candidates, selected.id, index))
              }
              onMergeInto={(targetId) => {
                setCandidates(mergeFields(review.candidates, review.blocks, selected.id, targetId));
                setSelectedId(targetId);
              }}
              onDelete={deleteSelected}
            />
          ) : (
            <p className="pa04-help">Chọn một Field để review.</p>
          )}
          {template.status === "draft" && review && (
            <BindingPicker
              blocks={review.blocks}
              selectedLabel={selected?.label ?? null}
              onCreate={createManualField}
              onAttach={(binding) =>
                selected && setCandidates(addBinding(review.candidates, selected.id, binding))
              }
            />
          )}
        </section>
      </div>
      {template.status === "draft" && testMode && (
        <section className="pa04-card pa04-test-fill">
          <h2>Chế độ test (UC-A05)</h2>
          <p>
            Cùng kiểu ô nhập như người điền. Giá trị thử chỉ nằm trong trang này, không tạo
            DocumentDraft.
          </p>
          <div className="pa04-draft-fields">
            {template.fields.map((field) => (
              <DraftFieldInput
                key={field.id}
                field={field}
                value={testValues[field.field_key] ?? ""}
                findings={
                  contentCheck?.findings.filter((finding) => finding.field_key === field.field_key) ?? []
                }
                onChange={(value) => {
                  setTestValues((values) => ({ ...values, [field.field_key]: value }));
                  setContentCheck(null);
                }}
              />
            ))}
          </div>
          {contentCheck && (
            <p className="pa04-message" role="status">
              {contentCheck.gate.final_export_allowed
                ? "Qua kiểm tra bắt buộc, kiểu dữ liệu và quy tắc tự động."
                : `Có ${contentCheck.gate.blocking_codes.length} lỗi cần xem lại.`}{" "}
              Chưa có kiểm tra ngữ nghĩa.
            </p>
          )}
          <div className="pa04-actions">
            <button disabled={busy} className="pa04-primary" onClick={() => void runContentCheck()}>
              Kiểm tra nội dung
            </button>
            <button disabled={busy} className="pa04-secondary" onClick={() => void downloadTestFill()}>
              Tải DOCX test-fill
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

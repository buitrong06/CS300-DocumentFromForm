import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { apiUrl, ApiError } from "../../shared/api/http";
import { exportDraft, getDraft, requestPreview, saveDraft } from "./api";
import { DraftFieldInput } from "./components/DraftFieldInput";
import {
  canExportPersistedDraft,
  hasUnsavedDraftEdits,
  isRealEdit,
  isRetryableSaveStatus,
  saveRetryDelayMs,
  type DraftSaveState,
} from "./state";
import type { DraftEditor, RenderSnapshot } from "./types";

type SaveState = DraftSaveState;

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

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Bản nháp đã được thay đổi ở nơi khác. Các chỉnh sửa cục bộ vẫn được giữ lại.";
  }
  return error instanceof Error ? error.message : "Không thể hoàn tất yêu cầu.";
}

function saveLabel(state: SaveState): string {
  switch (state) {
    case "loading":
      return "Đang tải Bản nháp…";
    case "saved":
      return "Đã tự động lưu";
    case "unsaved":
      return "Có chỉnh sửa chưa lưu";
    case "saving":
      return "Đang tự động lưu…";
    case "error":
      return "Lưu thất bại — chỉnh sửa cục bộ vẫn còn";
    case "conflict":
      return "Xung đột phiên bản — cần xác nhận trước khi lưu lại";
  }
}

export function DraftEditorPage() {
  const { draftId } = useParams();
  const [editor, setEditor] = useState<DraftEditor | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<RenderSnapshot | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const editorRef = useRef<DraftEditor | null>(null);
  const valuesRef = useRef<Record<string, string>>({});
  const saveInFlight = useRef(false);
  const dirtyRef = useRef(false);
  const failedSaves = useRef(0);
  const [retryDelay, setRetryDelay] = useState<number | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [previewSettled, setPreviewSettled] = useState(0);
  const previewInFlight = useRef(false);
  const requestedPreview = useRef("");

  const assignEditor = useCallback((next: DraftEditor) => {
    editorRef.current = next;
    setEditor(next);
  }, []);

  const assignValues = useCallback((next: Record<string, string>) => {
    valuesRef.current = next;
    setValues(next);
  }, []);

  const loadDraft = useCallback(
    async (preserveLocalEdits = false): Promise<void> => {
      if (!draftId || !Number.isInteger(Number(draftId))) {
        setMessage("Mã Bản nháp không hợp lệ.");
        return;
      }
      if (!preserveLocalEdits) setSaveState("loading");
      try {
        const loaded = await getDraft(Number(draftId));
        assignEditor(loaded);
        if (!preserveLocalEdits) {
          dirtyRef.current = false;
          assignValues(loaded.draft.field_values);
          setSaveState("saved");
          setMessage(null);
        } else {
          dirtyRef.current = true;
          setSaveState("conflict");
          setMessage("Đã tải phiên bản mới. Chỉnh sửa cục bộ chưa bị ghi đè; hãy xem lại rồi lưu có chủ ý.");
        }
      } catch (error) {
        setSaveState("error");
        setMessage(errorMessage(error));
      }
    },
    [assignEditor, assignValues, draftId],
  );

  const saveCurrent = useCallback(async (): Promise<void> => {
    const current = editorRef.current;
    if (!current || saveInFlight.current || !dirtyRef.current) return;
    const snapshot = { ...valuesRef.current };
    saveInFlight.current = true;
    setRetryDelay(null);
    setSaveState("saving");
    try {
      const saved = await saveDraft(current.draft.id, {
        expected_version: current.draft.version,
        field_values: snapshot,
      });
      assignEditor(saved);
      failedSaves.current = 0;
      if (!hasUnsavedDraftEdits(valuesRef.current, snapshot)) {
        dirtyRef.current = false;
        assignValues(saved.draft.field_values);
        setSaveState("saved");
      } else {
        dirtyRef.current = true;
        setSaveState("unsaved");
      }
      setMessage(null);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null;
      if (status !== 409 && isRetryableSaveStatus(status)) {
        failedSaves.current += 1;
        setRetryDelay(saveRetryDelayMs(failedSaves.current));
      }
      setSaveState(status === 409 ? "conflict" : "error");
      setMessage(errorMessage(error));
    } finally {
      saveInFlight.current = false;
    }
  }, [assignEditor, assignValues]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDraft(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDraft]);

  useEffect(() => {
    if (!editor || !dirtyRef.current || saveState === "error" || saveState === "conflict") return;
    const timer = window.setTimeout(() => void saveCurrent(), 750);
    return () => window.clearTimeout(timer);
  }, [editor, saveCurrent, saveState, values]);

  // UC-A06 A3: keep local edits and retry transient autosave failures with backoff.
  useEffect(() => {
    if (saveState !== "error" || retryDelay === null) return;
    const timer = window.setTimeout(() => void saveCurrent(), retryDelay);
    return () => window.clearTimeout(timer);
  }, [retryDelay, saveCurrent, saveState]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  const previewDraftId = editor?.draft.id;
  const previewVersion = editor?.draft.version;
  const canPreview = editor !== null;

  // One preview at a time: versions saved while one renders collapse into the latest one.
  useEffect(() => {
    if (!previewDraftId || !previewVersion || !canPreview) return;
    const timer = window.setTimeout(() => {
      const key = `${previewDraftId}:${previewVersion}:${previewAttempt}`;
      if (previewInFlight.current || requestedPreview.current === key) return;
      previewInFlight.current = true;
      requestedPreview.current = key;
      setPreviewError(null);
      void requestPreview(previewDraftId, previewVersion)
        .then(setPreview)
        .catch((error: unknown) => {
          if (editorRef.current?.draft.version === previewVersion) {
            setPreviewError(errorMessage(error));
          }
        })
        .finally(() => {
          previewInFlight.current = false;
          setPreviewSettled((count) => count + 1);
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canPreview, previewAttempt, previewDraftId, previewSettled, previewVersion]);

  function updateValue(fieldKey: string, value: string): void {
    if (!isRealEdit(valuesRef.current, fieldKey, value)) return;
    dirtyRef.current = true;
    assignValues({ ...valuesRef.current, [fieldKey]: value });
    setSaveState("unsaved");
  }

  async function downloadExport(format: "docx" | "pdf", purpose: "draft_export" | "final_export"): Promise<void> {
    if (!editor) return;
    setExporting(`${purpose}:${format}`);
    setMessage(null);
    try {
      const result = await exportDraft(editor.draft.id, {
        expected_version: editor.draft.version,
        format,
        purpose,
      });
      downloadBlob(result.blob, result.filename, `${editor.template_name}.${format}`);
      setMessage(`Đã tạo ${purpose === "draft_export" ? "bản nháp" : "bản cuối"} ${format.toUpperCase()}.`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setExporting(null);
    }
  }

  if (!editor) {
    return (
      <main className="pa04-shell">
        <section className="pa04-hero">
          <p className="pa04-eyebrow">UC-A06 · Điền biểu mẫu</p>
          <h1>Đang tải Bản nháp…</h1>
          {message && <p className="pa04-message">{message}</p>}
        </section>
      </main>
    );
  }

  const activePreview =
    canPreview && preview?.source_draft_version === editor.draft.version ? preview : null;
  const displayedPreviewError = previewError;
  const failedFindings = editor.validation.findings.filter((finding) => finding.status === "failed");
  const exportAllowed = canExportPersistedDraft(saveState, values, editor.draft.field_values);

  return (
    <main className="pa04-shell">
      <header className="pa04-page-header">
        <div>
          <p className="pa04-eyebrow">UC-A06 · Điền biểu mẫu</p>
          <h1>{editor.draft.title}</h1>
          <p>
            {editor.template_name} · Bản nháp v{editor.draft.version} · {editor.required_complete}/
            {editor.required_total} Field bắt buộc đã hoàn tất
          </p>
        </div>
        <div className="pa04-actions">
          <span className={`pa04-save-state ${saveState}`}>{saveLabel(saveState)}</span>
          <button className="pa04-secondary" onClick={() => void saveCurrent()} disabled={saveState === "saving"}>
            Lưu ngay
          </button>
        </div>
      </header>

      {message && (
        <section className="pa04-message pa04-message-action" role="status">
          <span>
            {message}
            {saveState === "error" && retryDelay !== null && ` Sẽ tự thử lại sau ${retryDelay / 1000} giây.`}
          </span>
          {saveState === "error" && <button onClick={() => void saveCurrent()}>Thử lưu lại</button>}
          {saveState === "conflict" && (
            <>
              <button onClick={() => void loadDraft(true)}>Tải phiên bản mới</button>
              <button onClick={() => void saveCurrent()}>Lưu thay đổi của tôi</button>
            </>
          )}
        </section>
      )}

      <div className={previewExpanded ? "pa04-draft-grid" : "pa04-draft-grid collapsed"}>
        <section className="pa04-card pa04-draft-form">
          <div className="pa04-panel-heading">
            <div>
              <h2>Biểu mẫu</h2>
              <p>Hướng dẫn và trạng thái kiểm tra được hiển thị theo từng Field.</p>
            </div>
            <span className="pa04-progress">{editor.required_complete}/{editor.required_total}</span>
          </div>
          <div className="pa04-draft-fields">
            {editor.fields.map((field) => (
              <DraftFieldInput
                key={field.id}
                field={field}
                value={values[field.field_key] ?? ""}
                findings={editor.validation.findings.filter((finding) => finding.field_key === field.field_key)}
                onChange={(value) => updateValue(field.field_key, value)}
              />
            ))}
          </div>
        </section>

        <section className="pa04-card pa04-preview-panel">
          <div className="pa04-panel-heading">
            <div>
              <h2>PDF preview</h2>
              <p>RenderSnapshot authoritative cho phiên bản Bản nháp hiện tại.</p>
            </div>
            <button className="pa04-secondary" onClick={() => setPreviewExpanded((expanded) => !expanded)}>
              {previewExpanded ? "Thu gọn" : "Mở preview"}
            </button>
          </div>
          {previewExpanded && (
            <>
              {activePreview ? (
                <iframe
                  className="pa04-pdf-frame"
                  title={`PDF preview ${activePreview.filename}`}
                  src={apiUrl(activePreview.content_url)}
                />
              ) : (
                <>
                  <p className="pa04-help">{displayedPreviewError ?? "Đang tạo PDF preview…"}</p>
                  {displayedPreviewError && (
                    <button
                      className="pa04-secondary"
                      onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
                    >
                      Thử tạo lại preview
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>

      <section className="pa04-card pa04-export-panel">
        <div>
          <p className="pa04-eyebrow">UC-A09 · Xuất văn bản</p>
          <h2>Kiểm tra và xuất</h2>
          <p>
            Final export chỉ bị chặn bởi Field bắt buộc và quy tắc tự động. Cảnh báo ngữ nghĩa không chặn
            xuất file.
          </p>
        </div>
        {failedFindings.length > 0 && (
          <ul className="pa04-findings" aria-label="Lỗi cần xử lý trước khi xuất bản cuối">
            {failedFindings.map((finding) => (
              <li key={finding.code}>{finding.message}</li>
            ))}
          </ul>
        )}
        <div className="pa04-export-actions">
          <button
            className="pa04-secondary"
            disabled={exporting !== null || !exportAllowed}
            onClick={() => void downloadExport("docx", "draft_export")}
          >
            {exporting === "draft_export:docx" ? "Đang tạo…" : "Tải DOCX bản nháp"}
          </button>
          <button
            className="pa04-secondary"
            disabled={exporting !== null || !exportAllowed}
            onClick={() => void downloadExport("pdf", "draft_export")}
          >
            {exporting === "draft_export:pdf" ? "Đang tạo…" : "Tải PDF bản nháp"}
          </button>
          <button
            className="pa04-primary"
            disabled={
              exporting !== null || !exportAllowed || !editor.validation.gate.final_export_allowed
            }
            onClick={() => void downloadExport("docx", "final_export")}
          >
            {exporting === "final_export:docx" ? "Đang tạo…" : "Tải DOCX bản cuối"}
          </button>
          <button
            className="pa04-primary"
            disabled={
              exporting !== null || !exportAllowed || !editor.validation.gate.final_export_allowed
            }
            onClick={() => void downloadExport("pdf", "final_export")}
          >
            {exporting === "final_export:pdf" ? "Đang tạo…" : "Tải PDF bản cuối"}
          </button>
        </div>
      </section>
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listDrafts } from "../document-filling/api";
import type { DraftSummary } from "../document-filling/types";
import { listTemplates } from "../template-authoring/api";
import type { TemplateSummary } from "../template-authoring/formGeneration";

const STATUS_LABELS: Record<TemplateSummary["status"], string> = {
  draft: "Đang cấu hình",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

/** Template library (UC-A05) and the way back into a saved Draft (UC-A06 step 5). */
export function LibraryPage() {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listTemplates(), listDrafts()])
      .then(([loadedTemplates, loadedDrafts]) => {
        if (!active) return;
        setTemplates(loadedTemplates);
        setDrafts(loadedDrafts);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải thư viện.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="pa04-shell">
      <header className="pa04-page-header">
        <div>
          <p className="pa04-eyebrow">UC-A05 · UC-A06</p>
          <h1>Thư viện</h1>
          <p>Mở lại Mẫu biểu hoặc tiếp tục điền một Bản nháp cá nhân.</p>
        </div>
      </header>
      {error && (
        <p className="pa04-message" role="alert">
          {error}
        </p>
      )}
      <div className="pa04-library-grid">
        <section className="pa04-card pa04-library-panel">
          <h2>Mẫu biểu</h2>
          {!templates && !error && <p className="pa04-help">Đang tải…</p>}
          {templates?.length === 0 && <p className="pa04-help">Chưa có Mẫu biểu nào.</p>}
          <ul>
            {templates?.map((template) => (
              <li key={template.id}>
                <Link to={`/templates/${template.id}`}>{template.name}</Link>
                <span>
                  {STATUS_LABELS[template.status]} · v{template.version}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="pa04-card pa04-library-panel">
          <h2>Bản nháp cá nhân</h2>
          {!drafts && !error && <p className="pa04-help">Đang tải…</p>}
          {drafts?.length === 0 && (
            <p className="pa04-help">Chưa có Bản nháp. Hãy mở một Mẫu biểu đã xuất bản để tạo.</p>
          )}
          <ul>
            {drafts?.map((draft) => (
              <li key={draft.id}>
                <Link to={`/drafts/${draft.id}`}>{draft.title}</Link>
                <span>
                  {draft.template_name} · v{draft.version} ·{" "}
                  {new Date(draft.updated_at).toLocaleString("vi-VN")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

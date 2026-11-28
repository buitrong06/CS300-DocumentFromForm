import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useMatch, useParams } from "react-router-dom";

import { DevelopmentNavigation } from "./layouts/DevelopmentNavigation";

const TemplateImportPage = lazy(async () => {
  const module = await import("../features/template-authoring/TemplateImportPage");
  return { default: module.TemplateImportPage };
});

const DraftEditorPage = lazy(async () => {
  const module = await import("../features/document-filling/DraftEditorPage");
  return { default: module.DraftEditorPage };
});

const LibraryPage = lazy(async () => {
  const module = await import("../features/library/LibraryPage");
  return { default: module.LibraryPage };
});

/** Remount per resource so no page state leaks between two Templates or two Drafts. */
function TemplateRoute() {
  const { templateId } = useParams();
  return <TemplateImportPage key={templateId ?? "new"} />;
}

function DraftRoute() {
  const { draftId } = useParams();
  return <DraftEditorPage key={draftId} />;
}

const PrototypeApp = lazy(async () => {
  const module = await import("../prototype/PrototypeApp");
  return { default: module.PrototypeApp };
});

// New Figma-based sidebar implementation — does not override existing routes
const FigmaApp = lazy(async () => {
  const module = await import("../figma-app/FigmaApp");
  return { default: module.FigmaApp };
});

export function AppRoutes() {
  const isPrototype = useMatch("/prototype");
  const isFigmaApp = useMatch("/app/*");

  return (
    <>
      {!isPrototype && !isFigmaApp && <DevelopmentNavigation />}
      <Suspense fallback={<p className="route-loading">Đang tải…</p>}>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/templates/new" element={<TemplateRoute />} />
          <Route path="/templates/import" element={<TemplateRoute />} />
          <Route path="/templates/:templateId" element={<TemplateRoute />} />
          <Route path="/drafts/:draftId" element={<DraftRoute />} />
          <Route path="/prototype" element={<PrototypeApp />} />
          <Route path="/app/*" element={<FigmaApp />} />
          <Route path="*" element={<Navigate to="/templates/new" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

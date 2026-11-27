import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useMatch } from "react-router-dom";

import { DevelopmentNavigation } from "./layouts/DevelopmentNavigation";

const TemplateImportPage = lazy(async () => {
  const module = await import("../features/template-authoring/TemplateImportPage");
  return { default: module.TemplateImportPage };
});

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
          <Route path="/templates/import" element={<TemplateImportPage />} />
          <Route path="/prototype" element={<PrototypeApp />} />
          <Route path="/app/*" element={<FigmaApp />} />
          <Route path="*" element={<Navigate to="/templates/import" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

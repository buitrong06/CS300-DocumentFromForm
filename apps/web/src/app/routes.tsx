import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { DevelopmentNavigation } from "./layouts/DevelopmentNavigation";

const TemplateImportPage = lazy(async () => {
  const module = await import("../features/template-authoring/TemplateImportPage");
  return { default: module.TemplateImportPage };
});

const PrototypeApp = lazy(async () => {
  const module = await import("../prototype/PrototypeApp");
  return { default: module.PrototypeApp };
});

export function AppRoutes() {
  return (
    <>
      <DevelopmentNavigation />
      <Suspense fallback={<p className="route-loading">Đang tải…</p>}>
        <Routes>
          <Route path="/templates/import" element={<TemplateImportPage />} />
          <Route path="/prototype" element={<PrototypeApp />} />
          <Route path="*" element={<Navigate to="/templates/import" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";

const TemplateBuilderPage = lazy(async () => {
  const module = await import("../features/template-builder/TemplateBuilderPage");
  return { default: module.TemplateBuilderPage };
});

const PrototypeApp = lazy(async () => {
  const module = await import("../prototype/PrototypeApp");
  return { default: module.PrototypeApp };
});

export function AppRoutes() {
  return (
    <>
      <nav className="workspace-switcher" aria-label="Không gian phát triển">
        <NavLink to="/templates/import">Trích xuất trường</NavLink>
        <NavLink to="/prototype">Prototype PA02</NavLink>
      </nav>
      <Suspense fallback={<p className="route-loading">Đang tải…</p>}>
        <Routes>
          <Route path="/templates/import" element={<TemplateBuilderPage />} />
          <Route path="/prototype" element={<PrototypeApp />} />
          <Route path="*" element={<Navigate to="/templates/import" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

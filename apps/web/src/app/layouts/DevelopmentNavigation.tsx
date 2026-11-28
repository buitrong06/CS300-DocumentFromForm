import { NavLink } from "react-router-dom";

/** Navigation keeps the live PA04 flow separate from the mock PA02 reference UI. */
export function DevelopmentNavigation() {
  return (
    <nav className="workspace-switcher" aria-label="Không gian phát triển">
      <NavLink to="/templates/new">Tạo Mẫu biểu</NavLink>
      <NavLink to="/library">Thư viện</NavLink>
      <NavLink to="/prototype">Prototype PA02 (mock)</NavLink>
      <NavLink to="/app">Figma App (mới)</NavLink>
    </nav>
  );
}

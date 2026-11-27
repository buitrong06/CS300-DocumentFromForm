import { NavLink } from "react-router-dom";

/** Temporary navigation between the integrated extraction slice and PA02 reference UI. */
export function DevelopmentNavigation() {
  return (
    <nav className="workspace-switcher" aria-label="Không gian phát triển">
      <NavLink to="/templates/import">Trích xuất trường</NavLink>
      <NavLink to="/prototype">Prototype PA02</NavLink>
      <NavLink to="/app">Figma App (mới)</NavLink>
    </nav>
  );
}

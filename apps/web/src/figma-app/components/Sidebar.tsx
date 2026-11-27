import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_NAV_ITEMS } from '../navigation';

export function Sidebar() {
  const { pathname } = useLocation();

  const isActive = (prefixes: string[], id: string) => {
    if (id === 'overview' && (pathname === '/app' || pathname === '/app/')) return true;
    return prefixes.some((p) => pathname.startsWith(p));
  };

  return (
    <aside className="fapp-sidebar">
      <div className="fapp-brand">
        <div className="fapp-brand-name">EXTRACT FIELD</div>
        <div className="fapp-brand-sub">Không gian tài liệu</div>
      </div>

      <nav className="fapp-nav-section" aria-label="Điều hướng chính">
        {SIDEBAR_NAV_ITEMS.map(({ id, label, icon, path, matchPrefixes }) => (
          <Link
            key={id}
            to={path}
            className={`fapp-nav-item${isActive(matchPrefixes, id) ? ' active' : ''}`}
            aria-current={isActive(matchPrefixes, id) ? 'page' : undefined}
          >
            <span className="fapp-nav-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <Link to="/app/workspace" className="fapp-workspace" aria-label="Chọn workspace">
        <div className="fapp-workspace-name">CS300 · Team space</div>
        <div className="fapp-workspace-note">4 thành viên online</div>
      </Link>
    </aside>
  );
}

import React from 'react';
import type { PrototypeScreenId } from '../navigation';

interface SidebarProps {
  currentScreen: PrototypeScreenId;
  onSelectScreen: (s: PrototypeScreenId) => void;
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const MAIN_NAV = [
  { id: 'tasks',     label: 'Công việc',       icon: '📋', badge: '3', screen: 'screen2' as PrototypeScreenId },
  { id: 'my_docs',   label: 'Tài liệu của tôi',icon: '📁', badge: null, screen: 'screen2' as PrototypeScreenId },
  { id: 'templates', label: 'Thư viện mẫu',    icon: '📑', badge: null, screen: 'screen1' as PrototypeScreenId },
  { id: 'presets',   label: 'Preset định dạng', icon: '⚙️', badge: null, screen: 'screen2' as PrototypeScreenId },
];

const SCREENS: { id: PrototypeScreenId; num: string; name: string; uc: string }[] = [
  { id: 'screen1', num: '1', name: 'Cấu hình trường',              uc: 'UC-A03' },
  { id: 'screen2', num: '2', name: 'Điền form & Xem trước',         uc: 'UC-A06' },
  { id: 'screen3', num: '3', name: 'Kiểm tra & Gợi ý sửa',          uc: 'UC-A07/A08' },
  { id: 'screen4', num: '4', name: 'Giao việc từ form',             uc: 'UC-B03' },
  { id: 'screen5', num: '5', name: 'Duyệt bài nộp',                 uc: 'UC-B05' },
  { id: 'screen6', num: '6', name: 'Tổng hợp kết quả',              uc: 'UC-B06' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  activeNavTab,
  onSelectNavTab,
  isCollapsed,
  onToggle,
}) => {
  const collapsed = isCollapsed;

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand-row">
        <div className="sidebar-brand" onClick={() => onSelectScreen('screen2')}>
          <span className="sidebar-logo-mark">D</span>
          {!collapsed && <span className="sidebar-brand-name">Fill &amp; Deliver</span>}
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggle} title="Thu gọn / Mở rộng">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Workspace */}
      {!collapsed && (
        <div className="sidebar-workspace" title="Đổi không gian làm việc">
          <span className="ws-icon">🏛️</span>
          <div className="ws-text">
            <div className="ws-name">Chi đoàn 23CTT1</div>
            <div className="ws-sub">BCH Đoàn khoa CNTT</div>
          </div>
          <span className="ws-arrow">▾</span>
        </div>
      )}

      {/* Main navigation */}
      <div className="sidebar-section">
        {!collapsed && <div className="sidebar-section-label">Danh mục</div>}
        {MAIN_NAV.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item${activeNavTab === item.id ? ' active' : ''}`}
            onClick={() => { onSelectNavTab(item.id); onSelectScreen(item.screen); }}
            title={item.label}
          >
            <span className="nav-item-icon-wrap">{item.icon}</span>
            {!collapsed && <span className="nav-item-label">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* PA02 prototype screens */}
      <div className="sidebar-section">
        {!collapsed && <div className="sidebar-section-label">Màn hình PA02</div>}
        {SCREENS.map((s) => (
          <button
            key={s.id}
            className={`sidebar-screen-item${currentScreen === s.id ? ' active' : ''}`}
            onClick={() => onSelectScreen(s.id)}
            title={`${s.num}. ${s.name} (${s.uc})`}
          >
            <span className="screen-num">{s.num}</span>
            {!collapsed && (
              <span className="screen-item-text">
                <span className="screen-item-name">{s.name}</span>
                <span className="screen-item-uc">{s.uc}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active task shortcuts */}
      {!collapsed && (
        <div style={{ padding: '12px 0 4px' }}>
          <div className="sidebar-section-label">Công việc đang mở</div>
          <div className="sidebar-task-card">
            <div className="task-card-title">Tờ trình xin kinh phí NHTSV</div>
            <div className="task-card-meta">Hạn 05/11/2026 · Đang làm</div>

            <div
              className="subtask-link"
              onClick={() => onSelectScreen('screen2')}
              role="button" tabIndex={0}
            >
              <span className="dot dot-blue" />
              <span>Mở bản nháp của bạn</span>
            </div>
            <div
              className="subtask-link"
              onClick={() => onSelectScreen('screen5')}
              role="button" tabIndex={0}
            >
              <span className="dot dot-orange" />
              <span>#1 · Lê Văn Uy — Chờ duyệt</span>
            </div>
            <div
              className="subtask-link"
              onClick={() => onSelectScreen('screen6')}
              role="button" tabIndex={0}
            >
              <span className="dot dot-green" />
              <span>Tổng hợp kết quả</span>
            </div>
            <div
              className="subtask-link"
              onClick={() => onSelectScreen('screen4')}
              role="button" tabIndex={0}
            >
              <span className="dot dot-gray" />
              <span>+ Giao thêm trường…</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-avatar-sm">TK</div>
        {!collapsed && (
          <div>
            <div className="footer-user-name">Trần Minh Khoa</div>
            <div className="footer-user-role">Bí thư Chi đoàn</div>
          </div>
        )}
      </div>
    </aside>
  );
};

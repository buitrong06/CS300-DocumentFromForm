import React from 'react';
import type { PrototypeScreenId } from '../navigation';

interface HeaderProps {
  currentScreen: PrototypeScreenId;
  onSelectScreen: (screen: PrototypeScreenId) => void;
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onSelectScreen,
  activeNavTab,
  onSelectNavTab,
}) => {
  const screens: { id: PrototypeScreenId; label: string; uc: string }[] = [
    { id: 'screen1', label: 'Màn hình 1 · Cấu hình trường', uc: 'UC-A03' },
    { id: 'screen2', label: 'Màn hình 2 · Điền form & Xem trước', uc: 'UC-A06' },
    { id: 'screen3', label: 'Màn hình 3 · Kiểm tra nội dung & Gợi ý', uc: 'UC-A07, A08' },
    { id: 'screen4', label: 'Màn hình 4 · Giao việc từ form', uc: 'UC-B03' },
    { id: 'screen5', label: 'Màn hình 5 · Duyệt bài nộp', uc: 'UC-B05' },
    { id: 'screen6', label: 'Màn hình 6 · Tổng hợp kết quả', uc: 'UC-B06' },
  ];

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-wrapper">
          <div className="brand-logo" onClick={() => onSelectScreen('screen2')} role="button" tabIndex={0}>
            <span className="brand-logo-icon">D</span>
            Fill &amp; Deliver
          </div>

          <nav className="nav-tabs" aria-label="Main Navigation">
            <button
              className={`nav-tab-item ${activeNavTab === 'tasks' ? 'active' : ''}`}
              onClick={() => onSelectNavTab('tasks')}
            >
              Công việc
            </button>
            <button
              className={`nav-tab-item ${activeNavTab === 'my_docs' ? 'active' : ''}`}
              onClick={() => onSelectNavTab('my_docs')}
            >
              Tài liệu của tôi
            </button>
            <button
              className={`nav-tab-item ${activeNavTab === 'templates' ? 'active' : ''}`}
              onClick={() => {
                onSelectNavTab('templates');
                onSelectScreen('screen1');
              }}
            >
              Thư viện mẫu
            </button>
            <button
              className={`nav-tab-item ${activeNavTab === 'presets' ? 'active' : ''}`}
              onClick={() => onSelectNavTab('presets')}
            >
              Preset
            </button>
          </nav>
        </div>

        <div className="sub-header-right">
          <div className="user-avatar" title="Trần Minh Khoa (Chi đoàn 23CTT1)">
            {currentScreen === 'screen1' ? 'PH' : 'TK'}
          </div>
        </div>
      </div>

      <div className="screen-switcher-bar">
        <span className="screen-switcher-label">Prototype PA02:</span>
        {screens.map((screen) => (
          <button
            key={screen.id}
            className={`screen-pill ${currentScreen === screen.id ? 'active' : ''}`}
            onClick={() => onSelectScreen(screen.id)}
            title={screen.uc}
          >
            {screen.label}
          </button>
        ))}
      </div>
    </header>
  );
};

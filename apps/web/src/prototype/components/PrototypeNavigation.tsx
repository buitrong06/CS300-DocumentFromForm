import { useRef } from 'react';
import type { PrototypeScreenId } from '../navigation';

const SCREENS: { id: PrototypeScreenId; label: string }[] = [
  { id: 'screen1', label: 'Mẫu biểu và cấu hình trường' },
  { id: 'screen2', label: 'Điền biểu mẫu' },
  { id: 'screen3', label: 'Kiểm tra nội dung' },
  { id: 'screen4', label: 'Giao bớt việc' },
  { id: 'screen5', label: 'Duyệt bài nộp' },
  { id: 'screen6', label: 'Tổng hợp kết quả' },
];

interface PrototypeNavigationProps {
  currentScreen: PrototypeScreenId;
  onSelectScreen: (screen: PrototypeScreenId) => void;
}

export function PrototypeNavigation({ currentScreen, onSelectScreen }: PrototypeNavigationProps) {
  const picker = useRef<HTMLDetailsElement>(null);

  return (
    <header className="pa02-navigation">
      <button className="pa02-brand" onClick={() => onSelectScreen('home')}>
        <span className="pa02-brand-mark" aria-hidden="true">D</span>
        <span>Fill &amp; Deliver</span>
      </button>
      <nav aria-label="Điều hướng PA02">
        <button className="btn pa02-text-button" aria-current={currentScreen === 'home' ? 'page' : undefined} onClick={() => onSelectScreen('home')}>Trang bắt đầu</button>
        <details ref={picker} className="pa02-scenario-picker">
          <summary>Kịch bản PA02</summary>
          <ul>
            {SCREENS.map(({ id, label }) => (
              <li key={id}><button className="btn pa02-text-button" aria-current={id === currentScreen ? 'page' : undefined} onClick={() => {
                onSelectScreen(id);
                if (picker.current) picker.current.open = false;
              }}>{label}</button></li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  );
}

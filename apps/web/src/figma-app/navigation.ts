/** URL paths and navigation metadata for the Figma-matched application under /app/*. */
export type FigmaRoutePath =
  | '/app'
  | '/app/overview'
  | '/app/forms'
  | '/app/forms/new'
  | '/app/forms/extract'
  | '/app/forms/config'
  | '/app/forms/checklist'
  | '/app/forms/finalize'
  | '/app/tasks'
  | '/app/tasks/assign'
  | '/app/tasks/fill'
  | '/app/tasks/check'
  | '/app/tasks/export'
  | '/app/presets'
  | '/app/team'
  | '/app/inbox'
  | '/app/workspace'
  | '/app/profile'
  | '/app/login';

export interface SidebarNavItem {
  id: 'overview' | 'forms' | 'tasks' | 'presets' | 'team';
  label: string;
  icon: string;
  path: FigmaRoutePath;
  matchPrefixes: string[];
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    icon: '◌',
    path: '/app/overview',
    matchPrefixes: ['/app/overview'],
  },
  {
    id: 'forms',
    label: 'Biểu mẫu',
    icon: '▣',
    path: '/app/forms',
    matchPrefixes: ['/app/forms'],
  },
  {
    id: 'tasks',
    label: 'Công việc',
    icon: '◉',
    path: '/app/tasks',
    matchPrefixes: ['/app/tasks', '/app/inbox'],
  },
  {
    id: 'presets',
    label: 'Preset',
    icon: '◇',
    path: '/app/presets',
    matchPrefixes: ['/app/presets'],
  },
  {
    id: 'team',
    label: 'Nhóm',
    icon: '◒',
    path: '/app/team',
    matchPrefixes: ['/app/team'],
  },
];

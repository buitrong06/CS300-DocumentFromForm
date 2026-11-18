export type ScreenId = 'screen1' | 'screen2' | 'screen3' | 'screen4' | 'screen5' | 'screen6';

export type FieldType = 'short_text' | 'long_text' | 'date' | 'number' | 'money' | 'choice';

export interface TemplateFieldConfig {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  positionsCount: number;
  instructions: string;
  sourceNote?: string;
  isAmbiguous?: boolean;
}

export interface FormValues {
  unit: string;
  createDate: string;
  activityName: string;
  eventDate: string;
  location: string;
  purpose: string;
  programSchedule: string;
  totalBudget: number;
  budgetDetail?: string;
  signatory: string;
}

export interface RuleFinding {
  id: string;
  type: 'rule' | 'semantic' | 'uncertain';
  fieldName: string;
  fieldKey: keyof FormValues | string;
  title: string;
  message: string;
  evidence?: string;
  criterion?: string;
}

export interface CorrectionSuggestion {
  id: string;
  fieldKey: keyof FormValues | string;
  fieldName: string;
  type: 'punctuation' | 'spelling' | 'convention';
  summary: string;
  originalText: string;
  suggestedText: string;
  contextText: string;
  accepted?: boolean;
}

export interface SubtaskDelegation {
  title: string;
  selectedFieldKeys: string[];
  recipients: { id: string; name: string; avatar: string }[];
  deadline: string;
  readOnlyContextKeys: string[];
  instructions: string;
}

export interface SubmissionSnapshot {
  id: string;
  submissionCode: string;
  recipientName: string;
  recipientAvatar: string;
  subtaskNumber: number;
  submissionIndex: number;
  timestamp: string;
  versionLabel: string;
  status: 'pending' | 'approved' | 'revision_requested';
  content: {
    programSchedule: string;
  };
  previousContent?: {
    programSchedule: string;
  };
  reviewComment?: string;
  autoCheckSummary: {
    rulesPassed: number;
    rulesTotal: number;
    warnings: string[];
  };
}

export interface DelegatedFieldResult {
  id: string;
  fieldKey: string;
  fieldName: string;
  subtaskLabel: string;
  contributions: {
    id: string;
    contributorName: string;
    contributorAvatar: string;
    submissionIndex: number;
    submissionCode: string;
    status: 'approved' | 'pending';
    value: string;
    summaryMeta?: string;
    isCurrentlyApplied?: boolean;
  }[];
}

export interface ProvenanceLog {
  id: string;
  text: string;
  time: string;
  code?: string;
  type: 'self' | 'apply' | 'review' | 'submit';
}

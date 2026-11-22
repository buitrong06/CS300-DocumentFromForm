export interface SubmissionSnapshot {
  id: string;
  submissionCode: string;
  recipientName: string;
  recipientAvatar: string;
  subtaskNumber: number;
  submissionIndex: number;
  timestamp: string;
  versionLabel: string;
  status: "pending" | "approved" | "revision_requested";
  content: { programSchedule: string };
  previousContent?: { programSchedule: string };
  reviewComment?: string;
  autoCheckSummary: {
    rulesPassed: number;
    rulesTotal: number;
    warnings: string[];
  };
}

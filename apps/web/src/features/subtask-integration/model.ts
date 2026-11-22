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
    status: "approved" | "pending";
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
  type: "self" | "apply" | "review" | "submit";
}

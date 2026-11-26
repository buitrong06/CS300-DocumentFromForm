export type DraftFieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "number"
  | "amount_of_money"
  | "choice";

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface DraftField {
  id: number;
  field_key: string;
  label: string;
  field_type: DraftFieldType;
  is_required: boolean;
  instructions: string | null;
  display_order: number;
  bindings: Record<string, unknown>[];
  choice_options: ChoiceOption[];
  automatic_rules: Record<string, unknown>[];
  semantic_criteria: Record<string, unknown>[];
}

export interface ValidationFinding {
  field_key: string;
  kind: "required" | "automatic_rule" | "semantic_criterion";
  status: "failed" | "warning" | "uncertain" | "passed";
  code: string;
  message: string;
  criterion: string | null;
  evidence_quote: string | null;
}

export interface ValidationResult {
  draft_id: number;
  draft_version: number;
  checked_field_keys: string[];
  findings: ValidationFinding[];
  gate: {
    final_export_allowed: boolean;
    submit_allowed: boolean;
    blocking_codes: string[];
    warning_codes: string[];
  };
}

export interface DraftState {
  id: number;
  template_id: number;
  title: string;
  is_personal: boolean;
  field_values: Record<string, string>;
  version: number;
  updated_at: string;
}

export interface DraftEditor {
  draft: DraftState;
  template_name: string;
  fields: DraftField[];
  validation: ValidationResult;
  required_complete: number;
  required_total: number;
}

export interface DraftSummary {
  id: number;
  template_id: number;
  template_name: string;
  title: string;
  version: number;
  updated_at: string;
}

export interface DraftSaveRequest {
  expected_version: number;
  field_values: Record<string, string>;
}

export type ExportFormat = "docx" | "pdf";
export type ExportPurpose = "draft_export" | "final_export";

export interface RenderSnapshot {
  id: number;
  draft_id: number;
  source_draft_version: number;
  format: "docx" | "pdf";
  purpose: "preview" | "draft_export" | "final_export";
  artifact_id: number;
  sha256: string;
  filename: string;
  rendered_at: string;
  content_url: string;
}

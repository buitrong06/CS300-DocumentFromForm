export type EntityId = number;
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type TemplateSourceType = "preset" | "uploaded_docx";
export type TemplateFieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "number"
  | "amount_of_money"
  | "choice";

export interface PublishedTemplateField {
  id: EntityId;
  field_key: string;
  label: string;
  field_type: TemplateFieldType;
  is_required: boolean;
  instructions: string;
  display_order: number;
  bindings: JsonValue[];
  automatic_rules: JsonValue[];
  semantic_criteria: JsonValue[];
}

export interface PublishedTemplate {
  id: EntityId;
  slug: string;
  name: string;
  version: number;
  status: "published";
  source_type: TemplateSourceType;
  preset_id: EntityId | null;
  source_artifact_id: EntityId | null;
  fields: PublishedTemplateField[];
  published_at: string;
}

export interface DraftState {
  id: EntityId;
  template_id: EntityId;
  owner_id: EntityId;
  title: string;
  is_personal: boolean;
  field_values: Record<string, JsonValue>;
  version: number;
  updated_at: string;
}

export interface DraftSaveRequest {
  expected_version: number;
  field_values: Record<string, JsonValue>;
}

export type FindingKind = "required" | "automatic_rule" | "semantic_criterion";
export type FindingStatus = "failed" | "warning" | "uncertain" | "passed";

export interface ValidationFinding {
  field_key: string;
  kind: FindingKind;
  status: FindingStatus;
  code: string;
  message: string;
  criterion: string | null;
  evidence_quote: string | null;
}

export interface GateDecision {
  final_export_allowed: boolean;
  submit_allowed: boolean;
  blocking_codes: string[];
  warning_codes: string[];
}

export interface ValidationResult {
  draft_id: EntityId;
  draft_version: number;
  checked_field_keys: string[];
  findings: ValidationFinding[];
  gate: GateDecision;
}

export type RenderSourceType = "draft" | "submission";
export type RenderFormat = "docx" | "pdf";
export type RenderPurpose = "preview" | "draft_export" | "final_export";

export interface RenderRequest {
  source_type: RenderSourceType;
  source_id: EntityId;
  source_draft_version: number | null;
  format: RenderFormat;
  purpose: RenderPurpose;
}

export interface RenderSnapshot extends RenderRequest {
  id: EntityId;
  artifact_id: EntityId;
  rendered_at: string;
}

export interface SubmissionCreateRequest {
  assignment_id: EntityId;
  expected_draft_version: number;
}

export interface SubmissionSnapshot {
  id: EntityId;
  public_code: string;
  task_id: EntityId;
  assignment_id: EntityId;
  submitted_by: EntityId;
  template_id: EntityId;
  source_draft_version: number;
  field_values_snapshot: Record<string, JsonValue>;
  verification_summary: ValidationResult;
  created_at: string;
}

export type ApplyMode = "direct" | "combine" | "rewrite";

export interface ApplyRequest {
  parent_draft_id: EntityId;
  expected_parent_draft_version: number;
  target_template_field_id: EntityId;
  value_after: JsonValue;
  apply_mode: ApplyMode;
  source_submission_ids: EntityId[];
}

/** Field-review types shared by Template authoring and the canonical PA04 API. */
import type { DraftFieldType, ValidationResult } from "../document-filling/types";

export type FieldType = "short_text" | "long_text" | "date" | "number" | "money" | "choice";
export type CandidateStatus = "proposed" | "accepted" | "rejected";
export type DetectionMethod =
  | "marker"
  | "bracket"
  | "comment"
  | "dotted_line"
  | "underscore"
  | "empty_table_cell"
  | "checkbox"
  | "vml_field"
  | "boxed_field"
  | "manual"
  | "llm";

export interface SourceLocation {
  block_id: string;
  start: number;
  end: number;
  path: string;
  excerpt: string;
}

export interface Instruction {
  text: string;
  source?: SourceLocation | null;
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface FieldRules {
  required: boolean;
  min_length?: number | null;
  max_length?: number | null;
  minimum?: number | null;
  maximum?: number | null;
  decimal_places?: number | null;
  currency?: string | null;
}

export interface FieldCandidate {
  id: string;
  label: string;
  type: FieldType;
  status: CandidateStatus;
  occurrences: SourceLocation[];
  methods: DetectionMethod[];
  confidence: number;
  evidence: string[];
  instructions: Instruction[];
  requirements: string[];
  placeholder?: string | null;
  default_value?: string | null;
  options: ChoiceOption[];
  rules: FieldRules;
  section?: string | null;
}

export interface DocumentBlock {
  id: string;
  kind: "paragraph" | "table_cell" | "header" | "footer";
  text: string;
  path: string;
  parent_table?: string | null;
}

export interface AnalysisWarning {
  code: string;
  message: string;
  block_id?: string | null;
}

/** Legacy extraction response, retained while `/api/form-generations` remains available. */
export interface FormGeneration {
  id: string;
  filename: string;
  sha256: string;
  status: "analyzing" | "needs_review" | "ready" | "failed";
  revision: number;
  blocks: DocumentBlock[];
  candidates: FieldCandidate[];
  warnings: AnalysisWarning[];
  created_at: string;
  updated_at: string;
}

export interface TemplateSummary {
  id: number;
  name: string;
  version: number;
  status: "draft" | "published" | "archived";
  source_type: "preset" | "uploaded_docx";
  created_at: string;
  published_at: string | null;
}

export type ContentCheck = Pick<ValidationResult, "checked_field_keys" | "findings" | "gate">;

export interface TemplateFieldView {
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

export interface TemplateDraft {
  id: number;
  slug: string;
  name: string;
  version: number;
  status: "draft" | "published" | "archived";
  source_type: "preset" | "uploaded_docx";
  preset_id: number | null;
  document_type_key: string | null;
  source_artifact_id: number | null;
  org_constants: Record<string, unknown>;
  published_at: string | null;
  review: FormGeneration | null;
  fields: TemplateFieldView[];
}

export interface FormattingPresetOption {
  id: number;
  slug: string;
  name: string;
  version: number;
  document_type_keys: string[];
}

export interface CreatePresetTemplateRequest {
  preset_id: number;
  document_type_key: string;
  name: string;
  org_constants: Record<string, string>;
}

export interface SampleTemplate {
  id: string;
  filename: string;
  title: string;
  description: string;
  kind: string;
}

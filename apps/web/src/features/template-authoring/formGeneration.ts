/** Transitional extraction types for the imported-DOCX authoring flow. */
export type FieldType = "short_text" | "long_text" | "date" | "number" | "money" | "choice";
export type CandidateStatus = "proposed" | "accepted" | "rejected";
export type DetectionMethod = "marker" | "comment" | "dotted_line" | "underscore" | "empty_table_cell" | "manual" | "llm";

export interface SourceLocation {
  block_id: string;
  start: number;
  end: number;
  path: string;
  excerpt: string;
}

export interface Instruction { text: string; source?: SourceLocation | null }
export interface ChoiceOption { value: string; label: string }
export interface FieldRules { required: boolean; min_length?: number | null; max_length?: number | null; minimum?: number | null; maximum?: number | null; decimal_places?: number | null; currency?: string | null }
export interface FieldCandidate {
  id: string; label: string; type: FieldType; status: CandidateStatus; occurrences: SourceLocation[];
  methods: DetectionMethod[]; confidence: number; evidence: string[]; instructions: Instruction[];
  requirements: string[]; placeholder?: string | null; default_value?: string | null;
  options: ChoiceOption[]; rules: FieldRules; section?: string | null;
}
export interface DocumentBlock { id: string; kind: "paragraph" | "table_cell" | "header" | "footer"; text: string; path: string; parent_table?: string | null }
export interface AnalysisWarning { code: string; message: string; block_id?: string | null }
export interface FormGeneration {
  id: string; filename: string; sha256: string; status: "analyzing" | "needs_review" | "ready" | "failed";
  revision: number; blocks: DocumentBlock[]; candidates: FieldCandidate[]; warnings: AnalysisWarning[];
  created_at: string; updated_at: string;
}
export interface SampleTemplate { id: string; filename: string; title: string; description: string; kind: string }

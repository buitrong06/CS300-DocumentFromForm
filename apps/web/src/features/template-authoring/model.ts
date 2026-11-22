export type FieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "number"
  | "money"
  | "choice";

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

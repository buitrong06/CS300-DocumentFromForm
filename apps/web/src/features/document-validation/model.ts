import type { FormValues } from "../document-filling";

export interface RuleFinding {
  id: string;
  type: "rule" | "semantic" | "uncertain";
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
  type: "punctuation" | "spelling" | "convention";
  summary: string;
  originalText: string;
  suggestedText: string;
  contextText: string;
  accepted?: boolean;
}

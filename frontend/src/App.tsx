import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge, Button, Dropdown, Field, Input, Label, Option, ProgressBar, Textarea,
  Tooltip, makeStyles, shorthands, tokens,
} from "@fluentui/react-components";
import { ArrowLeftRegular, ArrowUploadRegular, CheckmarkCircleRegular, DismissCircleRegular, DocumentBulletListRegular, SaveRegular } from "@fluentui/react-icons";
import { sourcePreview, uploadTemplate, saveGeneration } from "./api";
import type { FieldCandidate, FieldType, FormGeneration, SampleTemplate } from "./types";

const SAMPLE_TEMPLATES: SampleTemplate[] = [
  { id: "mau-cc01", filename: "1604372463_Mau_CC01.docx", title: "Mẫu CC01 – Tờ khai căn cước công dân", description: "Tờ khai thông tin cá nhân theo mẫu CC01.", kind: "Tờ khai" },
  { id: "mau-ct01", filename: "1698204115_CT01.docx", title: "Mẫu CT01 – Tờ khai thay đổi thông tin cư trú", description: "Tờ khai đề nghị đăng ký hoặc thay đổi thông tin cư trú.", kind: "Tờ khai" },
  { id: "ban-khai-dang-ky", filename: "Ban_khai_dang_ky_ten_dinh_danh_1740715404.docx", title: "Bản khai đăng ký tên định danh", description: "DOCX gốc có sẵn trong thư mục samples.", kind: "Bản khai" },
  { id: "to-trinh-chung", filename: "mau-to-trinh-chung_1408184733.docx", title: "Mẫu tờ trình chung", description: "DOCX gốc có sẵn trong thư mục samples.", kind: "Tờ trình" },
];

const useStyles = makeStyles({
  app: { minHeight: "100dvh", backgroundColor: tokens.colorNeutralBackground2 },
  header: { height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", backgroundColor: tokens.colorNeutralBackground1, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  headerActions: { display: "flex", alignItems: "center", gap: "10px" },
  wordmark: { fontSize: "18px", fontWeight: 700, letterSpacing: "-.02em" },
  main: { maxWidth: "1540px", margin: "0 auto", padding: "28px" },
  titleRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", marginBottom: "22px" },
  title: { margin: 0, fontSize: "28px", lineHeight: 1.18, letterSpacing: "-.025em" },
  subtitle: { margin: "6px 0 0", color: tokens.colorNeutralForeground3 },
  layout: {
    display: "grid", gridTemplateColumns: "310px minmax(360px, 1fr) 350px", gap: "16px", alignItems: "start",
    "@media (max-width: 1100px)": { gridTemplateColumns: "280px minmax(0, 1fr)" },
    "@media (max-width: 740px)": { display: "flex", flexDirection: "column" },
  },
  panel: { backgroundColor: tokens.colorNeutralBackground1, ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2), ...shorthands.borderRadius("10px"), overflow: "hidden" },
  panelHead: { padding: "16px 18px 12px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  panelBody: { padding: "12px" },
  list: { display: "flex", flexDirection: "column", gap: "4px" },
  fieldRow: { width: "100%", textAlign: "left", backgroundColor: "transparent", border: "none", padding: "10px", borderRadius: "7px", cursor: "pointer", color: tokens.colorNeutralForeground1 },
  fieldActive: { backgroundColor: tokens.colorBrandBackground2 },
  fieldMeta: { color: tokens.colorNeutralForeground3, fontSize: "12px", marginTop: "3px", display: "flex", gap: "6px", alignItems: "center" },
  document: { minHeight: "630px", padding: "24px", overflow: "auto", backgroundColor: "#edf0f3" },
  muted: { color: tokens.colorNeutralForeground3 },
  propertyGroup: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px 18px" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap", padding: "14px 18px", borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
  empty: { maxWidth: "670px", margin: "96px auto", padding: "44px", backgroundColor: tokens.colorNeutralBackground1, ...shorthands.border("1px", "dashed", tokens.colorNeutralStroke1), ...shorthands.borderRadius("12px"), textAlign: "center" },
  sampleList: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "28px", textAlign: "left", "@media (max-width: 640px)": { gridTemplateColumns: "1fr" } },
  sampleButton: { display: "flex", minHeight: "104px", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between", textAlign: "left", whiteSpace: "normal" },
});

const TYPE_LABELS: Record<FieldType, string> = { short_text: "Short text", long_text: "Long text", date: "Date", number: "Number", money: "Money", choice: "Choice" };

export function App() {
  const styles = useStyles();
  const [generation, setGeneration] = useState<FormGeneration | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const selected = generation?.candidates.find((field) => field.id === selectedId) ?? null;

  const acceptedCount = useMemo(() => generation?.candidates.filter((candidate) => candidate.status === "accepted").length ?? 0, [generation]);

  async function importDocx(file: File) {
    setUploading(true); setMessage(null);
    try {
      const result = await uploadTemplate(file);
      setGeneration(result); setSelectedId(result.candidates[0]?.id ?? null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read this document."); }
    finally { setUploading(false); }
  }

  async function selectSample(sample: SampleTemplate) {
    setUploading(true); setMessage(null);
    try {
      const response = await fetch(`/samples/${encodeURIComponent(sample.filename)}`);
      if (!response.ok) throw new Error("Không tải được tệp DOCX mẫu.");
      const document = await response.blob();
      const result = await uploadTemplate(new File([document], sample.filename, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
      setGeneration(result); setSelectedId(result.candidates[0]?.id ?? null);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open this sample."); }
    finally { setUploading(false); }
  }

  function updateSelected(change: Partial<FieldCandidate>) {
    if (!generation || !selected) return;
    setGeneration({ ...generation, candidates: generation.candidates.map((field) => field.id === selected.id ? { ...field, ...change } : field) });
  }

  async function save() {
    if (!generation) return;
    try { setGeneration(await saveGeneration(generation.id, generation.revision, generation.candidates)); setMessage("Review saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
  }

  function goHome() {
    setGeneration(null);
    setSelectedId(null);
    setMessage(null);
  }

  if (!generation) return <UploadScreen styles={styles} uploading={uploading} message={message} onImport={importDocx} onSelectSample={selectSample} />;

  return <div className={styles.app}>
    <header className={styles.header}><div className={styles.wordmark}>Extract Field</div><div className={styles.headerActions}><Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={goHome}>Trang chủ</Button><Badge appearance="tint" color={generation.status === "ready" ? "success" : "informative"}>{generation.status === "ready" ? "Reviewed" : "Needs review"}</Badge></div></header>
    <main className={styles.main}>
      <div className={styles.titleRow}><div><h1 className={styles.title}>{generation.filename}</h1><p className={styles.subtitle}>{acceptedCount} of {generation.candidates.length} field candidates accepted. Fixed text stays outside the generated form.</p></div><Button appearance="primary" icon={<SaveRegular />} onClick={save}>Save review</Button></div>
      {message && <p role="status">{message}</p>}
      <div className={styles.layout}>
        <FieldList styles={styles} generation={generation} selectedId={selectedId} onSelect={setSelectedId} />
        <DocumentCanvas styles={styles} generation={generation} />
        <FieldProperties styles={styles} field={selected} onChange={updateSelected} />
      </div>
    </main>
  </div>;
}

function UploadScreen({ styles, uploading, message, onImport, onSelectSample }: { styles: ReturnType<typeof useStyles>; uploading: boolean; message: string | null; onImport: (file: File) => void; onSelectSample: (sample: SampleTemplate) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <div className={styles.app}><header className={styles.header}><div className={styles.wordmark}>Extract Field</div><span className={styles.muted}>Template to form</span></header><main className={styles.empty}><DocumentBulletListRegular fontSize={42} /><h1>Turn a DOCX template into a reviewed form</h1><p className={styles.muted}>Markers, comments, blank lines, and table cells become editable field proposals. You decide what the final form contains.</p><Button appearance="primary" icon={<ArrowUploadRegular />} disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? "Analyzing document..." : "Choose DOCX template"}</Button><input ref={fileInput} aria-label="Choose DOCX template" type="file" accept=".docx" hidden onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} /><p className={styles.muted}>Hoặc import trực tiếp một DOCX gốc có trong thư mục samples:</p><div className={styles.sampleList}>{SAMPLE_TEMPLATES.map((sample) => <Button key={sample.id} className={styles.sampleButton} onClick={() => onSelectSample(sample)} disabled={uploading}><strong>{sample.title}</strong><span>{sample.description}</span></Button>)}</div>{message && <p role="alert">{message}</p>}</main></div>;
}

function FieldList({ styles, generation, selectedId, onSelect }: { styles: ReturnType<typeof useStyles>; generation: FormGeneration; selectedId: string | null; onSelect: (id: string) => void }) {
  return <section className={styles.panel}><div className={styles.panelHead}><strong>Detected fields</strong><div className={styles.muted}>{generation.warnings.length} warning{generation.warnings.length === 1 ? "" : "s"}</div></div><div className={styles.panelBody}><div className={styles.list}>{generation.candidates.map((field) => <button key={field.id} className={`${styles.fieldRow} ${field.id === selectedId ? styles.fieldActive : ""}`} onClick={() => onSelect(field.id)}><strong>{field.label}</strong><div className={styles.fieldMeta}><Badge size="small" appearance="tint">{TYPE_LABELS[field.type]}</Badge><span>{Math.round(field.confidence * 100)}% confidence</span></div></button>)}</div></div></section>;
}

function DocumentCanvas({ styles, generation }: { styles: ReturnType<typeof useStyles>; generation: FormGeneration }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setHtml(null); setError(null);
    sourcePreview(generation.id).then((content) => { if (active) setHtml(content); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not render the DOCX preview."); });
    return () => { active = false; };
  }, [generation.id, generation.revision]);
  return <section className={styles.panel}><div className={styles.panelHead}><strong>Source document</strong><div className={styles.muted}>DOCX layout preview. Blue boxes mark fillable regions.</div></div><article className={styles.document}>{error && <p role="alert">{error}</p>}{!html && !error && <p className={styles.muted}>Rendering DOCX preview…</p>}{html && <div dangerouslySetInnerHTML={{ __html: html }} />}</article></section>;
}

function FieldProperties({ styles, field, onChange }: { styles: ReturnType<typeof useStyles>; field: FieldCandidate | null; onChange: (change: Partial<FieldCandidate>) => void }) {
  if (!field) return <section className={styles.panel}><div className={styles.panelHead}><strong>Field details</strong></div><div className={styles.propertyGroup}><span className={styles.muted}>Select a detected field to review it.</span></div></section>;
  const instruction = field.instructions.map((item) => item.text).join("\n");
  return <section className={styles.panel}><div className={styles.panelHead}><strong>Field details</strong><div className={styles.muted}>{field.occurrences.length} document occurrence{field.occurrences.length === 1 ? "" : "s"}</div></div><div className={styles.propertyGroup}>
    <Field label="Label"><Input value={field.label} onChange={(_, data) => onChange({ label: data.value })} /></Field>
    <Field label="Input type"><Dropdown value={TYPE_LABELS[field.type]} selectedOptions={[field.type]} onOptionSelect={(_, data) => { const type = data.optionValue as FieldType; onChange({ type, status: type === "choice" && field.status === "accepted" && !field.options.length ? "proposed" : field.status }); }}>{(Object.keys(TYPE_LABELS) as FieldType[]).map((type) => <Option key={type} value={type}>{TYPE_LABELS[type]}</Option>)}</Dropdown></Field>
    <Field label="Instructions"><Textarea value={instruction} resize="vertical" onChange={(_, data) => onChange({ instructions: data.value ? [{ text: data.value }] : [] })} /></Field>
    {field.type === "choice" && <Field label="Choices, one per line"><Textarea value={field.options.map((option) => option.label).join("\n")} resize="vertical" placeholder="Option A&#10;Option B" onChange={(_, data) => onChange({ options: data.value.split("\n").map((value) => value.trim()).filter(Boolean).map((value) => ({ label: value, value })) })} /></Field>}
    <Field label="Review decision"><Dropdown value={field.status} selectedOptions={[field.status]} onOptionSelect={(_, data) => onChange({ status: data.optionValue as FieldCandidate["status"] })}><Option value="proposed">Proposed</Option><Option value="accepted">Accept as field</Option><Option value="rejected">Keep fixed</Option></Dropdown></Field>
    <Field label="Required"><Button appearance={field.rules.required ? "primary" : "secondary"} onClick={() => onChange({ rules: { ...field.rules, required: !field.rules.required } })}>{field.rules.required ? "Required" : "Optional"}</Button></Field>
    <div className={styles.muted}>Detected from {field.methods.join(", ").replaceAll("_", " ")}. {Math.round(field.confidence * 100)}% confidence.</div>
  </div><div className={styles.actions}><Tooltip content="Accept this candidate as an editable field" relationship="label"><Button icon={<CheckmarkCircleRegular />} onClick={() => onChange({ status: "accepted" })}>Accept</Button></Tooltip><Tooltip content="Keep this source text fixed" relationship="label"><Button icon={<DismissCircleRegular />} onClick={() => onChange({ status: "rejected" })}>Reject</Button></Tooltip></div></section>;
}

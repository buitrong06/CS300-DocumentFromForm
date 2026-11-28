import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const allowedStarterKit = StarterKit.configure({
  blockquote: false,
  code: false,
  codeBlock: false,
  hardBreak: false,
  heading: false,
  horizontalRule: false,
  link: false,
  strike: false,
  underline: false,
});

function initialContent(value: string): string | object {
  if (!value.trim()) return "";
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    // Existing plain text is deliberately loaded as text and becomes valid Tiptap JSON on input.
  }
  return value;
}

export function RichTextField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const editor = useEditor({
    extensions: [allowedStarterKit],
    content: initialContent(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange(JSON.stringify(current.getJSON())),
    editorProps: {
      attributes: {
        id,
        class: "pa04-rich-editor-content",
        "aria-label": "Nội dung có định dạng tối thiểu",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
    const next = initialContent(value);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [disabled, editor, value]);

  if (!editor) return <div className="pa04-rich-editor-content" aria-busy="true" />;

  return (
    <div className={disabled ? "pa04-rich-editor disabled" : "pa04-rich-editor"}>
      <div className="pa04-rich-toolbar" aria-label="Định dạng tối thiểu">
        <button
          type="button"
          disabled={disabled}
          aria-label="In đậm"
          className={editor.isActive("bold") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="In nghiêng"
          className={editor.isActive("italic") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Danh sách dấu đầu dòng"
          className={editor.isActive("bulletList") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Danh sách
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Danh sách đánh số"
          className={editor.isActive("orderedList") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Danh sách
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

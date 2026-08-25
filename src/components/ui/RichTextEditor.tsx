"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { TextB, TextItalic, ListBullets, ListNumbers } from "@phosphor-icons/react";
import { Button } from "./Button";

// tiptap-markdown doesn't ship the @tiptap/core module augmentation that'd
// make `editor.storage.markdown` type-check on its own.
declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

// Stop.description / Place.note only (ROADMAP.md Milestone O) — tips stay
// plain textareas, this isn't a general-purpose replacement. Stored format
// is a constrained Markdown subset, not HTML: react-markdown (MarkdownText)
// never renders raw HTML back, so there's no sanitization step to get
// wrong or skip — safe by construction rather than safe-if-sanitized.
// Headings/blockquote/code/horizontal-rule are disabled — bold/italic/lists
// is the scoped toolbar, not a full document editor.
export function RichTextEditor({ id, value, onChange, placeholder }: RichTextEditorProps) {
  // Uncontrolled after mount, by design: `value` seeds the initial document
  // once and `onChange` reports edits back out, but neither should flow
  // back INTO the live editor on every keystroke — onUpdate firing on each
  // character re-renders the parent with a new `value`, and if useEditor
  // resynced `content` from that on every render, it would reset the
  // document out from under the user's live cursor (reproduced during
  // Milestone O verification: typed text landed scrambled). The empty deps
  // array is what tells @tiptap/react "build this editor once."
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          code: false,
          horizontalRule: false,
        }),
        Markdown.configure({ html: false }),
      ],
      content: value,
      editorProps: {
        attributes: {
          class: "input",
          role: "textbox",
          style: "min-height: 90px; cursor: text;",
          ...(id ? { id } : {}),
          ...(placeholder ? { "data-placeholder": placeholder } : {}),
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.storage.markdown.getMarkdown());
      },
    },
    [],
  );

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          icon
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <TextB weight="duotone" size={18} />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          icon
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <TextItalic weight="duotone" size={18} />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          icon
          aria-label="Bullet list"
          aria-pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListBullets weight="duotone" size={18} />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          icon
          aria-label="Numbered list"
          aria-pressed={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbers weight="duotone" size={18} />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

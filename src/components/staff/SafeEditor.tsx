"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import Blockquote from "@tiptap/extension-blockquote";
import Code from "@tiptap/extension-code";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import {
  Bold, Italic, List, ListOrdered, Undo, Redo,
  Heading1, Heading2, Quote, Link as LinkIcon, Code as CodeIcon, Minus,
} from "lucide-react";

interface SafeEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function SafeEditor({ content, onChange, placeholder = "Write something...", minHeight = "200px" }: SafeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [2, 3] }),
      Link.configure({ openOnClick: false }),
      Blockquote,
      Code,
      HorizontalRule,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) return null;

  const ToolButton = ({ onClick, active, children }: { onClick: () => void; active: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
        active ? "bg-emerald-100 text-emerald-700" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/60 bg-muted/20 flex-wrap">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="size-4" />
        </ToolButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading1 className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <Heading2 className="size-4" />
        </ToolButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
          <CodeIcon className="size-4" />
        </ToolButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton onClick={addLink} active={editor.isActive("link")}>
          <LinkIcon className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false}>
          <Minus className="size-4" />
        </ToolButton>
        <div className="flex-1" />
        <ToolButton onClick={() => editor.chain().focus().undo().run()} active={false}>
          <Undo className="size-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} active={false}>
          <Redo className="size-4" />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

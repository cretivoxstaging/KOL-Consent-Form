
"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  RotateCcw,
  Underline as UnderlineIcon,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxLength?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis di sini... Gunakan toolbar untuk Bold, Italic, atau Poin Strip ( - ). Tekan Enter untuk baris baru.",
  minHeight = "110px",
  maxLength,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
  });

  // Keep editor content in sync when value changes externally
  useEffect(() => {
    if (editorRef.current) {
      if (value === "" && editorRef.current.innerHTML !== "") {
        editorRef.current.innerHTML = "";
      } else if (value && editorRef.current.innerHTML !== value) {
        if (document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = value;
        }
      }
    }
  }, [value]);

  const updateActiveFormats = () => {
    if (typeof document === "undefined") return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        bulletList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // Ignore if document selection is invalid
    }
  };

  const executeCommand = (command: string, val: string | undefined = undefined) => {
    if (typeof document === "undefined") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    updateActiveFormats();
    handleInput();
  };

  const insertDash = () => {
    if (typeof document === "undefined") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText.trim()) {
        const lines = selectedText.split("\n");
        const formatted = lines
          .map((l) => (l.trim().startsWith("-") ? l : `- ${l.trim()}`))
          .join("<br>");
        document.execCommand("insertHTML", false, formatted);
      } else {
        document.execCommand("insertHTML", false, "-&nbsp;");
      }
    } else {
      document.execCommand("insertHTML", false, "-&nbsp;");
    }
    updateActiveFormats();
    handleInput();
  };

  // Calculate plain text length without HTML tags
  const rawPlainText = (value || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ");
  const charCount = rawPlainText.length;

  const handleInput = () => {
    if (editorRef.current) {
      let html = editorRef.current.innerHTML;
      if (html === "<br>" || html === "<div><br></div>" || html === "<p><br></p>") {
        html = "";
      }
      onChange(html);
    }
    updateActiveFormats();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!maxLength) return;
    const pastedText = e.clipboardData.getData("text/plain");
    const remaining = maxLength - charCount;
    if (remaining <= 0) {
      e.preventDefault();
      return;
    }
    if (pastedText.length > remaining) {
      e.preventDefault();
      const allowed = pastedText.substring(0, remaining);
      document.execCommand("insertText", false, allowed);
      handleInput();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Check maxLength restriction
    if (maxLength && charCount >= maxLength) {
      const isModifier = e.ctrlKey || e.metaKey || e.altKey;
      const isNavOrDelete = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "Tab",
        "Escape",
      ].includes(e.key);
      const hasSelection = typeof window !== "undefined" && (window.getSelection()?.toString().length || 0) > 0;

      if (!isModifier && !isNavOrDelete && !hasSelection) {
        e.preventDefault();
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      executeCommand("bold");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      executeCommand("italic");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      executeCommand("underline");
    } else if (e.key === "Enter") {
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        const nodeText = selection.anchorNode.textContent || "";
        const offset = selection.anchorOffset;
        const textBeforeCursor = nodeText.substring(0, offset);

        if (/^-\s+\S+/.test(textBeforeCursor.trim())) {
          e.preventDefault();
          document.execCommand("insertHTML", false, "<br>-&nbsp;");
          handleInput();
        } else if (/^-\s*$/.test(textBeforeCursor.trim())) {
          e.preventDefault();
          document.execCommand("delete");
          document.execCommand("delete");
          document.execCommand("insertHTML", false, "<br>");
          handleInput();
        }
      }
    }
  };

  return (
    <div className="w-full rounded-xl border border-zinc-300 bg-white overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all shadow-xs">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-3 py-2 select-none">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          title="Bold (Ctrl+B)"
          className={`p-1.5 rounded-md text-xs font-bold transition-colors flex items-center justify-center cursor-pointer ${activeFormats.bold
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900"
            }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("italic")}
          title="Italic (Ctrl+I)"
          className={`p-1.5 rounded-md text-xs italic transition-colors flex items-center justify-center cursor-pointer ${activeFormats.italic
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900"
            }`}
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("underline")}
          title="Underline (Ctrl+U)"
          className={`p-1.5 rounded-md text-xs transition-colors flex items-center justify-center cursor-pointer ${activeFormats.underline
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900"
            }`}
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        <button
          type="button"
          onClick={insertDash}
          title="Poin Strip ( - )"
          className="p-1.5 rounded-md text-xs font-bold text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900 transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
        >
          <Minus className="w-4 h-4 stroke-3" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          title="Bullet List (•)"
          className={`p-1.5 rounded-md text-xs transition-colors flex items-center justify-center cursor-pointer ${activeFormats.bulletList
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900"
            }`}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          title="Numbered List (1. 2. 3.)"
          className={`p-1.5 rounded-md text-xs transition-colors flex items-center justify-center cursor-pointer ${activeFormats.orderedList
            ? "bg-zinc-900 text-white"
            : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900"
            }`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          title="Hapus Format (Clear Formatting)"
          className="p-1.5 rounded-md text-xs text-zinc-400 hover:bg-zinc-200/80 hover:text-rose-600 transition-colors ml-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative bg-white">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{ minHeight }}
          className="w-full p-3.5 text-base sm:text-sm font-sans text-zinc-900 bg-white outline-none leading-relaxed rich-text-content"
        />

        {(!value || value === "<br>" || value.trim() === "") && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute top-3.5 left-3.5 text-base sm:text-sm text-zinc-400 pointer-events-none select-none italic"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Character Counter Footer Bar */}
      {maxLength && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-50 border-t border-zinc-200 text-xs select-none">
          <span className="text-zinc-400">
            Maksimal {maxLength.toLocaleString("id-ID")} karakter
          </span>
          <span
            className={`font-mono font-medium transition-colors ${
              charCount >= maxLength
                ? "text-rose-600 font-bold"
                : charCount >= maxLength * 0.9
                ? "text-amber-600 font-semibold"
                : "text-zinc-500"
            }`}
          >
            {charCount.toLocaleString("id-ID")} / {maxLength.toLocaleString("id-ID")}
          </span>
        </div>
      )}
    </div>
  );
}

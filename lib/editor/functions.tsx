"use client";

import { $generateNodesFromDOM } from "@lexical/html";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { $getRoot, createEditor, type LexicalEditor } from "lexical";
import { renderToString } from "react-dom/server";

import Markdown from "react-markdown";

import { createEditorConfig } from "./config";

export const buildEditorFromContent = (content: string): LexicalEditor => {
  const config = createEditorConfig();
  const editor = createEditor(config);

  editor.update(() => {
    $convertFromMarkdownString(content);
  });

  return editor;
};

export const buildContentFromEditor = (editor: LexicalEditor): string => {
  let content = "";

  editor.getEditorState().read(() => {
    content = $convertToMarkdownString();
  });

  return content;
};

// Alternative method using HTML conversion for better compatibility
export const buildEditorFromContentHTML = (content: string): LexicalEditor => {
  const config = createEditorConfig();
  const editor = createEditor(config);

  const stringFromMarkdown = renderToString(<Markdown>{content}</Markdown>);

  editor.update(() => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(stringFromMarkdown, "text/html");
    const nodes = $generateNodesFromDOM(editor, dom);
    const root = $getRoot();
    root.clear();
    root.append(...nodes);
  });

  return editor;
};

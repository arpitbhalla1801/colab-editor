"use client";


import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
// Do not import y-monaco at the top level to avoid SSR window reference error
import dynamic from "next/dynamic";
import React from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function EditorPage() {
  const { project } = useParams();
  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      "wss://demos.yjs.dev",
      `project-${project}`,
      ydoc
    );
    ydocRef.current = ydoc;
    providerRef.current = provider;
    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [project]);

  async function handleEditorDidMount(editor: any, monaco: any) {
    if (!ydocRef.current || !providerRef.current) return;
    const yText = ydocRef.current.getText("content");
    // Dynamically import y-monaco only on client
    const { MonacoBinding } = await import("y-monaco");
    new MonacoBinding(yText, editor.getModel(), new Set([editor]), providerRef.current.awareness);
    editorRef.current = editor;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Editing: {project}</h1>
      <div className="h-[500px]">
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}

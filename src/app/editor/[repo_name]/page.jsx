"use client";
import dynamic from "next/dynamic";
import { useState, use } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function EditorPage({ params }) {
  const { repo_name: repoName } = use(params);
  const [activeTab, setActiveTab] = useState("editor");
  const [fileContent, setFileContent] = useState("// Start editing your code here\n");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        <button onClick={() => setActiveTab("editor")}>Editor</button>
        <button onClick={() => setActiveTab("files")}>Files</button>
        <button onClick={() => setActiveTab("git")}>Git</button>
        <button onClick={() => setActiveTab("search")}>Search/Replace</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === "editor" && (
          <MonacoEditor
            height="100%"
            defaultLanguage="javascript"
            value={fileContent}
            onChange={setFileContent}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
            }}
          />
        )}
        {activeTab === "files" && <div>File viewer coming soon...</div>}
        {activeTab === "git" && <div>Git portal coming soon...</div>}
        {activeTab === "search" && <div>Search & Replace coming soon...</div>}
      </div>
    </div>
  );
}

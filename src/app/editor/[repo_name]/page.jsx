"use client";
import dynamic from "next/dynamic";
import { useState, use } from "react";
import { FaCode, FaFolderOpen, FaGitAlt, FaSearch, FaAngleLeft, FaAngleRight } from "react-icons/fa";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function EditorPage({ params }) {
  const { repo_name: repoName } = use(params);
  const [activeTab, setActiveTab] = useState("editor");
  const [fileContent, setFileContent] = useState("// Start editing your code here\n");
  const [openFile, setOpenFile] = useState(null);

  function handleOpenFile(filename) {
    setOpenFile(filename);
    if (filename === "README.md") {
      setFileContent("# README\n\nThis is the README file.");
    } else if (filename === "src/app/editor/[repo_name]/page.jsx") {
      setFileContent("// Editor page code\nimport React from 'react';");
    } else if (filename === "package.json") {
      setFileContent('{\n  "name": "colab-editor",\n  "version": "1.0.0"\n}');
    } else {
      setFileContent("// File content for " + filename);
    }
    setActiveTab("editor");
  }

  function FileItem({ filename, onOpen }) {
    return (
      <li
        style={{ padding: "6px 0", cursor: "pointer" }}
        onDoubleClick={() => onOpen(filename)}
        title={`Double click to open ${filename}`}
      >
        {filename}
      </li>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "row", background: "#1e1e1e" }}>
      <div style={{
        width: 56,
        background: "#23272e",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        paddingTop: 16
      }}>
        <SidebarTabButton
          active={activeTab === "editor"}
          onClick={() => setActiveTab("editor")}
          icon={<FaCode />}
        />
        <SidebarTabButton
          active={activeTab === "files"}
          onClick={() => setActiveTab("files")}
          icon={<FaFolderOpen />}
        />
        <SidebarTabButton
          active={activeTab === "git"}
          onClick={() => setActiveTab("git")}
          icon={<FaGitAlt />}
        />
        <SidebarTabButton
          active={activeTab === "search"}
          onClick={() => setActiveTab("search")}
          icon={<FaSearch />}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "#1e1e1e", padding: 0, display: "flex", flexDirection: "row" }}>
        {activeTab === "files" && (
          <div style={{ width: 220, background: "#23272e", borderRight: "1px solid #333", color: "#ccc", padding: 12, overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>Files</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <FileItem filename="README.md" onOpen={handleOpenFile} />
              <FileItem filename="src/app/editor/[repo_name]/page.jsx" onOpen={handleOpenFile} />
              <FileItem filename="package.json" onOpen={handleOpenFile} />
              {/* Add more files here or fetch dynamically */}
            </ul>
          </div>
        )}
        {activeTab === "git" && (
          <div style={{ width: 220, background: "#23272e", borderRight: "1px solid #333", color: "#ccc", padding: 12, overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>Git Changes</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ padding: "6px 0", cursor: "pointer" }}>M src/app/editor/[repo_name]/page.jsx</li>
              <li style={{ padding: "6px 0", cursor: "pointer" }}>A src/app/new/page.jsx</li>
              {/* Add more changes here or fetch dynamically */}
            </ul>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, background: "#1e1e1e", padding: 0 }}>
          {(activeTab === "editor" || openFile) && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {openFile && (
                <div style={{ color: "#ccc", background: "#23272e", padding: "8px 16px", borderBottom: "1px solid #333" }}>
                  {openFile}
                </div>
              )}
              <MonacoEditor
                height={openFile ? "calc(100% - 40px)" : "100%"}
                defaultLanguage="javascript"
                value={fileContent}
                onChange={setFileContent}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  scrollbar: { vertical: "visible", horizontal: "visible" },
                }}
              />
            </div>
          )}
          {activeTab === "files" && !openFile && <div style={{ color: "#ccc", padding: 24 }}>Select a file to view its content.</div>}
          {activeTab === "git" && <div style={{ color: "#ccc", padding: 24 }}>Select a change to view diff.</div>}
          {activeTab === "search" && <div style={{ color: "#ccc", padding: 24 }}>Search & Replace coming soon...</div>}
        </div>
      </div>
    </div>
  );
}



function SidebarTabButton({ active, icon, ...props }) {
  return (
    <button
      {...props}
      style={{
        background: active ? "#23272e" : "#23272e",
        color: active ? "#fff" : "#bbb",
        border: "none",
        outline: "none",
        padding: "12px 0",
        fontSize: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        cursor: "pointer",
        borderRight: active ? "2px solid #007acc" : "2px solid transparent",
        marginBottom: 8,
        transition: "border-right 0.2s, color 0.2s, padding 0.2s",
      }}
    >
      {icon}
    </button>
  );
}

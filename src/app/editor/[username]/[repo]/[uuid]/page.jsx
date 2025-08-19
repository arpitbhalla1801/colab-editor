// This is the new dynamic route for the editor: /editor/:username/:repo/:uuid
// You can move your existing logic from the previous dynamic route here.

"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, use } from "react";
import { FaFolderOpen, FaGitAlt, FaSearch } from "react-icons/fa";
import { File, Folder, Tree } from "../../../../../components/magicui/file-tree";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function EditorPage({ params }) {
  const { username, repo, uuid } = use(params);
  const [activeTab, setActiveTab] = useState("files");
  const [fileContent, setFileContent] = useState("// Start editing your code here\n");
  const [openFile, setOpenFile] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Recursively render Folder/File for magicui Tree
  function renderMagicTree(element, handleOpenFile) {
    if (!element) return null;
    if (element.children && element.children.length > 0) {
      return (
        <Folder key={element.id} value={element.id} element={element.name}>
          {element.children.map(child => renderMagicTree(child, handleOpenFile))}
        </Folder>
      );
    }
    return (
      <File key={element.id} value={element.id} onClick={() => handleOpenFile(element.path)}>
        <p>{element.name}</p>
      </File>
    );
  }

  async function handleOpenFile(filepath) {
    setOpenFile(filepath);
    // Find the file in the tree
    if (fileTree) {
      const fileNode = findFileNode(fileTree, filepath);
      if (fileNode && fileNode.content) {
        // Decode base64 if needed
        let content = fileNode.content;
        if (fileNode.encoding === "base64") {
          try {
            content = atob(content.replace(/\n/g, ""));
          } catch {
            content = "(Could not decode file)";
          }
        }
        setFileContent(content);
      } else {
        setFileContent("(File not found or empty)");
      }
    }
    setActiveTab("editor");
  }

  function findFileNode(tree, path) {
    if (!tree) return null;
    if (tree.path === path) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const found = findFileNode(child, path);
        if (found) return found;
      }
    }
    return null;
  }


  // Convert fileTree to ELEMENTS format for magicui Tree
  function fileTreeToElements(node, idPrefix = "") {
    if (!node) return [];
    const id = idPrefix + node.path;
    if (node.type === "folder") {
      return [{
        id,
        isSelectable: true,
        name: node.name,
        children: node.children ? node.children.map(child => fileTreeToElements(child, id + "/")).flat() : [],
      }];
    } else {
      return [{
        id,
        isSelectable: true,
        name: node.name,
        path: node.path,
        encoding: node.encoding,
        content: node.content,
      }];
    }
  }
  // Convert flat file list to tree
  function buildTree(files) {
    const root = { name: repo, path: "", type: "folder", children: [] };
    for (const file of files) {
      const parts = file.path.split("/");
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: i === parts.length - 1 ? "file" : "folder",
            ...(i === parts.length - 1 ? { content: file.content, encoding: file.encoding } : {}),
            children: i === parts.length - 1 ? undefined : [],
          };
          current.children.push(child);
        }
        current = child;
      }
    }
    return root;
  }
  // Fetch files on mount
  useEffect(() => {
    async function fetchFiles() {
      setLoadingFiles(true);
      try {
        const res = await fetch(`/api/clone-repo?owner=${username}&repo=${repo}`);
        const data = await res.json();
        if (data.files) {
          setFileTree(buildTree(data.files));
        }
      } catch {
        setFileTree(null);
      }
      setLoadingFiles(false);
    }
    fetchFiles();
  }, [username, repo]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "row", background: "#1e1e1e" }}>
      <div style={{
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        background: "#181c20",
        borderRight: "1px solid #444",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        paddingTop: 16,
        boxSizing: "border-box"
      }}>
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
          <div style={{ width: 260, minWidth: 260, maxWidth: 260, background: "#181c20", borderRight: "1px solid #444", color: "#f3f4f6", padding: 12, overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ fontWeight: "bold", marginBottom: 8, color: "#fff" }}>Files</div>
            {loadingFiles && <div style={{ color: '#b3b3b3' }}>Loading files...</div>}
            {!loadingFiles && fileTree && (
              <Tree
                className="overflow-hidden rounded-md bg-[#23272e] p-2 text-[#f3f4f6] border border-[#333]"
                elements={fileTreeToElements(fileTree).flatMap(e => e.children || [])}
                initialExpandedItems={[]}
                initialSelectedId={null}
              >
                {fileTreeToElements(fileTree).flatMap(e => (e.children || [])).map(child => renderMagicTree(child, handleOpenFile))}
              </Tree>
            )}
            {!loadingFiles && !fileTree && <div style={{ color: '#b3b3b3' }}>Could not load files.</div>}
          </div>
        )}

        {activeTab === "git" && (
          <div style={{ width: 220, background: "#23272e", borderRight: "1px solid #333", color: "#ccc", padding: 12, overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>Git Changes</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ padding: "6px 0", cursor: "pointer" }}>M src/app/editor/[username]/[repo]/[uuid]/page.jsx</li>
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

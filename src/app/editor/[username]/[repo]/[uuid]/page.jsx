"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { FaFolderOpen, FaGitAlt, FaSearch } from "react-icons/fa";
import { File, Folder, Tree } from "../../../../../components/magicui/file-tree";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const MonacoDiffEditor = dynamic(() => import("@monaco-editor/react").then(mod => mod.DiffEditor), { ssr: false });

export default function EditorPage({ params }) {
  const { username, repo, uuid } = params;
  const [activeTab, setActiveTab] = useState("files");
  const [fileContent, setFileContent] = useState("// Start editing your code here\n");
  const [openFile, setOpenFile] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [originalFiles, setOriginalFiles] = useState({}); // { path: content }
  const [editedFiles, setEditedFiles] = useState({}); // { path: content }
  const [changedFiles, setChangedFiles] = useState([]); // [{ path, status }]
  const [selectedChange, setSelectedChange] = useState(null);
  const diffDecorationsRef = useRef({ original: [], modified: [], diffEditor: null, disposables: [] });
  const lastOpenFile = useRef(null);

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

  // Build a tree containing only changed files (for the Git tab)
  function buildChangedTree(changes) {
    const root = { name: repo, path: "", type: "folder", children: [] };
    for (const change of changes) {
      const parts = change.path.split("/");
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: i === parts.length - 1 ? "file" : "folder",
            status: i === parts.length - 1 ? change.status : undefined,
            children: i === parts.length - 1 ? undefined : [],
          };
          current.children.push(child);
        }
        current = child;
      }
    }
    return root;
  }

  function handleOpenChange(filepath) {
    setSelectedChange(filepath);
    // keep the Git tab active
    setActiveTab("git");
  }

  // inject CSS for diff line decorations once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('monaco-diff-decorations')) return;
    const style = document.createElement('style');
    style.id = 'monaco-diff-decorations';
    style.innerHTML = `
      .myLineAdded { background-color: rgba(16,185,129,0.12) !important; }
      .myLineRemoved { background-color: rgba(239,68,68,0.12) !important; }
      /* Monaco glyph margin specific selectors */
      .monaco-editor .glyph-margin .myGutterAdded::before { content: '+'; color: #16a34a; font-weight: 700; }
      .monaco-editor .glyph-margin .myGutterRemoved::before { content: '-'; color: #ef4444; font-weight: 700; }
      /* fallback: direct class selectors */
      .myGutterAdded::before { content: '+'; color: #16a34a; font-weight: 700; }
      .myGutterRemoved::before { content: '-'; color: #ef4444; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }, []);
  // Fetch files on mount
  useEffect(() => {
    async function fetchFiles() {
      setLoadingFiles(true);
      try {
        const res = await fetch(`/api/clone-repo?owner=${username}&repo=${repo}`);
        const data = await res.json();
        if (data.files) {
          setFileTree(buildTree(data.files));
          // Store original file contents
          const originals = {};
          for (const file of data.files) {
            let content = file.content;
            if (file.encoding === "base64") {
              try {
                content = atob(content.replace(/\n/g, ""));
              } catch {
                content = "(Could not decode file)";
              }
            }
            originals[file.path] = content;
          }
          setOriginalFiles(originals);
        }
      } catch {
        setFileTree(null);
      }
      setLoadingFiles(false);
    }
    fetchFiles();
  }, [username, repo]);

  // Detect changed files
  useEffect(() => {
    const changes = [];
    for (const path in originalFiles) {
      if (editedFiles[path] !== undefined && editedFiles[path] !== originalFiles[path]) {
        changes.push({ path, status: "modified" });
      }
    }
    for (const path in editedFiles) {
      if (originalFiles[path] === undefined) {
        changes.push({ path, status: "added" });
      }
    }
    setChangedFiles(changes);
  }, [originalFiles, editedFiles]);

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
          <div style={{ width: 320, minWidth: 320, maxWidth: 320, background: "#181c20", borderRight: "1px solid #444", color: "#f3f4f6", padding: 12, overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: "bold", color: '#fff' }}>Git Changes</div>
            </div>
            {changedFiles.length === 0 && <div style={{ color: '#888', padding: '6px 0' }}>No changes</div>}
            {changedFiles.length > 0 && (
              <Tree
                className="overflow-hidden rounded-md bg-[#23272e] p-2 text-[#f3f4f6] border border-[#333]"
                elements={fileTreeToElements(buildChangedTree(changedFiles)).flatMap(e => e.children || [])}
                initialExpandedItems={[]}
                initialSelectedId={null}
              >
                {fileTreeToElements(buildChangedTree(changedFiles)).flatMap(e => (e.children || [])).map(child => (
                  // reuse renderMagicTree but wire clicks to open change diff
                  child.children && child.children.length > 0
                    ? renderMagicTree(child, handleOpenChange)
                    : (
                      <File key={child.id} value={child.id} onClick={() => handleOpenChange(child.path)}>
                        <p style={{ color: child.status === 'added' ? '#4ade80' : child.status === 'modified' ? '#facc15' : '#f87171' }}>{child.name}</p>
                      </File>
                    )
                ))}
              </Tree>
            )}
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
                onChange={(val) => {
                  setFileContent(val);
                  if (openFile) setEditedFiles(prev => ({ ...prev, [openFile]: val }));
                }}
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
          {activeTab === "git" && !selectedChange && <div style={{ color: "#ccc", padding: 24 }}>Select a change to view diff.</div>}
          {activeTab === "git" && selectedChange && (
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ccc', background: '#23272e', padding: '8px 16px', borderBottom: '1px solid #333' }}>{selectedChange} — Diff</div>
                <div style={{ height: 'calc(100% - 40px)' }}>
                  <MonacoDiffEditor
                    height={"100%"}
                    language={selectedChange?.endsWith('.json') ? 'json' : 'javascript'}
                    original={originalFiles[selectedChange] ?? ''}
                    modified={editedFiles[selectedChange] ?? originalFiles[selectedChange] ?? ''}
                    options={{
                      renderSideBySide: true,
                      readOnly: false,
                      renderWhitespace: 'all',
                      minimap: { enabled: false },
                      renderIndicators: true,
                      lineNumbers: 'on',
                      glyphMargin: true,
                      automaticLayout: true,
                      overviewRulerLanes: 3,
                    }}
                    theme="vs-dark"
                    onMount={(diffEditor, monaco) => {
                      // store reference
                      diffDecorationsRef.current.diffEditor = diffEditor;

                      const originalModel = diffEditor.getModel().original;
                      const modifiedModel = diffEditor.getModel().modified;

                      function applyDiffDecorations() {
                        try {
                          const origLines = originalModel.getLinesContent();
                          const modLines = modifiedModel.getLinesContent();

                          // Simple line-by-line diff: mark lines that differ
                          const origDecs = [];
                          const modDecs = [];

                          const max = Math.max(origLines.length, modLines.length);
                          for (let i = 0; i < max; i++) {
                            const o = origLines[i] ?? '';
                            const m = modLines[i] ?? '';
                            if (o !== m) {
                              if (o && !m) {
                                // removed in modified
                                origDecs.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), options: { isWholeLine: true, className: 'myLineRemoved', glyphMarginClassName: 'myGutterRemoved' } });
                              } else if (!o && m) {
                                // added in modified
                                modDecs.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), options: { isWholeLine: true, className: 'myLineAdded', glyphMarginClassName: 'myGutterAdded' } });
                              } else {
                                // modified lines: show both markers
                                origDecs.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), options: { isWholeLine: true, className: 'myLineRemoved', glyphMarginClassName: 'myGutterRemoved' } });
                                modDecs.push({ range: new monaco.Range(i + 1, 1, i + 1, 1), options: { isWholeLine: true, className: 'myLineAdded', glyphMarginClassName: 'myGutterAdded' } });
                              }
                            }
                          }

                          // apply
                          diffDecorationsRef.current.original = originalModel.deltaDecorations(diffDecorationsRef.current.original, origDecs);
                          diffDecorationsRef.current.modified = modifiedModel.deltaDecorations(diffDecorationsRef.current.modified, modDecs);
                        } catch (e) {
                          // ignore
                        }
                      }

                      // initial apply
                      applyDiffDecorations();

                      // re-apply when models change
                      const d1 = originalModel.onDidChangeContent(() => applyDiffDecorations());
                      const d2 = modifiedModel.onDidChangeContent(() => applyDiffDecorations());
                      diffDecorationsRef.current.disposables = [d1, d2];
                    }}
                  />
                </div>
              </div>
            </div>
          )}
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

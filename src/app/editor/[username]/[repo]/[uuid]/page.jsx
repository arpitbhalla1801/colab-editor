"use client";
import dynamic from "next/dynamic";
import React, { useState, useEffect, useRef } from "react";
import { FaFolderOpen, FaGitAlt, FaSearch } from "react-icons/fa";
import { File, Folder, Tree } from "../../../../../components/magicui/file-tree";

// Dynamically import Monaco Editor components to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const MonacoDiffEditor = dynamic(() => import("@monaco-editor/react").then(mod => mod.DiffEditor), { ssr: false });

// --- Helper Components (moved outside the main component) ---

function SidebarTabButton({ active, icon, ...props }) {
  return (
    <button
      {...props}
      style={{
        background: "transparent",
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
        transition: "border-right 0.2s, color 0.2s",
      }}
    >
      {icon}
    </button>
  );
}

function SearchReplacePanel({ openFile, fileContent, setFileContent, setEditedFiles, jumpToLine, openFileInTab }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [replaceTerm, setReplaceTerm] = React.useState("");
  const [matches, setMatches] = React.useState([]);
  const [replaceCount, setReplaceCount] = React.useState(0);
  const [matchPreviews, setMatchPreviews] = React.useState([]);

  useEffect(() => {
    if (!searchTerm || !fileContent) {
      setMatches([]);
      setMatchPreviews([]);
      return;
    }
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'gi');
    const found = [];
    const previews = [];
    let match;
    // Split file into lines for preview
    const lines = fileContent.split(/\r?\n/);
    let lastIndex = 0;
    lines.forEach((line, idx) => {
      let lineOffset = 0;
      let lineCopy = line;
      while ((match = regex.exec(line)) !== null) {
        found.push({ index: lastIndex + match.index, length: match[0].length });
        // Preview: show line number and highlight match
        const preview = lineCopy.length > 120 ? lineCopy.slice(0, 120) + '...' : lineCopy;
        previews.push({
          line: idx + 1,
          preview,
          matchStart: match.index,
          matchLength: match[0].length
        });
        // Prevent infinite loop for zero-length matches
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }
      lastIndex += line.length + 1; // +1 for newline
    });
    setMatches(found);
    setMatchPreviews(previews);
  }, [searchTerm, fileContent]);

  function handleReplaceAll() {
    if (!searchTerm) return;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'gi');
    const replaced = fileContent.replace(regex, replaceTerm);
    setFileContent(replaced);
    setEditedFiles(prev => (openFile ? { ...prev, [openFile]: replaced } : prev));
    setReplaceCount(matches.length || 0);
    setTimeout(() => setReplaceCount(0), 2000);
  }

  return (
    <div style={{ background: '#23272e', padding: 16, borderRadius: 8, border: '1px solid #333', color: '#eee' }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Find:</label>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ background: '#181c20', color: '#fff', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', width: 220 }}
          placeholder="Search text..."
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Replace:</label>
        <input
          type="text"
          value={replaceTerm}
          onChange={e => setReplaceTerm(e.target.value)}
          style={{ background: '#181c20', color: '#fff', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', width: 220 }}
          placeholder="Replacement text..."
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={handleReplaceAll}
          disabled={!searchTerm || !matches.length}
          style={{
            background: matches.length ? '#007acc' : '#444',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '6px 16px',
            cursor: matches.length ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            marginRight: 12,
          }}
        >
          Replace All
        </button>
        <span style={{ color: matches.length ? '#4ade80' : '#888' }}>{matches.length} match{matches.length === 1 ? '' : 'es'}</span>
        {replaceCount > 0 && <span style={{ color: '#facc15', marginLeft: 16 }}>{replaceCount} replaced!</span>}
      </div>
      {/* Show match previews if searching and matches found */}
      {searchTerm && matchPreviews.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', background: '#181c20', borderRadius: 4, border: '1px solid #333', marginTop: 12, padding: 8 }}>
          <div style={{ color: '#aaa', fontSize: 13, marginBottom: 4 }}>Matches found:</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {matchPreviews.map((m, i) => (
              <li
                key={i}
                style={{ marginBottom: 6, color: '#eee', fontSize: 13, cursor: 'pointer', borderRadius: 3, padding: '2px 4px', transition: 'background 0.15s' }}
                onClick={() => {
                  if (openFileInTab) openFileInTab();
                  setTimeout(() => {
                    if (jumpToLine) jumpToLine(m.line, m.matchStart + 1);
                  }, 0);
                }}
                title={`Jump to line ${m.line}`}
                tabIndex={0}
                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && jumpToLine) jumpToLine(m.line, m.matchStart + 1); }}
              >
                <span style={{ color: '#4ade80', fontWeight: 500 }}>Line {m.line}:</span> {m.preview.slice(0, m.matchStart)}<span style={{ background: '#facc15', color: '#23272e', borderRadius: 2, padding: '0 2px' }}>{m.preview.slice(m.matchStart, m.matchStart + m.matchLength)}</span>{m.preview.slice(m.matchStart + m.matchLength)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


// --- Main Page Component ---

export default function EditorPage({ params: paramsPromise }) {
  const params = React.use(paramsPromise);
  const { username, repo, uuid } = params;

  // State Management
  const [activeTab, setActiveTab] = useState("files");
  const [openFile, setOpenFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [originalFiles, setOriginalFiles] = useState({}); // { path: content }
  const [editedFiles, setEditedFiles] = useState({}); // { path: content }
  const [changedFiles, setChangedFiles] = useState([]); // [{ path, status }]
  const [selectedChange, setSelectedChange] = useState(null);

  // --- File and Tree Logic ---

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

  async function handleOpenFile(filepath) {
    if (openFile === filepath) return;

    setOpenFile(filepath);
    setSelectedChange(null); // Close diff view when opening a file

    const contentFromEdits = editedFiles[filepath];
    if (contentFromEdits !== undefined) {
      setFileContent(contentFromEdits);
      return;
    }

    const contentFromOriginals = originalFiles[filepath];
    if (contentFromOriginals !== undefined) {
      setFileContent(contentFromOriginals);
      return;
    }

    setFileContent("(Could not load file content)");
  }
  
  function buildTree(files) {
    const root = { name: repo, path: "", type: "folder", children: [] };
    for (const file of files) {
      const parts = file.path.split("/");
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          const isFile = i === parts.length - 1;
          child = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: isFile ? "file" : "folder",
            ...(isFile ? { content: file.content, encoding: file.encoding } : {}),
            children: isFile ? undefined : [],
          };
          current.children.push(child);
        }
        current = child;
      }
    }
    return root;
  }
  
  // Recursively render Folder/File for magicui Tree
  function renderMagicTree(element) {
    if (!element) return null;
    if (element.children && element.children.length > 0) {
      return (
        <Folder key={element.path} value={element.path} element={element.name}>
          {element.children.map(child => renderMagicTree(child))}
        </Folder>
      );
    }
    return (
      <File key={element.path} value={element.path} onClick={() => handleOpenFile(element.path)}>
        <p>{element.name}</p>
      </File>
    );
  }

  // --- Git / Change Tracking Logic ---
  
  function handleOpenChange(filepath) {
    setSelectedChange(filepath);
    setOpenFile(null);
  }
  
  function handleRevertChange(filePath) {
    setEditedFiles(prev => {
      const updated = { ...prev };
      delete updated[filePath]; // Reverting means removing it from the edited list
      return updated;
    });

    if (openFile === filePath) {
      setFileContent(originalFiles[filePath] || "");
    }
    
    setSelectedChange(null);
  }

  // --- Language Detection ---

  function getMonacoLanguage(filename) {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      json: 'json', css: 'css', scss: 'scss', less: 'less', html: 'html',
      md: 'markdown', py: 'python', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp',
      go: 'go', sh: 'shell', xml: 'xml', yml: 'yaml', yaml: 'yaml', php: 'php',
      rb: 'ruby', rs: 'rust', sql: 'sql', swift: 'swift',
    };
    return languageMap[ext] || 'plaintext';
  }

  // --- Effects ---

  useEffect(() => {
    async function fetchFiles() {
      setLoadingFiles(true);
      try {
        const res = await fetch(`/api/clone-repo?owner=${username}&repo=${repo}`);
        const data = await res.json();
        if (data.files) {
          setFileTree(buildTree(data.files));
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
      } catch (error) {
        console.error("Failed to fetch files:", error);
        setFileTree(null);
      }
      setLoadingFiles(false);
    }
    fetchFiles();
  }, [username, repo]);

  useEffect(() => {
    const changes = [];
    const allFilePaths = new Set([...Object.keys(originalFiles), ...Object.keys(editedFiles)]);
    
    allFilePaths.forEach(path => {
      const original = originalFiles[path];
      const edited = editedFiles[path];

      if (original === undefined && edited !== undefined) {
        changes.push({ path, status: "added" });
      } else if (original !== undefined && edited !== undefined && original !== edited) {
        changes.push({ path, status: "modified" });
      }
    });

    setChangedFiles(changes);
  }, [originalFiles, editedFiles]);
  

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "row", background: "#1e1e1e" }}>
      {/* Icon Sidebar */}
      <div style={{ width: 56, background: "#181c20", borderRight: "1px solid #444", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
        <SidebarTabButton active={activeTab === "files"} onClick={() => setActiveTab("files")} icon={<FaFolderOpen />} />
        <SidebarTabButton active={activeTab === "git"} onClick={() => setActiveTab("git")} icon={<FaGitAlt />} />
        <SidebarTabButton active={activeTab === "search"} onClick={() => setActiveTab("search")} icon={<FaSearch />} />
      </div>

      {/* Side Panel (File Tree or Changes List) */}
      <div style={{ width: 280, background: "#181c20", borderRight: "1px solid #444", color: "#f3f4f6", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {activeTab === "files" && (
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: "bold", marginBottom: 8, color: "#fff" }}>Files</div>
            {loadingFiles && <div style={{ color: '#b3b3b3' }}>Loading files...</div>}
            {!loadingFiles && fileTree && (
              <Tree
                className="overflow-hidden rounded-md bg-[#23272e] p-2 text-[#f3f4f6] border border-[#333]"
                initialExpandedItems={[]}
                initialSelectedId={null}
              >
                {fileTree.children.map(child => renderMagicTree(child))}
              </Tree>
            )}
            {!loadingFiles && !fileTree && <div style={{ color: '#b3b3b3' }}>Could not load files.</div>}
          </div>
        )}
        
        {activeTab === "git" && (
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#fff' }}>Changed Files</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {changedFiles.length === 0 ? (
                <li style={{ color: '#888', padding: '8px 4px' }}>No changes detected.</li>
              ) : (
                changedFiles.map(file => (
                  <li
                    key={file.path}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      borderRadius: 4,
                      background: selectedChange === file.path ? '#2a2d34' : 'transparent',
                    }}
                    onClick={() => handleOpenChange(file.path)}
                    title={file.path}
                  >
                    {file.status === 'added' && <span style={{ color: '#4ade80', marginRight: '8px', fontWeight: 'bold' }}>A</span>}
                    {file.status === 'modified' && <span style={{ color: '#facc15', marginRight: '8px', fontWeight: 'bold' }}>M</span>}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path.split('/').pop()}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Main Content Area (Editor, Diff, Search) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "files" && (
          openFile ? (
            <>
              <div style={{ color: "#ccc", background: "#23272e", padding: "8px 16px", borderBottom: "1px solid #333", flexShrink: 0 }}>
                {openFile}
              </div>
              <MonacoEditor
                height="100%"
                language={getMonacoLanguage(openFile)}
                value={fileContent}
                onChange={(val) => {
                  setFileContent(val);
                  setEditedFiles((prev) => ({ ...prev, [openFile]: val }));
                }}
                theme="vs-dark"
                options={{ fontSize: 14, minimap: { enabled: false } }}
                editorDidMount={(editor) => {
                  window._monacoEditor = editor;
                }}
              />
            </>
          ) : (
            <div style={{ color: "#ccc", padding: 24, textAlign: 'center', alignSelf: 'center' }}>Select a file to begin editing.</div>
          )
        )}

        {activeTab === "git" && (
          selectedChange ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #333', background: '#23272e', flexShrink: 0 }}>
                <span style={{ color: '#ccc' }}>{selectedChange} — Diff</span>
                <button
                  style={{ background: '#5a2d2d', border: '1px solid #f87171', color: '#f87171', cursor: 'pointer', fontSize: '13px', borderRadius: '4px', padding: '4px 12px' }}
                  onClick={() => handleRevertChange(selectedChange)}
                >
                  Revert
                </button>
              </div>
              <MonacoDiffEditor
                height="100%"
                language={getMonacoLanguage(selectedChange)}
                original={originalFiles[selectedChange] ?? ''}
                modified={editedFiles[selectedChange] ?? originalFiles[selectedChange] ?? ''}
                options={{ renderSideBySide: true, readOnly: false, minimap: { enabled: false } }}
                theme="vs-dark"
              />
            </div>
          ) : (
            <div style={{ color: "#ccc", padding: 24, textAlign: 'center', alignSelf: 'center' }}>Select a changed file to view the diff.</div>
          )
        )}

        {activeTab === "search" && (
          <div style={{ color: "#ccc", padding: 24 }}>
            <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Search & Replace</div>
            <SearchReplacePanel
              openFile={openFile}
              fileContent={fileContent}
              setFileContent={setFileContent}
              setEditedFiles={setEditedFiles}
              jumpToLine={(line, column) => {
                if (window._monacoEditor) {
                  window._monacoEditor.revealPositionInCenter({ lineNumber: line, column });
                  window._monacoEditor.setPosition({ lineNumber: line, column });
                  window._monacoEditor.focus();
                }
              }}
              openFileInTab={() => {
                // Switch to files tab if not already
                if (typeof setActiveTab === 'function') setActiveTab('files');
                // If not open, open the file (simulate click)
                if (!openFile && typeof setOpenFile === 'function') setOpenFile(openFile);
              }}
            />
            {!openFile && <div style={{ color: '#888', marginTop: 24 }}>Open a file to search and replace its content.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
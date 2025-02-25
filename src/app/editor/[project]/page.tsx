"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export default function EditorPage() {
  const { project } = useParams();
  const [text, setText] = useState("");
  const [yText, setYText] = useState<Y.Text | null>(null);

  useEffect(() => {
    
    const doc = new Y.Doc();

    
    const provider = new WebsocketProvider(
      "wss://demos.yjs.dev",
      `project-${project}`,
      doc
    );

    
    const sharedText = doc.getText("content");

    
    setText(sharedText.toString());
    setYText(sharedText);

    
    sharedText.observe(() => {
      setText(sharedText.toString());
    });

    return () => {
      provider.disconnect();
      doc.destroy();
    };
  }, [project]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (yText) {
      yText.delete(0, yText.length);
      yText.insert(0, e.target.value);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Editing: {project}</h1>
      <textarea
        className="w-full h-64 border rounded p-2"
        value={text}
        onChange={handleChange}
        placeholder="Start typing..."
      />
    </div>
  );
}

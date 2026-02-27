import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "../services/socket";

export default function EditorPage() {
  const { roomId } = useParams();
  const [code, setCode] = useState("");
  const [versions, setVersions] = useState([]);
  const editorRef = useRef(null);
  const decorationsRef = useRef({});

  // ==============================
  // 🔹 JOIN ROOM + SOCKET LISTENERS
  // ==============================
  useEffect(() => {
    socket.emit("join_room", roomId);

    socket.on("load_code", (data) => setCode(data));
    socket.on("receive_code", (data) => setCode(data));
    socket.on("receive_cursor", handleReceiveCursor);

    fetchVersions(); // load versions on mount

    return () => {
      socket.off("load_code");
      socket.off("receive_code");
      socket.off("receive_cursor");
    };
  }, [roomId]);

  // ==============================
  // 🔹 FETCH VERSIONS
  // ==============================
  const fetchVersions = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/rooms/versions/${roomId}`
      );
      const data = await res.json();
      setVersions(data.reverse()); // newest first
    } catch (err) {
      console.error("Fetch Versions Error:", err);
    }
  };

  // ==============================
  // 🔹 HANDLE CODE CHANGE
  // ==============================
  const handleChange = (value) => {
    setCode(value);
    socket.emit("code_change", { roomId, code: value });
  };

  // ==============================
  // 🔹 SAVE VERSION
  // ==============================
  const handleSaveVersion = () => {
    socket.emit("save_version", { roomId, code });
    fetchVersions();
  };

  // ==============================
  // 🔹 RESTORE VERSION
  // ==============================
  const handleRestoreVersion = (versionCode) => {
    socket.emit("restore_version", {
      roomId,
      code: versionCode
    });
  };

  // ==============================
  // 🔹 EDITOR MOUNT
  // ==============================
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      socket.emit("cursor_move", {
        roomId,
        position: e.position,
        userId: socket.id,
        username: "User_" + socket.id.slice(0, 4)
      });
    });
  };

  // ==============================
  // 🔹 HANDLE REMOTE CURSOR
  // ==============================
  const handleReceiveCursor = ({ position, userId, username }) => {
    if (!editorRef.current) return;
    if (userId === socket.id) return;

    const monaco = window.monaco;

    const decoration = {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + 1
      ),
      options: {
        className: "remote-cursor",
        hoverMessage: { value: username }
      }
    };

    const oldDecorations = decorationsRef.current[userId] || [];
    const newDecorations = editorRef.current.deltaDecorations(
      oldDecorations,
      [decoration]
    );

    decorationsRef.current[userId] = newDecorations;
  };

  // ==============================
  // 🔹 UI LAYOUT
  // ==============================
  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* LEFT - EDITOR */}
      <div style={{ width: "75%" }}>
        <div style={{ padding: "10px", background: "#1e1e1e" }}>
          <button
            onClick={handleSaveVersion}
            style={{
              padding: "8px 12px",
              background: "#007acc",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
          >
            Save Version
          </button>
        </div>

        <Editor
          height="90%"
          language="javascript"
          value={code}
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleEditorDidMount}
        />
      </div>

      {/* RIGHT - VERSION HISTORY */}
      <div
        style={{
          width: "25%",
          background: "#2d2d2d",
          color: "white",
          padding: "15px",
          overflowY: "auto",
          borderLeft: "1px solid #444"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Version History</h3>

        {versions.length === 0 && (
          <p style={{ fontSize: "14px", opacity: 0.6 }}>
            No versions saved yet.
          </p>
        )}

        {versions.map((version, index) => (
          <div
            key={index}
            onClick={() => handleRestoreVersion(version.code)}
            style={{
              padding: "10px",
              marginBottom: "8px",
              background: "#3a3a3a",
              cursor: "pointer",
              borderRadius: "4px"
            }}
          >
            {new Date(version.savedAt).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
}
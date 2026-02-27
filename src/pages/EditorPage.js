import { useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "../services/socket";

export default function EditorPage() {
  const { roomId } = useParams();

  const [code, setCode] = useState("");
  const [versions, setVersions] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const editorRef = useRef(null);
  const decorationsRef = useRef({});

  // ===============================
  // 🔹 COPY INVITE LINK
  // ===============================
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Invite link copied!");
  };

  // ===============================
  // 🔹 RUN CODE
  // ===============================
  const runCode = async () => {
    try {
      setRunning(true);
      setOutput("Running...");

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        }
      );

      const data = await res.json();
      setOutput(data.output);
    } catch (err) {
      setOutput("Execution failed.");
    } finally {
      setRunning(false);
    }
  };

  // ===============================
  // 🔹 FETCH VERSIONS
  // ===============================
  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rooms/versions/${roomId}`
      );
      const data = await res.json();
      setVersions(data.reverse());
    } catch (err) {
      console.error(err);
    }
  }, [roomId]);

  // ===============================
  // 🔹 HANDLE REMOTE CURSOR
  // ===============================
  const handleReceiveCursor = useCallback(
    ({ position, userId, username }) => {
      if (!editorRef.current || !window.monaco) return;
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
    },
    []
  );

  // ===============================
  // 🔹 SOCKET LISTENERS
  // ===============================
  useEffect(() => {
    socket.emit("join_room", roomId);

    socket.on("load_code", setCode);
    socket.on("receive_code", setCode);
    socket.on("receive_cursor", handleReceiveCursor);
    socket.on("active_users", setActiveUsers);

    fetchVersions();

    return () => {
      socket.off("load_code");
      socket.off("receive_code");
      socket.off("receive_cursor");
      socket.off("active_users");
    };
  }, [roomId, fetchVersions, handleReceiveCursor]);

  // ===============================
  // 🔹 CODE CHANGE
  // ===============================
  const handleChange = (value) => {
    setCode(value || "");
    socket.emit("code_change", { roomId, code: value });
  };

  // ===============================
  // 🔹 SAVE VERSION
  // ===============================
  const handleSaveVersion = () => {
    socket.emit("save_version", { roomId, code });
    fetchVersions();
  };

  // ===============================
  // 🔹 RESTORE VERSION
  // ===============================
  const handleRestoreVersion = (versionCode) => {
    socket.emit("restore_version", { roomId, code: versionCode });
  };

  // ===============================
  // 🔹 EDITOR MOUNT
  // ===============================
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

  // ===============================
  // 🔹 UI
  // ===============================
  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* LEFT SIDE */}
      <div style={{ width: "75%", display: "flex", flexDirection: "column" }}>

        {/* TOP BAR */}
        <div
          style={{
            padding: "10px",
            background: "#1e1e1e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ color: "white" }}>
            Room ID: <strong>{roomId}</strong>
          </div>

          <div>
            <button
              onClick={runCode}
              disabled={running}
              style={{
                padding: "6px 12px",
                background: "#ff9800",
                color: "white",
                border: "none",
                marginRight: "8px"
              }}
            >
              {running ? "Running..." : "Run Code"}
            </button>

            <button
              onClick={handleSaveVersion}
              style={{
                padding: "6px 12px",
                background: "#007acc",
                color: "white",
                border: "none",
                marginRight: "8px"
              }}
            >
              Save Version
            </button>

            <button
              onClick={copyLink}
              style={{
                padding: "6px 12px",
                background: "#28a745",
                color: "white",
                border: "none"
              }}
            >
              Copy Invite Link
            </button>
          </div>
        </div>

        {/* EDITOR */}
        <div style={{ height: "70%" }}>
          <Editor
            height="100%"
            language="javascript"
            value={code}
            theme="vs-dark"
            onChange={handleChange}
            onMount={handleEditorDidMount}
          />
        </div>

        {/* OUTPUT PANEL */}
        <div
          style={{
            height: "30%",
            background: "#111",
            color: "#0f0",
            padding: "10px",
            overflowY: "auto",
            fontFamily: "monospace"
          }}
        >
          <strong>Output:</strong>
          <pre>{output}</pre>
        </div>
      </div>

      {/* RIGHT SIDE */}
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
        <h3>Active Users</h3>
        {activeUsers.map((user) => (
          <div key={user.id} style={{ marginBottom: "6px" }}>
            🟢 {user.username}
          </div>
        ))}

        <hr style={{ margin: "15px 0" }} />

        <h3>Version History</h3>
        {versions.map((version, index) => (
          <div
            key={index}
            onClick={() => handleRestoreVersion(version.code)}
            style={{
              padding: "8px",
              background: "#3a3a3a",
              marginBottom: "6px",
              cursor: "pointer"
            }}
          >
            {new Date(version.savedAt).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const createRoom = () => {
    const id = uuidv4().slice(0, 8);
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) {
      alert("Enter Room ID");
      return;
    }
    navigate(`/room/${roomId.trim()}`);
  };

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "150px",
        color: "white"
      }}
    >
      <h1>🚀 Collaborative Code Editor</h1>

      <button
        onClick={createRoom}
        style={{
          padding: "10px 20px",
          margin: "10px",
          cursor: "pointer"
        }}
      >
        Create Room
      </button>

      <div style={{ marginTop: "20px" }}>
        <input
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ padding: "8px" }}
        />

        <button
          onClick={joinRoom}
          style={{
            padding: "8px 15px",
            marginLeft: "5px",
            cursor: "pointer"
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
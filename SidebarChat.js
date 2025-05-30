import React, { useEffect, useState } from "react";
import './SidebarChat.css';
import { Avatar } from "@mui/material";
import { Link } from "react-router-dom";

const SidebarChat = ({ id, name, lastMessageText }) => {
  const [seed, setSeed] = useState("");

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 5000));
  }, []);

  // Troncamento messaggio
  const truncateMessage = (text, maxLength = 30) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Link to={`/rooms/${id}`}>
      <div className="sidebarChat">
<Avatar
  src={`https://avatars.dicebear.com/api/human/${seed}.svg`}
  onError={(e) => {
    e.currentTarget.src = "/default-avatar.png"; // metti un'immagine nella tua cartella public/
  }}
/>

        <div className="sidebarChat_info">
          <h2>{name} <span className="Chat-number">#{seed}</span></h2>
          <p>{truncateMessage(lastMessageText)}</p>
        </div>
      </div>
    </Link>
  );
};

export default SidebarChat;








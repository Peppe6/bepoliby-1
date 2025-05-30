
import React, { useEffect, useState } from "react";
import './SidebarChat.css';
import { Avatar } from "@mui/material";
import { Link } from "react-router-dom";

const SidebarChat = ({ id, name, lastMessageText }) => {
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (name) {
      const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
      setAvatarUrl(url);
    }
  }, [name]);

  // Troncamento messaggio
  const truncateMessage = (text, maxLength = 30) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Link to={`/rooms/${id}`}>
      <div className="sidebarChat">
        <Avatar
          src={avatarUrl}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/default-avatar.png";
          }}
        />
        <div className="sidebarChat_info">
          <h2>{name}</h2>
          <p>{truncateMessage(lastMessageText)}</p>
        </div>
      </div>
    </Link>
  );
};

export default SidebarChat;







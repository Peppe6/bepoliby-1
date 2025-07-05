

import React from "react";
import './SidebarChat.css';
import { Avatar } from "@mui/material";
import { Link } from "react-router-dom";

const SidebarChat = ({ id, name, lastMessageText, avatarSrc, selected }) => {
  const truncateMessage = (text, maxLength = 30) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const avatarUrl = avatarSrc || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  return (
    <Link to={`/rooms/${id}`} className={`sidebarChat ${selected ? 'sidebarChat_selected' : ''}`}>
      <Avatar src={avatarUrl} alt={name} />
      <div className="sidebarChat_info">
        <h2>{name}</h2>
        <p>{truncateMessage(lastMessageText)}</p>
      </div>
    </Link>
  );
};

export default SidebarChat;



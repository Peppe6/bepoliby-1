import React, { useState } from "react";
import './SidebarChat.css';
import { Avatar } from "@mui/material";
import { Link } from "react-router-dom";

const SidebarChat = ({ id, name, lastMessageText, avatarSrc, selected }) => {
  const [avatarError, setAvatarError] = useState(false);

  const truncateMessage = (text, maxLength = 30) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const defaultAvatar = "/fotoprofilo.png";
  const avatarUrl = (!avatarSrc || avatarError) ? defaultAvatar : avatarSrc;
  const displayLetter = name?.[0]?.toUpperCase() || "?";

  return (
    <Link to={`/rooms/${id}`} className={`sidebarChat ${selected ? 'sidebarChat_selected' : ''}`}>
      <Avatar
        src={avatarUrl}
        alt={`Avatar di ${name}`}
        onError={() => setAvatarError(true)}
      >
        {/* Mostra la lettera solo se non c’è avatar o se l’immagine è fallita */}
        {(!avatarSrc || avatarError) && displayLetter}
      </Avatar>
      <div className="sidebarChat_info">
        <h2>{name || "Utente"}</h2>
        <p>{truncateMessage(lastMessageText)}</p>
      </div>
    </Link>
  );
};

export default SidebarChat;


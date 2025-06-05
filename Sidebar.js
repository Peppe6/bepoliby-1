import React, { useEffect, useState } from "react";
import './Sidebar.css';
import ChatBubbleIcon from "@mui/icons-material/Chat";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterTiltShiftIcon from '@mui/icons-material/FilterTiltShift';
import SearchIcon from '@mui/icons-material/Search';
import { Avatar, IconButton } from "@mui/material";
import SidebarChat from './SidebarChat';
import axios from 'axios';
import { useStateValue } from '../StateProvider';

const Sidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [{ user }] = useStateValue();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:9000/api/v1/rooms");
        setRooms(response.data);
      } catch (error) {
        console.error("❌ Errore nel caricamento delle stanze:", error);
      }
    };

    fetchRooms();
  }, []);

  const createChat = async () => {
    const roomName = prompt("Inserisci un nome per la Chat!");
    if (roomName && roomName.trim()) {
      try {
        const response = await axios.post("http://127.0.0.1:9000/api/v1/rooms", {
          name: roomName.trim(),
        });
        setRooms(prev => [...prev, response.data]);
      } catch (error) {
        console.error("❌ Errore nella creazione della stanza:", error);
      }
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar_header">
        <div className="sidebar_header_left">
          <IconButton>
            <Avatar src={user?.photoURL || 'https://assets.gazzettadelsud.it/2019/01/Adrian-4.jpeg'} />
          </IconButton>
          <span>{user?.displayName || "Utente"}</span>
        </div>
        <div className="sidebar_header_right">
          <IconButton><FilterTiltShiftIcon /></IconButton>
          <IconButton><ChatBubbleIcon /></IconButton>
          <IconButton><MoreVertIcon /></IconButton>
        </div>
      </div>

      <div className="sidebar_search">
        <div className="sidebar_search_container">
          <SearchIcon />
          <input type="text" placeholder="Cerca o inizia una nuova chat" />
        </div>
      </div>

      <div className="sidebar_chats">
        <div onClick={createChat} className="sidebarChat addNewChat">
          <h3>➕ Aggiungi nuova chat</h3>
        </div>

        {rooms.map((room) => {
          const messages = room.messages || [];
          const lastMessage = messages[messages.length - 1]?.message || "";

          return (
            <SidebarChat
              key={room._id}
              id={room._id}
              name={room.name}
              lastMessageText={lastMessage}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;



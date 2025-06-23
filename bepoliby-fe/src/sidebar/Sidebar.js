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

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Sidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [{ user }] = useStateValue();
  const [allUsers, setAllUsers] = useState({});

  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/rooms`, {
          withCredentials: true,
        });
        setRooms(response.data);
      } catch (error) {
        console.error("Errore nel caricamento delle stanze:", error.response?.status, error.response?.data);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/users`, {
          withCredentials: true,
        });
        const usersMap = {};
        res.data.forEach(u => { usersMap[u.uid] = u.nome || u.username; });
        setAllUsers(usersMap);
      } catch (err) {
        console.error("Errore nel caricamento utenti:", err);
      }
    };

    fetchRooms();
    fetchUsers();
  }, [user]);

  const createChat = async () => {
    if (!user) {
      alert("Non sei autenticato. Effettua il login.");
      return;
    }

    const emailAltroUtente = prompt("Inserisci l'email dell'altro utente");
    if (!emailAltroUtente) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/users/email/${emailAltroUtente}`, {
        withCredentials: true,
      });

      const altroUtente = res.data;
      const membri = [user.uid, altroUtente.uid];

      const roomName = `${user.nome} - ${altroUtente.nome || altroUtente.username}`;

      const roomRes = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      }, {
        withCredentials: true,
      });

      setRooms(prev => [...prev, roomRes.data]);
    } catch (err) {
      console.error("Errore nella creazione della chat:", err.response?.data || err.message);
      alert("Errore nella creazione della chat.");
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar_header">
        <div className="sidebar_header_left">
          <IconButton>
            <Avatar src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nome || "Utente")}`} />
          </IconButton>
          <span>{user?.nome || "Utente"}</span>
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
          <input
            type="text"
            placeholder="Cerca o inizia una nuova chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar_chats">
        <div onClick={createChat} className="sidebarChat addNewChat" style={{ cursor: 'pointer' }}>
          <h3>➕ Inizia una nuova chat</h3>
        </div>

        {rooms
          .filter(room =>
            room.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(room => {
            const messages = room.messages || [];
            const lastMessage = messages[messages.length - 1]?.message || "";

            const otherUserUid = (room.members || []).find(uid => uid !== user.uid);
            const displayName = otherUserUid ? (allUsers[otherUserUid] || room.name) : room.name;

            return (
              <SidebarChat
                key={room._id}
                id={room._id}
                name={displayName}
                lastMessageText={lastMessage}
              />
            );
          })}
      </div>
    </div>
  );
};

export default Sidebar;








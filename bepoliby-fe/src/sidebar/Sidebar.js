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
    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/rooms`, {
          headers: {
            Authorization: `Bearer ${user?.token || ''}`
          }
        });
        setRooms(response.data);
      } catch (error) {
        console.error("Errore nel caricamento delle stanze:", error.response?.status, error.response?.data);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/users`, {
          headers: {
            Authorization: `Bearer ${user?.token || ''}`
          }
        });
        const usersMap = {};
        res.data.forEach(u => { usersMap[u.uid] = u.nome || u.username; });
        setAllUsers(usersMap);
      } catch (err) {
        console.error("Errore nel caricamento utenti:", err);
      }
    };

    if (user?.token) {
      fetchRooms();
      fetchUsers();
    }
  }, [user?.token]);

  const createChat = async () => {
    const emailAltroUtente = prompt("Inserisci l'email dell'altro utente");
    if (!emailAltroUtente) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/users/email/${emailAltroUtente}`, {
        headers: {
          Authorization: `Bearer ${user?.token || ''}`
        }
      });

      const altroUtente = res.data;
      const membri = [user.uid, altroUtente.uid];

      const roomName = `${user.displayName} - ${altroUtente.nome || altroUtente.username}`;

      const roomRes = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      }, {
        headers: {
          Authorization: `Bearer ${user?.token || ''}`
        }
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

            // Se la stanza ha solo due membri, mostra il nome dell'altro
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






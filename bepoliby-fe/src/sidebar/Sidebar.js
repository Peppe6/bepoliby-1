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
import UserSearch from './UserSearch';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com";

const Sidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [{ user, token }] = useStateValue();
  const [allUsers, setAllUsers] = useState({});

  useEffect(() => {
    axios.defaults.withCredentials = true;
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/rooms`);
        setRooms(response.data);
      } catch (error) {
        console.error("❌ Errore nel caricamento stanze:", error.response?.data || error.message);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/users`);
        const usersMap = {};
        res.data.forEach(u => {
          usersMap[u.id] = u.nome || u.username;
        });
        setAllUsers(usersMap);
      } catch (err) {
        console.error("❌ Errore nel caricamento utenti:", err.response?.data || err.message);
      }
    };

    fetchRooms();
    fetchUsers();
  }, [user]);

  const handleUserSelect = async (selectedUser) => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      alert("Devi effettuare il login per iniziare una chat.");
      return;
    }

    if (!selectedUser?.id) {
      alert("Errore: utente selezionato non valido.");
      return;
    }

    try {
      const membri = [currentUserId, selectedUser.id];
      const roomName = `${user.nome} - ${selectedUser.nome || selectedUser.username}`;

      const res = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      });

      if (res.data?.id || res.data?._id) {
        const roomId = res.data.id || res.data._id;
        window.location.href = `/rooms/${roomId}`;
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.roomId) {
        window.location.href = `/rooms/${data.roomId}`;
      } else {
        console.error("Errore creazione chat:", err);
        alert("Errore nella creazione chat");
      }
    }
  };

  if (!user) {
    return <div className="sidebar_loading">Caricamento utente...</div>;
  }

  if (!user.id) {
    return <div className="sidebar_loading">Utente non autenticato</div>;
  }

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
            placeholder="Cerca chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar_usersearch">
        <h4>Inizia una nuova chat</h4>
        <UserSearch currentUserId={user.id} onSelect={handleUserSelect} />
      </div>

      <div className="sidebar_chats">
        {rooms
          .filter(room => {
            const otherUserId = (room.members || []).find(uid => uid !== user.id);
            const displayName = otherUserId ? (allUsers[otherUserId] || room.name) : room.name;
            return displayName.toLowerCase().includes(searchTerm.toLowerCase());
          })
          .map(room => {
            const messages = room.messages || [];
            const lastMessage = messages[messages.length - 1]?.message || "";

            const otherUserId = (room.members || []).find(uid => uid !== user.id);
            const displayName = otherUserId ? (allUsers[otherUserId] || room.name) : room.name;

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


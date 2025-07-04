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
    if (!user?.uid) return; // evita chiamate se user non pronto

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
          usersMap[u._id] = u.nome || u.username;
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
    if (!user?.uid) {
      alert("Devi effettuare il login per iniziare una chat.");
      return;
    }

    try {
      const membri = [user.uid, selectedUser._id];
      const roomName = `${user.nome} - ${selectedUser.nome || selectedUser.username}`;

      const res = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      });

      if (res.data?._id) {
        window.location.href = `/rooms/${res.data._id}`;
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.roomId) {
        window.location.href = `/rooms/${data.roomId}`;
      } else {
        alert("Errore nella creazione chat");
      }
    }
  };

  // Funzione per inviare messaggio automatico a un utente dato il nome
  const sendMessageToUser = async (username, message) => {
    if (!user?.uid) {
      alert("Devi effettuare il login per inviare messaggi.");
      return;
    }

    // Trova utente da allUsers
    const selectedUserEntry = Object.entries(allUsers).find(([id, nome]) => nome === username);
    if (!selectedUserEntry) {
      alert("Utente non trovato");
      return;
    }
    const [selectedUserId, selectedUserName] = selectedUserEntry;

    try {
      // 1. Crea o prendi stanza
      const membri = [user.uid, selectedUserId];
      const roomName = `${user.nome} - ${selectedUserName}`;
      const res = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      });

      const roomId = res.data._id || res.data.roomId;
      if (!roomId) throw new Error("ID stanza mancante");

      // 2. Invia messaggio nella stanza
      await axios.post(`${API_BASE_URL}/api/v1/rooms/${roomId}/messages`, {
        message,
        name: user.nome,
        timestamp: new Date().toISOString(),
        uid: user.uid
      });

      // 3. Vai alla chat
      window.location.href = `/rooms/${roomId}`;

    } catch (err) {
      alert("Errore invio messaggio: " + (err.response?.data?.message || err.message));
    }
  };

  if (!user) {
    return <div className="sidebar_loading">Caricamento utente...</div>;
  }

  if (!user.uid) {
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
        <UserSearch currentUserId={user.uid} onSelect={handleUserSelect} />
      </div>

      {/* Bottone di esempio per inviare messaggio automatico a "prova13" */}
      <div style={{ padding: '0 16px', marginBottom: 10 }}>
        <button
          onClick={() => sendMessageToUser("prova13", "Ciao, questo è un messaggio automatico!")}
          style={{ width: '100%', padding: '8px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Invia messaggio automatico a prova13
        </button>
      </div>

      <div className="sidebar_chats">
        {rooms
          .filter(room => {
            const otherUserUid = (room.members || []).find(uid => uid !== user.uid);
            const displayName = otherUserUid ? (allUsers[otherUserUid] || room.name) : room.name;
            return displayName.toLowerCase().includes(searchTerm.toLowerCase());
          })
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



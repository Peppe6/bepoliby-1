import React, { useEffect, useState, useCallback } from "react";
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

// Crea un'istanza axios dedicata con baseURL e credentials
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const Sidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [{ user, token }] = useStateValue();
  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Aggiorna il token nell'istanza axios quando cambia
  useEffect(() => {
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axiosInstance.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Funzione per fetch di stanze e utenti
  const fetchRoomsAndUsers = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    try {
      const [roomsRes, usersRes] = await Promise.all([
        axiosInstance.get('/api/v1/rooms'),
        axiosInstance.get('/api/v1/users'),
      ]);

      setRooms(roomsRes.data);

      // Mappa id -> dati utente (qui puoi salvare nome + username + avatar se vuoi)
      const usersMap = {};
      usersRes.data.forEach(u => {
        usersMap[u._id] = {
          nome: u.nome || u.username,
          username: u.username,
          profilePicUrl: u.profilePicUrl || null,
        };
      });
      setAllUsers(usersMap);

    } catch (err) {
      console.error("Errore caricamento stanze o utenti:", err.response?.data || err.message);
      setError("Errore nel caricamento. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }, [user, axiosInstance]);

  useEffect(() => {
    fetchRoomsAndUsers();
  }, [fetchRoomsAndUsers]);

  // Handle selezione utente da UserSearch
  const handleUserSelect = async (selectedUser) => {
    if (!user?.uid) {
      alert("Devi effettuare il login per iniziare una chat.");
      return;
    }

    try {
      const membri = [user.uid, selectedUser._id];
      const roomName = `${user.nome} - ${selectedUser.nome || selectedUser.username}`;

      const res = await axiosInstance.post('/api/v1/rooms', { name: roomName, members: membri });
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

  // Debounce per ricerca stanze (evita troppe rielaborazioni)
  const [filteredRooms, setFilteredRooms] = useState([]);
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRooms(rooms);
      return;
    }

    const lowerTerm = searchTerm.toLowerCase();
    const filtered = rooms.filter(room => {
      const otherUserUid = (room.members || []).find(uid => uid !== user.uid);
      const displayName = otherUserUid ? (allUsers[otherUserUid]?.nome || room.name) : room.name;
      return displayName.toLowerCase().includes(lowerTerm);
    });
    setFilteredRooms(filtered);
  }, [searchTerm, rooms, allUsers, user.uid]);

  if (loading) return <div className="sidebar_loading">Caricamento...</div>;
  if (error) return <div className="sidebar_error">{error}</div>;
  if (!user) return <div className="sidebar_loading">Utente non autenticato</div>;

  return (
    <div className="sidebar">
      <div className="sidebar_header">
        <div className="sidebar_header_left">
          <IconButton>
            <Avatar src={user.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || "Utente")}`} />
          </IconButton>
          <span>{user.nome || "Utente"}</span>
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
            autoComplete="off"
          />
        </div>
      </div>

      <div className="sidebar_usersearch">
        <h4>Inizia una nuova chat</h4>
        <UserSearch currentUserId={user.uid} onSelect={handleUserSelect} />
      </div>

      <div style={{ padding: '0 16px', marginBottom: 10 }}>
        <button
          onClick={() => alert("Implementa qui la funzione invio messaggio automatico")}
          style={{ width: '100%', padding: '8px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Invia messaggio automatico a prova13
        </button>
      </div>

      <div className="sidebar_chats">
        {filteredRooms.length === 0 ? (
          <div className="no-results">Nessuna chat trovata.</div>
        ) : (
          filteredRooms.map(room => {
            const messages = room.messages || [];
            const lastMessage = messages[messages.length - 1]?.message || "";
            const otherUserUid = (room.members || []).find(uid => uid !== user.uid);
            const userData = otherUserUid ? allUsers[otherUserUid] : null;
            const displayName = userData ? userData.nome : room.name;

            return (
              <SidebarChat
                key={room._id}
                id={room._id}
                name={displayName}
                lastMessageText={lastMessage}
                avatarUrl={userData?.profilePicUrl}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;




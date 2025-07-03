
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

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com";

const Sidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserList, setShowUserList] = useState(false);
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
    if (!user?.uid) return;

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

  const createChat = async () => {
    if (!user?.uid) {
      alert("Devi effettuare il login per iniziare una chat.");
      return;
    }

    const emailAltroUtente = prompt("Inserisci l'email dell'altro utente:");
    if (!emailAltroUtente) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/users/email/${emailAltroUtente}`);
      const altroUtente = res.data;

      const membri = [user.uid, altroUtente._id];
      const roomName = `${user.nome} - ${altroUtente.nome || altroUtente.username}`;

      const roomRes = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      });

      if (roomRes.data?._id) {
        window.location.href = `/rooms/${roomRes.data._id}`;
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.roomId) {
        window.location.href = `/rooms/${data.roomId}`;
      } else {
        alert("Errore nella creazione della chat. Assicurati che l'utente esista.");
      }
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
        {/* Pulsante per mostrare lista utenti */}
        <div className="sidebarChat addNewChat" style={{ cursor: 'pointer' }}>
          <h3 onClick={createChat}>➕ Chat tramite email</h3>
          <h4 onClick={() => setShowUserList(prev => !prev)} style={{ marginTop: "5px", color: "#007bff" }}>
            {showUserList ? "🔽 Nascondi utenti disponibili" : "💬 Mostra utenti disponibili"}
          </h4>
        </div>

        {/* Lista utenti cliccabili */}
        {showUserList && (
          <div className="sidebar_users">
            {Object.entries(allUsers).map(([uid, nome]) => {
              if (uid === user.uid) return null;

              return (
                <div
                  key={uid}
                  className="sidebarChat"
                  style={{ paddingLeft: "20px", cursor: "pointer" }}
                  onClick={async () => {
                    try {
                      const membri = [user.uid, uid];
                      const roomName = `${user.nome} - ${nome}`;

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
                  }}
                >
                  💬 {nome}
                </div>
              );
            })}
          </div>
        )}

        {/* Chat già esistenti */}
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

import React, { useEffect, useState } from "react";
import './Sidebar.css';
import SearchIcon from '@mui/icons-material/Search';
import { Avatar } from "@mui/material";
import SidebarChat from './SidebarChat';
import axios from 'axios';
import { useStateValue } from '../StateProvider';
import UserSearch from './UserSearch';
import { useParams, useNavigate } from "react-router-dom";
import Pusher from 'pusher-js';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com";
const PUSHER_KEY = "6a10fce7f61c4c88633b";
const PUSHER_CLUSTER = "eu";

const Sidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [{ user, token }] = useStateValue();
  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (!user?.uid) return;

    let pusher;
    let channel;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [roomsRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/v1/rooms`),
          axios.get(`${API_BASE_URL}/api/v1/users`),
        ]);

        setRooms(roomsRes.data);

        const usersMap = {};
        usersRes.data.forEach(u => {
          usersMap[u._id] = {
            name: u.nome || u.username || "Sconosciuto",
            profilePicUrl: u.profilePicUrl || null
          };
        });
        setAllUsers(usersMap);
      } catch (err) {
        console.error("Errore nel caricamento stanze o utenti:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: `${API_BASE_URL}/pusher/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    });

    channel = pusher.subscribe('rooms');

    channel.bind('new-message', (data) => {
      if (!data || !data.room || !data.message) return;

      const membersIds = (data.room.members || []).map(m => (typeof m === "string" ? m : m._id));
      if (!membersIds.includes(user.uid)) return;

      setRooms(prevRooms => {
        const idx = prevRooms.findIndex(r => r._id === data.room._id);

        const updatedRoom = {
          ...data.room,
          lastMessageText: data.message.message,
          lastMessageTimestamp: data.message.timestamp || new Date().toISOString(),
          members: (data.room.members || []).map(m => typeof m === 'string' ? m : m._id),
        };

        if (idx !== -1) {
          const updatedRooms = [...prevRooms];
          updatedRooms[idx] = { ...updatedRooms[idx], ...updatedRoom };
          return updatedRooms.sort((a, b) =>
            new Date(b.lastMessageTimestamp || 0) - new Date(a.lastMessageTimestamp || 0)
          );
        } else {
          return [updatedRoom, ...prevRooms];
        }
      });
    });

    return () => {
      if (pusher?.connection?.state === "connected") {
        channel.unbind_all();
        pusher.unsubscribe('rooms');
        pusher.disconnect();
      } else if (channel) {
        channel.unbind_all();
      }
    };
  }, [user, token]);

  const handleUserSelect = async (selectedUser) => {
    if (!user?.uid) {
      alert("Devi effettuare il login per iniziare una chat.");
      return;
    }

    try {
      const membri = [user.uid, selectedUser._id].sort();
      const roomName = selectedUser.nome || selectedUser.username || "Utente";

      const res = await axios.post(`${API_BASE_URL}/api/v1/rooms`, {
        name: roomName,
        members: membri
      });

      const newRoomId = res.data?._id || res.data?.roomId;
      if (newRoomId) {
        navigate(`/rooms/${newRoomId}`);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.roomId) {
        navigate(`/rooms/${data.roomId}`);
      } else {
        alert("Errore nella creazione chat: " + (data?.message || err.message));
      }
    }
  };

  if (loading) return <div className="sidebar_loading">Caricamento...</div>;
  if (!user) return <div className="sidebar_loading">Utente non autenticato</div>;

  const filteredRooms = rooms
    .filter(room => room && Array.isArray(room.members))
    .map(room => {
      const membersIds = room.members.map(m => (typeof m === "string" ? m : m._id));
      const otherUserId = membersIds.find(id => id !== user.uid);
      const otherUser = allUsers[otherUserId] || {};

      const displayName = otherUser.name || room.name || "Chat";

      // Percorso immagine di default in public/fotoprofilo.png
      const avatarSrc = otherUser.profilePicUrl || "/fotoprofilo.png";

      const lastMessage = room.lastMessageText || (room.messages?.length && room.messages.at(-1)?.message) || "";

      return { room, displayName, avatarSrc, lastMessage };
    })
    .filter(({ displayName }) =>
      displayName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aDate = new Date(a.room.lastMessageTimestamp || 0);
      const bDate = new Date(b.room.lastMessageTimestamp || 0);
      return bDate - aDate;
    });

  return (
    <div className="sidebar">
      <div className="sidebar_header">
        <Avatar
          src={allUsers[user.uid]?.profilePicUrl || "/fotoprofilo.png"}
          alt={user?.nome || "Utente"}
          sx={{ width: 40, height: 40 }}
          onError={(e) => { e.currentTarget.src = "/fotoprofilo.png"; }}
        />
        <span className="sidebar_username">{user?.nome || "Utente"}</span>
      </div>

      <div className="sidebar_search">
        <div className="sidebar_search_container">
          <SearchIcon />
          <input
            type="text"
            placeholder="Cerca chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Cerca chat"
          />
        </div>
      </div>

      <div className="sidebar_usersearch">
        <h4>Inizia una nuova chat</h4>
        <UserSearch currentUserId={user.uid} onSelect={handleUserSelect} />
      </div>

      <div className="sidebar_chats">
        {filteredRooms.map(({ room, displayName, lastMessage, avatarSrc }) => (
          <SidebarChat
            key={room._id}
            id={room._id}
            name={displayName}
            lastMessageText={lastMessage}
            avatarSrc={avatarSrc}
            selected={roomId === room._id}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;




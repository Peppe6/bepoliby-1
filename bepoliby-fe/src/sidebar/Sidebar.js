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
            profilePicUrl: u.profilePicUrl || null, // ✅ usa URL fornito
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
      if (!data?.room || !data.message) return;

      const membersIds = (data.room.members || []).map(m => (typeof m === "string" ? m : m._id));
      if (!membersIds.includes(user.uid)) return;

      setRooms(prevRooms => {
        const idx = prevRooms.findIndex(r => r._id === data.room._id);
        const updatedRoom = {
          ...data.room,
          lastMessageText: data.message.message,
          lastMessageTimestamp: data.message.timestamp || new Date().toISOString(),
          members: membersIds,
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
      if (channel) {
        channel.unbind_all();
        pusher.unsubscribe('rooms');
        pusher.disconnect();
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
    .filter(room => Array.isArray(room.members))
    .map(room => {
      const membersIds = room.members.map(m => (typeof m === "string" ? m : m._id));
      const otherUserId = membersIds.find(id => id !== user.uid);
      const displayName = allUsers[otherUserId]?.name || room.name || "Chat";
      const avatarSrc = allUsers[otherUserId]?.profilePicUrl || null;
      const lastMessage = room.lastMessageText || (room.messages?.at(-1)?.message) || "";

      return { room, displayName, avatarSrc, lastMessage };
    })
    .filter(({ displayName }) =>
      displayName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      new Date(b.room.lastMessageTimestamp || 0) - new Date(a.room.lastMessageTimestamp || 0)
    );

  return (
    <div className="sidebar">
      <div className="sidebar_header">
        <div className="sidebar_header_left">
          <IconButton>
            <Avatar
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nome || "Utente")}`}
              alt={user?.nome || "Utente"}
            />
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




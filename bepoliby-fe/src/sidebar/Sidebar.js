
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

// I tuoi dati Pusher:
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

    const fetchData = async () => {
      try {
        setLoading(true);

        const roomsRes = await axios.get(`${API_BASE_URL}/api/v1/rooms`);
        setRooms(roomsRes.data);

        const usersRes = await axios.get(`${API_BASE_URL}/api/v1/users`);
        const usersMap = {};
        usersRes.data.forEach(u => {
          usersMap[u._id] = u.nome || u.username || "Sconosciuto";
        });
        setAllUsers(usersMap);

      } catch (err) {
        console.error("Errore nel caricamento stanze o utenti:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: `${API_BASE_URL}/pusher/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    });

    const channel = pusher.subscribe('rooms');

    channel.bind('new-message', (data) => {
      setRooms(prevRooms => {
        const idx = prevRooms.findIndex(r => r._id === data.roomId);
        if (idx !== -1) {
          const updatedRooms = [...prevRooms];
          updatedRooms[idx] = {
            ...updatedRooms[idx],
            lastMessageText: data.message.message,
            messages: [...(updatedRooms[idx].messages || []), data.message],
          };
          return updatedRooms;
        } else {
          return [data.room, ...prevRooms];
        }
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };

  }, [user, token]);

  const handleUserSelect = async (selectedUser) => {
    if (!user?.uid) {
      alert("Devi effettuare il login per iniziare una chat.");
      return;
    }

    try {
      const membri = [user.uid, selectedUser._id];
      // Il nome della stanza sarà solo il nome dell'altro utente, non il tuo
      const roomName = selectedUser.nome || selectedUser.username || "Utente";

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/v1/rooms`,
        { name: roomName, members: membri },
        config
      );

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

  if (loading) {
    return <div className="sidebar_loading">Caricamento...</div>;
  }

  if (!user) {
    return <div className="sidebar_loading">Utente non autenticato</div>;
  }

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
          />
        </div>
      </div>

      <div className="sidebar_usersearch">
        <h4>Inizia una nuova chat</h4>
        <UserSearch currentUserId={user.uid} onSelect={handleUserSelect} />
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
            const lastMessage = room.lastMessageText || (messages.length ? messages[messages.length - 1].message : "");
            const otherUserUid = (room.members || []).find(uid => uid !== user.uid);
            const displayName = otherUserUid ? (allUsers[otherUserUid] || room.name) : room.name;

            return (
              <SidebarChat
                key={room._id}
                id={room._id}
                name={displayName}
                lastMessageText={lastMessage}
                selected={roomId === room._id}
              />
            );
          })}
      </div>
    </div>
  );
};

export default Sidebar;

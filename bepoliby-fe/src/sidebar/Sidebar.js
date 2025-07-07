import React, { useState, useEffect, useRef } from "react";
import "./Sidebar.css";
import SidebarChat from "./SidebarChat";
import { useStateValue } from "../StateProvider";
import axios from "axios";
import Pusher from "pusher-js";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:9000";

const Sidebar = () => {
  const [{ user, token }] = useStateValue();
  const [rooms, setRooms] = useState([]);
  const [allUsers, setAllUsers] = useState({}); // mappa utenti _id => {name, profilePicUrl}
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Carica stanze dell'utente
  useEffect(() => {
    if (!user?.uid) return;

    const fetchRooms = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/rooms`);
        setRooms(res.data);
      } catch (err) {
        console.error("Errore caricamento stanze:", err);
      }
    };

    fetchRooms();
  }, [user?.uid]);

  // Carica lista utenti (mappa _id -> {name, profilePicUrl})
  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        const usersRes = await axios.get(`${API_BASE_URL}/api/v1/users`);
        const usersMap = {};
        usersRes.data.forEach((u) => {
          usersMap[u._id] = {
            name: u.nome || u.username || "Sconosciuto",
            profilePicUrl: u._id
              ? `${API_BASE_URL}/api/v1/users/${u._id}/profile-pic`
              : null,
          };
        });
        setAllUsers(usersMap);
      } catch (err) {
        console.error("Errore caricamento utenti:", err);
      }
    };

    fetchUsers();
  }, [token]);

  // Configura Pusher per aggiornare stanze con nuovi messaggi
  useEffect(() => {
    if (!pusherRef.current) {
      pusherRef.current = new Pusher("6a10fce7f61c4c88633b", { cluster: "eu" });
    }

    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusherRef.current.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    if (user?.uid && pusherRef.current) {
      channelRef.current = pusherRef.current.subscribe(`user_${user.uid}`);

      channelRef.current.bind("new_message", (data) => {
        // data: { roomId, message }
        setRooms((prevRooms) => {
          const roomIndex = prevRooms.findIndex((r) => r._id === data.roomId);
          if (roomIndex === -1) return prevRooms;

          const updatedRooms = [...prevRooms];
          // Aggiorna lastMessageText e lastMessageTimestamp (assumendo che ci siano questi campi)
          updatedRooms[roomIndex] = {
            ...updatedRooms[roomIndex],
            lastMessageText: data.message.message,
            lastMessageTimestamp: data.message.timestamp,
          };
          // Rordina stanze con la più recente prima
          updatedRooms.sort(
            (a, b) =>
              new Date(b.lastMessageTimestamp).getTime() -
              new Date(a.lastMessageTimestamp).getTime()
          );
          return updatedRooms;
        });
      });
    }

    return () => {
      if (channelRef.current && pusherRef.current) {
        channelRef.current.unbind_all();
        pusherRef.current.unsubscribe(channelRef.current.name);
      }
    };
  }, [user?.uid]);

  // Ritorno componente Sidebar
  return (
    <div className="Sidebar">
      <div className="Sidebar_header">
        <h2>Chat</h2>
        <p>Utente: {user?.nome || user?.username || "Anonimo"}</p>
      </div>

      <div className="Sidebar_chats">
        {rooms.length === 0 && <p>Nessuna stanza trovata</p>}

        {rooms.map((room) => {
          // Trova l'altro membro della stanza (diverso dall'utente corrente)
          const otherMemberId = room.members.find((m) => m !== user.uid);
          const otherUser = allUsers[otherMemberId] || {};
          const name = otherUser.name || room.name || "Stanza";

          return (
            <SidebarChat
              key={room._id}
              id={room._id}
              name={name}
              lastMessageText={room.lastMessageText}
              avatarSrc={otherUser.profilePicUrl}
              selected={selectedRoomId === room._id}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;



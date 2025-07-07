import React, { useState, useEffect, useRef } from 'react'; 
import { InsertEmoticon } from "@mui/icons-material";
import "./Chat.css";
import { Avatar, IconButton } from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Pusher from 'pusher-js';
import EmojiPicker from 'emoji-picker-react';
import { useStateValue } from '../StateProvider';

const PROFILE_PIC_BASE_URL = "https://bepoli.onrender.com/api/user-photo";

function Chat() {
  const { roomId } = useParams();
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [roomMessages, setRoomMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [userMap, setUserMap] = useState({});
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [{ user, token }] = useStateValue();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:9000';

  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const onEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (!pusherRef.current) {
      pusherRef.current = new Pusher('6a10fce7f61c4c88633b', { cluster: 'eu' });
    }
    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!roomId || !user?.uid || !pusherRef.current) return;

    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusherRef.current.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    channelRef.current = pusherRef.current.subscribe(`room_${roomId}`);

    const handleNewMessage = (data) => {
      if (!data || !data.message) return;
      const newMsg = data.message;

      setRoomMessages(prev => {
        if (prev.some(m => m._id === newMsg._id)) return prev;

        const tempIndex = prev.findIndex(m =>
          m._id?.startsWith('temp-') &&
          m.message === newMsg.message &&
          m.uid === newMsg.uid
        );

        if (tempIndex !== -1) {
          const copy = [...prev];
          copy[tempIndex] = newMsg;
          return copy;
        }

        return [...prev, newMsg];
      });

      setLastSeen(newMsg.timestamp);
    };

    channelRef.current.bind("inserted", handleNewMessage);

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind("inserted", handleNewMessage);
        pusherRef.current.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }
    };
  }, [roomId, user?.uid]);

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId || !user?.uid) return;

      try {
        const res = await axios.get(`${apiUrl}/api/v1/rooms/${roomId}`);
        setRoomName(res.data.name || "Chat");

        const messages = res.data.messages || [];
        setRoomMessages(messages);

        const lastMsg = messages.at(-1);
        setLastSeen(lastMsg?.timestamp || null);

        // Costruisce mappa utenti con _id, nome e profilePicUrl (anche se poi usiamo solo _id per foto)
        const memberMap = {};
        (res.data.members || []).forEach(m => {
          memberMap[m._id] = {
            _id: m._id,
            name: m.nome || m.username,
            profilePicUrl: m.profilePicUrl || null
          };
        });
        setUserMap(memberMap);

      } catch (err) {
        console.error("❌ Errore caricamento chat:", err);
        setRoomName("⚠️ Stanza non trovata o accesso negato");
        setRoomMessages([]);
      }
    };

    fetchRoomData();
  }, [roomId, user?.uid, apiUrl]);

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user?.uid || !roomId || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      _id: tempId,
      message: input,
      name: user.nome || "Utente",
      timestamp: new Date().toISOString(),
      uid: user.uid
    };

    setRoomMessages(prev => [...prev, newMessage]);
    setInput("");

    try {
      await axios.post(`${apiUrl}/api/v1/rooms/${roomId}/messages`, newMessage);
    } catch (error) {
      console.error("❌ Errore nell'invio del messaggio:", error);
      setRoomMessages(prev => prev.filter(msg => msg._id !== tempId));
      alert("Errore nell'invio del messaggio, riprova.");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <div className="Chat_loading">Caricamento dati utente...</div>;
  }

  if (roomName === "⚠️ Stanza non trovata o accesso negato") {
    return (
      <div className="Chat_error">
        <h2>{roomName}</h2>
        <p>Controlla se hai accesso oppure riprova più tardi.</p>
      </div>
    );
  }

  return (
    <div className='Chat' key={roomId}>
      <div className='Chat_header'>
        <Avatar
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(roomName)}&background=random&color=fff&size=128`}
          alt={roomName}
        />
        <div className='Chat_header_info'>
          <h3>{roomName}</h3>
          <p>
            Visto l'ultima volta:{" "}
            {lastSeen
              ? new Date(lastSeen).toLocaleString("it-IT", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit"
                })
              : "Mai"}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>
            Sei connesso come <b>{user.nome || "Utente"}</b>
          </p>
        </div>
      </div>

      <div className="Chat_body">
        {roomMessages.map((message, index) => {
          const isOwnMessage = message.uid === user?.uid;
          const isValidDate = !isNaN(new Date(message.timestamp));
          const sender = userMap[message.uid];

          return (
            <div
              key={message._id || index}
              className={`Chat_message_container ${isOwnMessage ? "Chat_receiver_container" : ""}`}
            >
              {!isOwnMessage && (
                <Avatar
                  className="Chat_avatar"
                  src={
                    sender
                      ? `${PROFILE_PIC_BASE_URL}/${sender._id}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.name || message.name)}&background=random&color=fff`
                  }
                  alt={sender?.name || message.name}
                />
              )}
              <span className="Chat_name">{sender?.name || message.name}</span>
              <div className={`Chat_message ${isOwnMessage ? "Chat_receiver" : ""}`}>
                {message.message}
                <span className="Chat_timestamp">
                  {isValidDate
                    ? new Date(message.timestamp).toLocaleString("it-IT", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit"
                      })
                    : "Data non valida"}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className='Chat_footer'>
        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)} aria-label="Seleziona emoji">
          <InsertEmoticon />
        </IconButton>
        <form onSubmit={sendMessage}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi un messaggio..."
            type="text"
            aria-label="Campo messaggio"
            disabled={sending}
          />
          <button type="submit" disabled={!input.trim() || !roomId || sending}>Invia</button>
        </form>
        {showEmojiPicker && (
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            width={300}
            height={350}
          />
        )}
      </div>
    </div>
  );
}

export default Chat;



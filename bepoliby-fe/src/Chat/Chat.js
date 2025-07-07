import React, { useState, useEffect, useRef } from 'react';
import { InsertEmoticon } from "@mui/icons-material";
import "./Chat.css";
import { Avatar, IconButton } from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Pusher from 'pusher-js';
import EmojiPicker from 'emoji-picker-react';
import { useStateValue } from '../StateProvider';

function Chat() {
  const { roomId } = useParams();
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [roomMessages, setRoomMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [{ user, token }] = useStateValue();
  const messagesEndRef = useRef(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:9000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    if (!roomId || !user?.uid) return;

const pusher = new Pusher('6a10fce7f61c4c88633b', { cluster: 'eu' });
const channel = pusher.subscribe(`room_${roomId}`);

channel.bind("inserted", (data) => {
  if (!data || !data.message) return;

  const newMsg = data.message;

  setRoomMessages(prev => {
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

    if (prev.some(m => m._id === newMsg._id)) return prev;

    return [...prev, newMsg];
  });

  setLastSeen(newMsg.timestamp);
});


      setLastSeen(newMsg.timestamp);
    };

    channel.bind("new-message", newMessageHandler);

    return () => {
      channel.unbind("new-message", newMessageHandler);
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [roomId, user?.uid]);

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId || !user?.uid) return;

      try {
        const roomRes = await axios.get(`${apiUrl}/api/v1/rooms/${roomId}`);
        setRoomName(roomRes.data.name || "Chat");

        const messages = roomRes.data.messages || [];
        setRoomMessages(messages);

        const lastMsg = messages.at(-1);
        setLastSeen(lastMsg?.timestamp || null);
      } catch (err) {
        console.error("Errore caricamento chat:", err);
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
      console.error("Errore nell'invio del messaggio:", error);
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

          return (
            <div
              key={message._id || index}
              className={`Chat_message_container ${isOwnMessage ? "Chat_receiver_container" : ""}`}
            >
              {!isOwnMessage && (
                <Avatar
                  className="Chat_avatar"
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(message.name)}&background=random&color=fff&size=64`}
                  alt={message.name}
                />
              )}
              <span className="Chat_name">{message.name}</span>
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





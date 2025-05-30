 import React, { useState, useEffect } from 'react';
import { InsertEmoticon } from "@mui/icons-material";
import "./Chat.css";
import { Avatar, IconButton } from '@mui/material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useStateValue } from '../StateProvider';

function Chat() {
  const { roomId } = useParams();
  const [input, setInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [roomMessages, setRoomMessages] = useState([]);
  const navigate = useNavigate();
  const [{ user }] = useStateValue();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const roomRes = await axios.get(`http://127.0.0.1:9000/api/v1/rooms/${roomId}`);
        setRoomName(roomRes.data.name);

        const messagesRes = await axios.get(`http://127.0.0.1:9000/api/v1/rooms/${roomId}/messages`);
        setRoomMessages(messagesRes.data);

        const lastMsg = messagesRes.data[messagesRes.data.length - 1];
        setLastSeen(lastMsg?.timestamp || null);
      } catch (err) {
        console.error("❌ Errore nel recupero della stanza o dei messaggi:", err);
        navigate("/");
      }
    };

    if (roomId) fetchRoomData();
  }, [roomId, navigate]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const newMessage = {
        message: input,
        name: user?.displayName || "Anonimo",
        timestamp: new Date().toISOString(),
        uid: user?.uid || "default",
      };

      await axios.post(`http://127.0.0.1:9000/api/v1/rooms/${roomId}/messages`, newMessage);
      setInput("");

      // Aggiorna i messaggi locali dopo l'invio
      setRoomMessages(prev => [...prev, newMessage]);
      setLastSeen(newMessage.timestamp);
    } catch (error) {
      console.error("❌ Errore nell'invio del messaggio:", error);
    }
  };

  return (
    <div className='Chat'>
      <div className='Chat_header'>
        <Avatar />
        <div className='Chat_header_info'>
          <h3>{roomName}</h3>
          <p>
            Visto l'ultima volta:{" "}
            {lastSeen
              ? new Date(lastSeen).toLocaleString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "Mai"}
          </p>
        </div>
      </div>

      <div className="Chat_body">
        {roomMessages.map((message, index) => {
          const date = new Date(message.timestamp);
          const isValidDate = !isNaN(date);

          return (
            <div
              key={index}
              className={`Chat_message_container ${
                message.uid === user?.uid ? "Chat_receiver_container" : ""
              }`}
            >
              <span className="Chat_name_label">{message.name}</span>
              <div
                className={`Chat_message ${
                  message.uid === user?.uid ? "Chat_receiver" : ""
                }`}
              >
                {message.message}
                <span className="Chat_timestamp">
                  {isValidDate
                    ? date.toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Data non valida"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className='Chat_footer'>
        <IconButton>
          <InsertEmoticon />
        </IconButton>
        <form onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi un messaggio..."
            type="text"
          />
          <button type="submit">Invia</button>
        </form>
      </div>
    </div>
  );
}

export default Chat;

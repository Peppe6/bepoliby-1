
import React, { useEffect, useState } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import Pusher from "pusher-js";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './auth/Login';
import { useStateValue } from "./StateProvider";
import { loadFromLocalStorage } from "./localStore";
import Avatar from "@mui/material/Avatar";

function App() {
  const [messages, setMessages] = useState([]);
  const [{ user }] = useStateValue();

  // 📥 Carica messaggi iniziali e sanifica timestamp
  useEffect(() => {
    axios.get("http://localhost:9000/api/v1/messages/sync")
      .then((response) => {
        const sanitizedMessages = response.data.map(msg => ({
          ...msg,
          timestamp: msg.timestamp && !isNaN(new Date(msg.timestamp))
            ? msg.timestamp
            : new Date().toISOString()
        }));
        setMessages(sanitizedMessages);
      })
      .catch((error) => {
        console.error("Errore nel fetch dei messaggi:", error);
      });
  }, []);

  // 🔄 Ricevi messaggi in tempo reale via Pusher
  useEffect(() => {
    const pusher = new Pusher('6a10fce7f61c4c88633b', {
      cluster: 'eu'
    });

    const channel = pusher.subscribe('messages');
    channel.bind('inserted', function (newMessage) {
      const correctedTimestamp = newMessage.timestamp && !isNaN(new Date(newMessage.timestamp))
        ? newMessage.timestamp
        : new Date().toISOString();

      const fixedMessage = {
        ...newMessage,
        timestamp: correctedTimestamp,
      };

      setMessages(prevMessages => [...prevMessages, fixedMessage]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="app">
      {!user ? (
        <Login />
      ) : (
        <div className="app_body">
          <Router>
            <Sidebar />
            <Routes>
              <Route path="/" element={
                <div className="info-center">
                  <div className="info-center-item" />
                  <Avatar src={loadFromLocalStorage("user")?.photoURL} />
                  <div className="info-center-item" />
                  {loadFromLocalStorage("user")?.displayName}
                  <div className="info-center-item" />
                  Seleziona una Chat!
                </div>
              } />
              <Route path="/rooms/:roomId" element={<Chat messages={messages} />} />
            </Routes>
          </Router>
        </div>
      )}
    </div>
  );
}

export default App;




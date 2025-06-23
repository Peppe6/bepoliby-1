import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

function InfoCenter() {
  const [{ user }] = useStateValue();

  return (
    <div className="info-center">
      <div className="info-center-item" />
      <Avatar
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nome || "Utente")}&background=random&color=fff`}
        onError={(e) => {
          e.currentTarget.src = "/default-avatar.png";
        }}
      />
      <div className="info-center-item" />
      {user?.nome || "Utente"}
      <div className="info-center-item" />
      Seleziona una Chat!
    </div>
  );
}

function App() {
  const [, dispatch] = useStateValue();

  useEffect(() => {
    const fetchSessionUser = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/session/user`, {
          withCredentials: true, // 👈 NECESSARIO per usare cookie di sessione
        });

        if (res.data && res.data.user) {
          dispatch({
            type: "SET_USER",
            user: {
              uid: res.data.user.id,
              nome: res.data.user.nome,
              username: res.data.user.username
            }
          });
        } else {
          console.warn("⚠️ Nessun utente in sessione.");
        }
      } catch (err) {
        console.error("Errore nel recupero della sessione:", err.response?.data || err.message);
      }
    };

    fetchSessionUser();
  }, [dispatch]);

  return (
    <div className="app">
      <div className="app_body">
        <Router>
          <Sidebar />
          <Routes>
            <Route path="/" element={<InfoCenter />} />
            <Route path="/rooms/:roomId" element={<Chat />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;




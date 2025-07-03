
// FILE: App.js
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import jwtDecode from "jwt-decode";




function InfoCenter() {
  const [{ user }] = useStateValue();

  return (
    <div className="info-center">
      <div className="info-center-item" />
      <Avatar
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nome || "Utente")}&background=random&color=fff`}
        onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
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
  const API_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com";

  // 🔑 1. Se c'è un token nell'URL, salvalo in sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      try {
const decoded = jwtDecode(token);
 const { id, nome, username } = decoded;

        if (id && nome && username) {
          sessionStorage.setItem("token", token);
          sessionStorage.setItem("user", JSON.stringify({ id, nome, username }));

          dispatch({
            type: "SET_USER",
            user: { uid: id, nome, username },
            token
          });

          console.log("✅ Token ricevuto da URL e utente impostato:", { id, nome, username });

          // pulisci l'URL
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (err) {
        console.error("❌ Errore decoding token dall'URL:", err);
      }
    }
  }, [dispatch]);

  // 📦 2. Se già salvato in sessionStorage, carica utente
  useEffect(() => {
    const userString = sessionStorage.getItem("user");
    const token = sessionStorage.getItem("token");

    if (userString && token) {
      try {
        const userData = JSON.parse(userString);
        dispatch({
          type: "SET_USER",
          user: { uid: userData.id || userData.uid, nome: userData.nome, username: userData.username },
          token
        });
        console.log("🟢 Utente caricato da sessionStorage:", userData);
      } catch {
        console.warn("⚠️ user in sessionStorage non valido");
      }
    }
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

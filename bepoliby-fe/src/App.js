// FILE: App.js (frontend sito messaggistica)
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
  const API_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1-2.onrender.com";

  // 1️⃣ Carica utente da sessionStorage (token già ricevuto)
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
        console.log("✅ Utente caricato da sessionStorage:", userData);
      } catch {
        console.warn("⚠️ user in sessionStorage non valido");
      }
    }
  }, [dispatch]);

  // 2️⃣ Ricevi dati dal sito principale (via postMessage)
  useEffect(() => {
    function riceviDatiDaBepoli(event) {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { token } = event.data?.dati || {};
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        const { id, nome, username } = decoded;

        if (!id || !nome || !username) return;

        sessionStorage.setItem("user", JSON.stringify({ id, nome, username }));
        sessionStorage.setItem("token", token);

        dispatch({
          type: "SET_USER",
          user: { uid: id, nome, username },
          token
        });

        console.log("✅ Token ricevuto e utente salvato:", { id, nome, username });

        // (opzionale) puoi inviare al backend per logging o tracking
        /*
        fetch(`${API_URL}/api/ricevi-dati`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, nome, username })
        }).catch(err => console.error("❌ Errore aggiornamento sessione:", err));
        */
      } catch (err) {
        console.error("❌ Errore decoding token:", err);
      }
    }

    window.addEventListener("message", riceviDatiDaBepoli);

    // 🔁 Invia richiesta token al sito principale
    if (window.opener) {
      window.opener.postMessage({ type: "richiediDatiUtente" }, "https://bepoli.onrender.com");
    }

    return () => window.removeEventListener("message", riceviDatiDaBepoli);
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

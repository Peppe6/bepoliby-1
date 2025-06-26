
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
  const API_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com";

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

  useEffect(() => {
    function riceviDatiDaBepoli(event) {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { id, username, nome, token } = event.data?.dati || {};
      if (!id || !username || !nome || !token) return;

      sessionStorage.setItem("user", JSON.stringify({ id, username, nome }));
      sessionStorage.setItem("token", token);

      dispatch({
        type: "SET_USER",
        user: { uid: id, nome, username },
        token
      });

      fetch(`${API_URL}/api/ricevi-dati`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, username, nome })
      })
        .then(res => res.json())
        .then(data => console.log("✅ Sessione backend aggiornata:", data))
        .catch(err => console.error("❌ Errore aggiornamento sessione:", err));
    }

    window.addEventListener("message", riceviDatiDaBepoli);

    // 🔁 Se possibile, richiedi dati automaticamente al parent
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

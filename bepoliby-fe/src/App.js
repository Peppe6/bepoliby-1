
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

  // 1️⃣ Carica utente da sessionStorage (se presente)
  useEffect(() => {
    const userString = sessionStorage.getItem("user");
    const token = sessionStorage.getItem("token");

    if (userString) {
      try {
        const userData = JSON.parse(userString);
        dispatch({
          type: "SET_USER",
          user: {
            uid: userData.id || userData.uid,
            nome: userData.nome,
            username: userData.username,
          },
          token: token || null,
        });
        console.log("✅ Utente caricato da sessionStorage:", userData);
      } catch {
        console.warn("⚠️ user in sessionStorage non valido");
      }
    } else {
      console.warn("⚠️ Nessun utente in sessionStorage");
    }
  }, [dispatch]);

  // 2️⃣ Ascolta postMessage dal sito principale per dati utente
  useEffect(() => {
    function riceviDatiDaBepoli(event) {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { id, username, nome, token } = event.data?.dati || {};

      if (id && username && nome) {
        console.log("✅ Dati ricevuti via postMessage:", { id, username, nome });

        sessionStorage.setItem("user", JSON.stringify({ id, username, nome }));
        if (token) sessionStorage.setItem("token", token);

        dispatch({
          type: "SET_USER",
          user: { uid: id, nome, username },
          token: token || null,
        });
      } else {
        console.warn("❌ Dati incompleti ricevuti:", event.data);
      }
    }

    window.addEventListener("message", riceviDatiDaBepoli);
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


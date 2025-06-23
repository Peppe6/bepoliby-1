
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import { jwtDecode } from "jwt-decode";

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

  // 1️⃣ Recupera i dati da sessionStorage (se già presenti)
  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (typeof token === "string" && token.trim() !== "") {
      try {
        const decoded = jwtDecode(token);
        dispatch({
          type: "SET_USER",
          user: {
            uid: decoded.id,
            nome: decoded.nome,
            username: decoded.username
          },
          token: token
        });
      } catch (err) {
        console.error("❌ Token JWT non valido:", err);
      }
    } else {
      console.warn("⚠️ Nessun token trovato in sessionStorage.");
    }
  }, [dispatch]);

  // 2️⃣ Riceve dati utente da bepoli.onrender.com (via postMessage)
  useEffect(() => {
    const riceviDatiDaBepoli = (event) => {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { id, username, nome, token } = event.data;

      if (id && username && nome && token) {
        console.log("✅ Dati ricevuti:", event.data);

        // Salva nel sessionStorage
        sessionStorage.setItem("user", JSON.stringify({ id, username, nome }));
        sessionStorage.setItem("token", token);

        // Aggiorna lo stato globale
        dispatch({
          type: "SET_USER",
          user: {
            uid: id,
            nome: nome,
            username: username
          },
          token: token
        });
      } else {
        console.warn("❌ Dati ricevuti incompleti:", event.data);
      }
    };

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


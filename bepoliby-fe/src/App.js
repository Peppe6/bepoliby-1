
import React, { useEffect, useState } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import jwtDecode from "jwt-decode";  // <--- correzione qui

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
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      } catch {
        console.warn("⚠️ user in sessionStorage non valido");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    function riceviDatiDaBepoli(event) {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { token } = event.data?.dati || {};
      if (!token) return;

      try {
        const decoded = jwtdecode(token);  // <--- correzione qui
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
        setLoading(false);
      } catch (err) {
        console.error("❌ Errore decoding token:", err);
        setLoading(false);
      }
    }

    window.addEventListener("message", riceviDatiDaBepoli);

    if (window.opener) {
      window.opener.postMessage({ type: "richiediDatiUtente" }, "https://bepoli.onrender.com");
    }

    return () => window.removeEventListener("message", riceviDatiDaBepoli);
  }, [dispatch]);

  if (loading) {
    return <div>Caricamento dati utente in corso...</div>;
  }

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

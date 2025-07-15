
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import axios from "axios";

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function axiosAuth(token) {
  return axios.create({
    baseURL: process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function InfoCenter() {
  const [{ user }] = useStateValue();

  return (
    <div className="info-center">
      <div className="info-center-item" />
      <Avatar
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nome || user?.username || "Utente")}&background=random&color=fff`}
        onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
      />
      <div className="info-center-item" />
      {user?.nome || user?.username || "Utente"}
      <div className="info-center-item" />
      Seleziona una Chat!
    </div>
  );
}

function AppLayout({ fetchUsers, token, user }) {
  const location = useLocation();
  const isMobile = window.innerWidth <= 768;
  const isInChat = location.pathname.startsWith("/rooms/");

  return (
    <div className={`app ${isMobile ? (isInChat ? "show-chat" : "show-sidebar") : "desktop"}`}>
      <div className="app_body">
        {(!isMobile || !isInChat) && <Sidebar fetchUsers={fetchUsers} />}
        <Routes>
          {!isInChat && <Route path="/" element={<InfoCenter />} />}
          <Route path="/rooms/:roomId" element={<Chat token={token} user={user} />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [{ user, token }, dispatch] = useStateValue();

  // 1) Se c'è il token in URL, decodificalo e salvalo in sessionStorage + stato globale
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");

    if (tokenFromUrl) {
      const decoded = decodeJwt(tokenFromUrl);
      const { id, nome, username } = decoded || {};

      if (id && (nome || username)) {
        sessionStorage.setItem("token", tokenFromUrl);
        sessionStorage.setItem("user", JSON.stringify({ uid: id, nome, username }));

        // Salvo anche in localStorage come backup per iOS Safari
        localStorage.setItem("tokenBackup", tokenFromUrl);
        localStorage.setItem("userBackup", JSON.stringify({ uid: id, nome, username }));

        dispatch({
          type: "SET_USER",
          user: { uid: id, nome, username },
          token: tokenFromUrl
        });

        window.history.replaceState(null, "", window.location.pathname);
        console.log(" Token da URL salvato e utente impostato", { id, nome, username });
      }
    }
  }, [dispatch]);

  // 2) Carica dati da sessionStorage o fallback da localStorage (per iOS Safari)
  useEffect(() => {
    const tokenSession = sessionStorage.getItem("token");
    const userSession = sessionStorage.getItem("user");

    if (tokenSession && userSession) {
      try {
        const userData = JSON.parse(userSession);
        dispatch({
          type: "SET_USER",
          user: {
            uid: userData.uid || userData.id,
            nome: userData.nome,
            username: userData.username
          },
          token: tokenSession
        });
        console.log(" Utente caricato da sessionStorage:", userData);
      } catch (e) {
        console.warn("Errore parsing user in sessionStorage", e);
      }
      return;
    }

    // fallback da localStorage se sessionStorage è vuoto (iOS Safari workaround)
    const tokenBackup = localStorage.getItem("tokenBackup");
    const userBackup = localStorage.getItem("userBackup");

    if (tokenBackup && userBackup) {
      try {
        const userData = JSON.parse(userBackup);
        // Copia i dati nel sessionStorage per mantenere coerenza con il resto dell’app
        sessionStorage.setItem("token", tokenBackup);
        sessionStorage.setItem("user", userBackup);

        dispatch({
          type: "SET_USER",
          user: {
            uid: userData.uid || userData.id,
            nome: userData.nome,
            username: userData.username
          },
          token: tokenBackup
        });
        console.log(" Utente caricato da localStorage (fallback) e copiato in sessionStorage:", userData);
      } catch (e) {
        console.warn(" Errore parsing user in localStorage", e);
      }
    }
  }, [dispatch]);

  // 3) Configura axios con token, abilita withCredentials se serve
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.withCredentials = true;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  async function fetchUsers() {
    if (!token) {
      console.warn("Token mancante, impossibile fetchare utenti");
      return [];
    }
    try {
      const api = axiosAuth(token);
      const res = await api.get("/api/v1/users");
      return res.data || [];
    } catch (err) {
      console.error("Errore fetch utenti:", err.response?.data || err.message);
      if (err.response?.status === 401) {
        sessionStorage.clear();
        localStorage.removeItem("tokenBackup");
        localStorage.removeItem("userBackup");
        dispatch({ type: "SET_USER", user: null, token: null });
        window.location.reload();
      }
      return [];
    }
  }

  return (
    <Router>
      {user ? (
        <AppLayout fetchUsers={fetchUsers} token={token} user={user} />
      ) : (
        <div className="app_loading">Caricamento utente...</div>
      )}
    </Router>
  );
}

export default App;



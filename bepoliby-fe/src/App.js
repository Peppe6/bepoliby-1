
// FILE: App.js
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
  const [{ user, token }, dispatch] = useStateValue();

  // ✅ Estrae token dall’URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");

    if (tokenFromUrl) {
      const decoded = decodeJwt(tokenFromUrl);
      const { id, nome, username } = decoded || {};

      if (id && nome && username) {
        sessionStorage.setItem("token", tokenFromUrl);
        sessionStorage.setItem("user", JSON.stringify({ uid: id, nome, username }));

        dispatch({
          type: "SET_USER",
          user: { uid: id, nome, username },
          token: tokenFromUrl
        });

        window.history.replaceState(null, "", window.location.pathname);
        console.log("✅ Token da URL salvato e utente impostato", { id, nome, username });
      }
    }
  }, [dispatch]);

  // ✅ Ripristina user/token da sessionStorage
  useEffect(() => {
    const tokenStored = sessionStorage.getItem("token");
    const userString = sessionStorage.getItem("user");

    if (tokenStored && userString) {
      try {
        const userData = JSON.parse(userString);
        dispatch({
          type: "SET_USER",
          user: {
            uid: userData.uid || userData.id,
            nome: userData.nome,
            username: userData.username
          },
          token: tokenStored
        });
        console.log("🟢 Utente caricato da sessionStorage:", userData);
      } catch (e) {
        console.warn("⚠️ Errore parsing user in sessionStorage", e);
      }
    }
  }, [dispatch]);

  // ✅ IMPOSTA HEADER GLOBALE AXIOS
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.withCredentials = true;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Esempio uso axiosAuth (non obbligatorio se sopra è fatto)
  async function fetchUsers() {
    if (!token) {
      console.warn("Token mancante, impossibile fetchare utenti");
      return [];
    }
    try {
      const api = axiosAuth(token);
      const res = await api.get("/api/v1/users");
      return res.data.users || [];
    } catch (err) {
      console.error("Errore fetch utenti:", err.response?.data || err.message);
      return [];
    }
  }

  return (
    <div className="app">
      <div className="app_body">
        <Router>
          {user ? (
            <>
              <Sidebar fetchUsers={fetchUsers} />
              <Routes>
                <Route path="/" element={<InfoCenter />} />
                <Route path="/rooms/:roomId" element={<Chat token={token} user={user} />} />
              </Routes>
            </>
          ) : (
            <div className="app_loading">Caricamento utente...</div>
          )}
        </Router>
      </div>
    </div>
  );
}

export default App;

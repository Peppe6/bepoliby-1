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

  // 1️⃣ Legge da window.opener.sessionStorage
  useEffect(() => {
    try {
      if (window.opener) {
        const rawUser = window.opener.sessionStorage.getItem("user");
        if (rawUser) {
          const user = JSON.parse(rawUser);
          console.log("✅ Dati utente recuperati da window.opener.sessionStorage:", user);

          sessionStorage.setItem("user", JSON.stringify(user));

          const fakeToken = btoa(`${user._id}:${user.username}`);
          sessionStorage.setItem("token", fakeToken);

          dispatch({
            type: "SET_USER",
            user: {
              uid: user._id || user.id,
              nome: user.nome,
              username: user.username
            },
            token: fakeToken
          });
        } else {
          console.warn("⚠️ Nessun user trovato in window.opener.sessionStorage");
        }
      } else {
        console.warn("⚠️ La finestra non è stata aperta con window.open (no window.opener)");
      }
    } catch (e) {
      console.error("❌ Errore nell'accesso a window.opener.sessionStorage:", e);
    }
  }, [dispatch]);

  // 2️⃣ Legge dati via postMessage da bepoli.onrender.com
  useEffect(() => {
    const riceviDatiDaBepoli = async (event) => {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { id, username, nome, token } = event.data?.dati || {};

      if (id && username && nome) {
        console.log("✅ Dati ricevuti via postMessage:", { id, username, nome });

        sessionStorage.setItem("user", JSON.stringify({ id, username, nome }));

        if (token) {
          sessionStorage.setItem("token", token);
        } else {
          const fakeToken = btoa(`${id}:${username}`);
          sessionStorage.setItem("token", fakeToken);
        }

        dispatch({
          type: "SET_USER",
          user: {
            uid: id,
            nome,
            username
          },
          token: sessionStorage.getItem("token")
        });
      } else {
        console.warn("❌ Dati incompleti ricevuti via postMessage:", event.data);
      }
    };

    window.addEventListener("message", riceviDatiDaBepoli);
    return () => window.removeEventListener("message", riceviDatiDaBepoli);
  }, [dispatch]);

  // 3️⃣ Fallback: carica da sessionStorage locale se presente
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (typeof token === "string" && token.trim() !== "") {
      try {
        const decoded = jwtDecode(token);
        dispatch({
          type: "SET_USER",
          user: {
            uid: decoded.id || decoded._id,
            nome: decoded.nome,
            username: decoded.username
          },
          token: token
        });
        console.log("✅ Utente caricato da sessionStorage:", decoded);
      } catch (err) {
        console.error("❌ Token non valido:", err);
      }
    } else {
      console.warn("⚠️ Nessun token trovato in sessionStorage.");
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


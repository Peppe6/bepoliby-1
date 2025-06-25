
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import { jwt_decode } from "jwt-decode";// import corretto

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

  // 1️⃣ Carica da sessionStorage se presente
  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (typeof token === "string" && token.trim() !== "") {
      try {
        const decoded = jwt_decode(token);
        dispatch({
          type: "SET_USER",
          user: {
            uid: decoded.id,
            nome: decoded.nome,
            username: decoded.username
          },
          token: token
        });
        console.log("✅ Utente caricato da sessionStorage:", decoded);
      } catch (err) {
        console.error("❌ Token JWT non valido:", err);
      }
    } else {
      console.warn("⚠️ Nessun token trovato in sessionStorage.");
    }
  }, [dispatch]);

  // 2️⃣ Riceve i dati via postMessage da bepoli.onrender.com
  useEffect(() => {
    const riceviDatiDaBepoli = async (event) => {
      if (event.origin !== "https://bepoli.onrender.com") return;

      const { id, username, nome, token } = event.data?.dati || {};

      if (id && username && nome && token) {
        console.log("✅ Dati ricevuti via postMessage:", { id, username, nome });

        sessionStorage.setItem("user", JSON.stringify({ id, username, nome }));
        sessionStorage.setItem("token", token);

        dispatch({
          type: "SET_USER",
          user: {
            uid: id,
            nome,
            username
          },
          token: token
        });

        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL || "https://bepoli.onrender.com"}/api/ricevi-dati`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ id, username, nome })
          });

          const json = await res.json();
          if (res.ok) {
            console.log("✅ Sessione backend creata:", json);
          } else {
            console.error("❌ Errore nella creazione sessione:", json);
          }
        } catch (err) {
          console.error("❌ Errore fetch sessione:", err);
        }
      } else {
        console.warn("❌ Dati ricevuti incompleti:", event.data);
      }
    };

    window.addEventListener("message", riceviDatiDaBepoli);
    return () => window.removeEventListener("message", riceviDatiDaBepoli);
  }, [dispatch]);

  // 3️⃣ 🔥 Fallback: prova a ottenere il token da /api/auth-token
  useEffect(() => {
    const fetchTokenFromMainApp = async () => {
      const existingToken = sessionStorage.getItem("token");
      if (existingToken) return;

      try {
        const res = await fetch("https://bepoli.onrender.com/api/auth-token", {
          credentials: "include",
        });

        if (!res.ok) {
          console.warn("⚠️ Utente non autenticato o errore nel fetch del token.");
          return;
        }

        const { token } = await res.json();
        const decoded = jwt_decode(token);

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(decoded));

        dispatch({
          type: "SET_USER",
          user: {
            uid: decoded.id,
            nome: decoded.nome,
            username: decoded.username
          },
          token: token
        });

        console.log("✅ Token ottenuto automaticamente da /api/auth-token");
      } catch (error) {
        console.error("❌ Errore nel recupero automatico del token:", error);
      }
    };

    fetchTokenFromMainApp();
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


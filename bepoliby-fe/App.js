
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';

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

  useEffect(() => {
    const userFromSession = sessionStorage.getItem("user");
    if (userFromSession) {
      try {
        const parsedUser = JSON.parse(userFromSession);
        dispatch({
          type: "SET_USER",
          user: {
            uid: parsedUser.id, // Assicurati che `id` sia presente nel login
            nome: parsedUser.nome,
            username: parsedUser.username,
          }
        });
      } catch (e) {
        console.error("Errore parsing utente dal sessionStorage", e);
      }
    } else {
      console.warn("⚠️ Nessun utente trovato nel sessionStorage.");
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




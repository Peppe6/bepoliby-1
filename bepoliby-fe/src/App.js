
import React, { useEffect } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Avatar from "@mui/material/Avatar";
import { useStateValue } from './StateProvider';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';


const API_BASE_URL = process.env.REACT_APP_API_URL;

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
    const fetchTokenAndUser = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth-token`, {
          withCredentials: true, // importante per inviare cookie di sessione
        });

        const token = res.data.token;
        sessionStorage.setItem("token", token);

        // Decodifica il token per ottenere dati utente
        const decoded = jwtDecode(token);

        dispatch({
          type: "SET_USER",
          user: {
            uid: decoded.id,
            nome: decoded.nome,
            username: decoded.username,
          },
        });

        // Imposta default header Authorization per tutte le richieste axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.warn("Utente non autenticato o token non disponibile:", err);
        sessionStorage.removeItem("token");
        dispatch({ type: "SET_USER", user: null });
      }
    };

    fetchTokenAndUser();
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



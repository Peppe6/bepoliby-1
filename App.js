import React, { useEffect, useState } from "react";
import './App.css';
import Sidebar from './sidebar/Sidebar';
import Chat from './Chat/Chat';
import Pusher from "pusher-js";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './auth/Login';
import { useStateValue } from "./StateProvider";
import { loadFromLocalStorage } from "./localStore";
import Avatar from "@mui/material/Avatar";

function App() {

  const [{ user }] = useStateValue();

  return (
    <div className="app">
      {!user ? (
        <Login />
      ) : (
        <div className="app_body">
          <Router>
            <Sidebar />
            <Routes>
              <Route path="/" element={
                <div className="info-center">
                  <div className="info-center-item" />
                  <Avatar
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(loadFromLocalStorage("user")?.displayName || "Utente")}&background=random&color=fff`}
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
                  <div className="info-center-item" />
                  {loadFromLocalStorage("user")?.displayName}
                  <div className="info-center-item" />
                  Seleziona una Chat!
                </div>
              } />
              <Route path="/rooms/:roomId" element={<Chat />} />
            </Routes>
          </Router>
        </div>
      )}
    </div>
  );
}

export default App;


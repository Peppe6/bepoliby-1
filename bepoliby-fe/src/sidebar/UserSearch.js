
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Avatar } from "@mui/material";

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com";
const PROFILE_PIC_BASE_URL = "https://bepoli.onrender.com/api/user-photo"; // Cambia con il tuo dominio/backend

function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/users`, {
          params: { page, limit: 10, q: query },
        });

        // Escludi utente corrente
        const filtered = res.data.filter(u => u._id !== currentUserId);
        setResults(filtered);
      } catch (error) {
        console.error("Errore nel caricamento utenti:", error);
      }
    };

    fetchUsers();
  }, [query, page, currentUserId]);

  return (
    <div className="user-search-container">
      <input
        type="text"
        placeholder="Cerca utenti..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Cerca utenti"
      />
      <div className="user-search-results">
        {results.map(user => {
          const key = user._id;
          const name = user.nome || user.username || "Utente";

          // Costruisci URL foto profilo
          const avatarUrl = user.profilePicUrl
            ? user.profilePicUrl
            : (user._id ? `${PROFILE_PIC_BASE_URL}/${user._id}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`);

          return (
            <div
              key={key}
              className="user-result"
              tabIndex={0}
              onClick={() => {
                onSelect(user);
                setQuery('');
                setResults([]);
                setPage(1);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(user);
                  setQuery('');
                  setResults([]);
                  setPage(1);
                }
              }}
              role="button"
              aria-pressed="false"
            >
              <Avatar
                src={avatarUrl}
                alt={`${name} avatar`}
                sx={{ width: 32, height: 32, marginRight: 1 }}
              >
                {!user.profilePicUrl && (name[0] || "U").toUpperCase()}
              </Avatar>
              <strong>{name}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UserSearch;


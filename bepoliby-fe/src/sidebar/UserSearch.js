
import React, { useState } from 'react';
import './UserSearch.css';

const API_SEARCH_URL = ${process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com"}/api/search-users;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [timeoutId, setTimeoutId] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Stato per il caricamento
  const [page] = useState(1); // per ora una sola pagina
  const limit = 10;

  const searchUsers = async (text) => {
    if (!text.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true); // Inizia il caricamento
    try {
      const res = await fetch(${API_SEARCH_URL}?q=${encodeURIComponent(text)}&page=${page}&limit=${limit}, {
        credentials: 'include',
      });

      if (!res.ok) {
        console.error("❌ Errore nella ricerca:", res.status);
        setResults([]);
        setIsLoading(false); // Termina il caricamento
        return;
      }

      const data = await res.json();
      const utenti = Array.isArray(data) ? data : data.results || [];

      const filtrati = utenti.filter(u => u.id !== currentUserId && u._id !== currentUserId);
      setResults(filtrati);
    } catch (err) {
      console.error("❌ Errore fetch utenti:", err);
      setResults([]);
      setIsLoading(false); // Termina il caricamento
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutId);
    const id = setTimeout(() => searchUsers(val), 300);
    setTimeoutId(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      onSelect(results[0]);
      setQuery('');
      setResults([]);
    }
  };

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Cerca utente per username..."
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {isLoading && <div className="loading">Caricamento...</div>} {/* Visualizzazione del caricamento */}
      <div className="user-search-results">
        {results.length > 0 ? (
          results.map(user => (
            <div
              key={user.id || user._id}
              onClick={() => {
                onSelect(user);
                setQuery('');
                setResults([]);
              }}
              className="user-result"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(user);
                  setQuery('');
                  setResults([]);
                }
              }}
            >
              <img src={user.profilePicUrl || "/default-avatar.png"} alt="avatar" />
              <strong>{user.username}</strong>
            </div>
          ))
        ) : (
          <div className="no-results">Nessun risultato trovato</div>
        )}
      </div>
    </div>
  );
}

// ✅ UserSearch.js (componente React completo e funzionante)
import React, { useState, useEffect } from 'react';
import './UserSearch.css';

const API_SEARCH_URL = `${process.env.REACT_APP_API_URL}/api/v1/users/search`;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [timeoutId, setTimeoutId] = useState(null);

  // Funzione per cercare utenti
  const searchUsers = async (text) => {
    if (!text || text.length < 1) return setResults([]);
    try {
      const res = await fetch(`${API_SEARCH_URL}?q=${encodeURIComponent(text)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      const utenti = Array.isArray(data) ? data : data.results || [];
      const filtrati = utenti.filter(u => u.id !== currentUserId && u._id !== currentUserId);
      setResults(filtrati);
    } catch (err) {
      console.error("Errore nella ricerca utenti:", err);
      setResults([]);
    }
  };

  // Gestione input con debounce
  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutId);
    const id = setTimeout(() => searchUsers(val), 300);
    setTimeoutId(id);
  };

  // Gestione tasto Invio nella barra
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
      <div className="user-search-results">
        {results.map(user => (
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
        ))}
      </div>
    </div>
  );
}

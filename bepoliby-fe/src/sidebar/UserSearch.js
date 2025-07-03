
import React, { useState } from 'react';
import './UserSearch.css';

const API_SEARCH_URL = `${process.env.REACT_APP_API_URL}/api/v1/users/search`;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [timeoutId, setTimeoutId] = useState(null);

  // Gestione input con debounce
  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutId);
    const id = setTimeout(() => searchUsers(val), 300);
    setTimeoutId(id);
  };

  // Cerca utenti e invia token JWT
  const searchUsers = async (text) => {
    if (text.length < 1) return setResults([]);

    const token = sessionStorage.getItem("token");
    if (!token) {
      console.error("❌ Token mancante in sessionStorage");
      return;
    }

    try {
      const res = await fetch(`${API_SEARCH_URL}?q=${encodeURIComponent(text)}`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!res.ok) {
        console.error("❌ Errore nella risposta:", res.status);
        return;
      }

      const data = await res.json();
      const utenti = Array.isArray(data) ? data : data.results || [];
      const filtrati = utenti.filter(u => u._id !== currentUserId);
      setResults(filtrati);
    } catch (err) {
      console.error("❌ Errore nella ricerca utenti:", err);
    }
  };

  // Invio con tasto Invio
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        onSelect(results[0]);
        setQuery('');
        setResults([]);
      }
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
            key={user._id}
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

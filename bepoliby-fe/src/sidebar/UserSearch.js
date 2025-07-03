import React, { useEffect, useState } from 'react';
import './UserSearch.css';

const API_SEARCH_URL = `${process.env.REACT_APP_API_URL}/api/search-users`;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutId);
    const id = setTimeout(() => searchUsers(val), 300);
    setTimeoutId(id);
  };

  const searchUsers = async (text) => {
    if (text.length < 1) return setResults([]);
    try {
      const res = await fetch(`${API_SEARCH_URL}?q=${encodeURIComponent(text)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      const utenti = Array.isArray(data) ? data : data.results || [];
      const filtrati = utenti.filter(u => u.id !== currentUserId && u._id !== currentUserId);
      setResults(filtrati);
    } catch (err) {
      console.error("Errore nella ricerca utenti:", err);
    }
  };

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Cerca utente per username..."
        value={query}
        onChange={handleInput}
      />
      <div className="user-search-results">
        {results.map(user => (
          <div key={user.id || user._id} onClick={() => onSelect(user)} className="user-result">
            <img src={user.profilePicUrl || "/default-avatar.png"} alt="avatar" />
            <strong>{user.username}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

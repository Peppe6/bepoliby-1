
import React, { useState } from 'react';
import './UserSearch.css';  // Se hai uno stile personalizzato

// Puoi settare qui l'URL backend principale o meglio via .env
const API_SEARCH_URL = `${process.env.REACT_APP_BACKEND_MAIN_URL || "https://bepoliby-1.onrender.com/"}/api/search-users`;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [timeoutId, setTimeoutId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const cercaUtente = async (text) => {
    if (!text.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      console.warn("⚠️ Nessun token JWT in sessionStorage");
      setResults([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_SEARCH_URL}?q=${encodeURIComponent(text)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // se il backend lo richiede (sessioni, cookie)
      });

      if (!res.ok) {
        console.error("❌ Errore nella ricerca utenti:", res.status);
        setResults([]);
        return;
      }

      const data = await res.json();
      // data.results o data (dipende da come risponde il backend)
      const users = Array.isArray(data) ? data : data.results || [];
      const filtered = users.filter(u => u.id !== currentUserId && u._id !== currentUserId);
      setResults(filtered);
    } catch (err) {
      console.error("❌ Errore fetch utenti:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutId);
    setIsLoading(true);

    const id = setTimeout(() => {
      cercaUtente(val);
    }, 300);

    setTimeoutId(id);
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && results.length > 0) {
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
        aria-label="Cerca utente"
      />
      {isLoading && <div className="loading">Caricamento...</div>}
      <div className="user-search-results">
        {results.length > 0 ? (
          results.map(user => (
            <div
              key={user.id || user._id}
              className="user-result"
              tabIndex={0}
              onClick={() => {
                onSelect(user);
                setQuery('');
                setResults([]);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(user);
                  setQuery('');
                  setResults([]);
                }
              }}
              role="button"
              aria-pressed="false"
            >
              <img
                src={user.profilePicUrl || "/default-avatar.png"}
                alt={`${user.username || "utente"} avatar`}
                onError={e => { e.currentTarget.src = "/default-avatar.png"; }}
              />
              <strong>{user.username}</strong>
            </div>
          ))
        ) : (
          !isLoading && <div className="no-results">Nessun risultato trovato</div>
        )}
      </div>
    </div>
  );
}

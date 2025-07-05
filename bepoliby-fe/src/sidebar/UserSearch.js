import React, { useState, useEffect } from 'react';
import './UserSearch.css'; // CSS personalizzato

const API_SEARCH_URL = `${process.env.REACT_APP_BACKEND_MAIN_URL || "https://bepoliby-1.onrender.com"}/api/v1/users/search`;

const LIMIT = 10;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const fetchUsers = async (text, pageNum = 1) => {
    if (!text.trim()) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
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
      setIsLoading(true);

      const res = await fetch(`${API_SEARCH_URL}?q=${encodeURIComponent(text)}&page=${pageNum}&limit=${LIMIT}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        console.error("❌ Errore nella ricerca utenti:", res.status);
        setResults([]);
        setHasMore(false);
        return;
      }

      const data = await res.json();
      const users = data.results || [];

      const filtered = users.filter(u => u.id !== currentUserId && u._id !== currentUserId);
      setResults(prev => pageNum === 1 ? filtered : [...prev, ...filtered]);
      setTotal(data.total || 0);
      setHasMore(filtered.length === LIMIT);
      setPage(pageNum);
    } catch (err) {
      console.error("❌ Errore fetch utenti:", err);
      setResults([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timeoutId);
    setPage(1);
    setResults([]);
    setHasMore(false);

    const id = setTimeout(() => {
      fetchUsers(val, 1);
    }, 300);

    setTimeoutId(id);
  };

  const loadMore = () => {
    fetchUsers(query, page + 1);
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && results.length > 0) {
      onSelect(results[0]);
      setQuery('');
      setResults([]);
      setPage(1);
    }
  };

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Cerca utente per username o nome..."
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-label="Cerca utente"
      />

      {isLoading && <div className="loading">Caricamento...</div>}

      <div className="user-search-results">
        {results.length > 0 ? (
          <>
            {results.map(user => (
              <div
                key={user.id || user._id}
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
                <img
                  src={user.profilePicUrl || "/default-avatar.png"}
                  alt={`${user.username || "utente"} avatar`}
                  onError={e => { e.currentTarget.src = "/default-avatar.png"; }}
                />
                <strong>{user.username}</strong>
              </div>
            ))}
            {hasMore && (
              <button className="load-more-btn" onClick={loadMore}>
                Carica altri
              </button>
            )}
          </>
        ) : (
          !isLoading && query && <div className="no-results">Nessun risultato trovato</div>
        )}
      </div>
    </div>
  );
}


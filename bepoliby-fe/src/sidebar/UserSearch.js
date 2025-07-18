import React, { useState, useEffect } from 'react';
import './UserSearch.css';
import { Avatar } from '@mui/material';

const API_SEARCH_URL = `${process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com"}/api/v1/users/search`;
const LIMIT = 10;

export default function UserSearch({ currentUserId, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!query) {
        setResults([]);
        setHasMore(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`${API_SEARCH_URL}?q=${encodeURIComponent(query)}&page=${page}&limit=${LIMIT}`, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
          }
        });

        const data = await res.json();
        const processedResults = data.results.filter(u => u._id !== currentUserId);

        if (page === 1) {
          setResults(processedResults);
        } else {
          setResults(prev => [...prev, ...processedResults]);
        }

        setHasMore(data.results.length === LIMIT);
      } catch (err) {
        console.error("Errore ricerca utenti:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [query, page, currentUserId]);

  const handleInput = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setPage(1);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
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
            {results.map(user => {
              const key = user._id;
              const name = user.nome || user.username || "Utente";
              const avatarUrl = user.profilePicUrl || '/fotoprofilo.png';

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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar sx={{ width: 40, height: 40 }}>
                    <img
                      src={avatarUrl}
                      alt={`${name} avatar`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/fotoprofilo.png';
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%',
                      }}
                    />
                  </Avatar>
                  <strong>{name}</strong>
                </div>
              );
            })}
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







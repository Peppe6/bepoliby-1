import React, { useState } from 'react';
import './UserSearch.css';
import { Avatar } from '@mui/material';

const API_SEARCH_URL = `${process.env.REACT_APP_API_URL || "https://bepoliby-1.onrender.com"}/api/v1/users/search`;
const LIMIT = 10;

export default function UserSearch({ currentUserId, onSelect }) {
  // ...stessa logica fetch e stato...

  // solo la parte render:
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
              const key = user._id || user.id;
              const name = user.nome || user.username || "Utente";
              const avatarUrl = user.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

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
                  />
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

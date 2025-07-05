import React, { useState } from 'react';

export default function SimpleUserSearch() {
  const [results, setResults] = useState([]);
  const token = sessionStorage.getItem('token');

  const search = async () => {
    if (!token) return;
    const res = await fetch('https://bepoliby-1.onrender.com/api/v1/users/search?q=giuseppe&page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setResults(data.results || []);
  };

  return (
    <div>
      <button onClick={search}>Test ricerca utenti "giuseppe"</button>
      <ul>
        {results.map(u => (
          <li key={u.id}>{u.username} ({u.nome})</li>
        ))}
      </ul>
    </div>
  );
}

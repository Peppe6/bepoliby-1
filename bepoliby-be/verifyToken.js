
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Se la rotta non richiede un token (es. la ricerca utenti), prosegui senza verificarlo
  if (req.path === "/api/v1/users" || req.path === "/api/v1/users/search") {
    return next();
  }

  const token = req.headers["authorization"]?.split(" ")[1]; // Recupera il token da Authorization header
  
  if (!token) {
    return res.status(401).json({ message: "Token mancante" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token non valido" });
    }

    // Aggiungi il payload del token (i dati dell'utente) all'oggetto della richiesta
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;









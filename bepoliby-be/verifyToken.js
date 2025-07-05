



const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Rotte pubbliche, che non richiedono autenticazione
  const publicPaths = ["/api/v1/auth/login", "/api/v1/auth/register"];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token mancante" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token non valido" });
    }

    req.user = decoded; // Aggiungo i dati utente alla request
    next();
  });
};

module.exports = verifyToken;





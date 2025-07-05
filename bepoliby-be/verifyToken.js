
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Rotte pubbliche
  const publicPaths = [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/users/search",
    "/api/v1/users", // se anche questa è pubblica
    "/api/user-photo" // per le immagini profilo
  ];

  // Controlla se la rotta inizia con uno dei path pubblici
  if (publicPaths.some(path => req.path.startsWith(path))) {
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

    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;





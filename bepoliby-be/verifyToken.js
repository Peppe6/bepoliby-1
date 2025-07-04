
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token mancante" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Token non valido" });
    }

    // ✅ Debug utile temporaneo
    console.log("✅ Utente decodificato dal token:", payload);

    // ✅ payload.id DEVE corrispondere al campo _id MongoDB
    req.user = {
      uid: payload.id,           // <-- questo sarà confrontato con _id nel database
      username: payload.username,
      nome: payload.nome
    };

    next();
  });
}

module.exports = verifyToken;




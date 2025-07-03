
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    // Rimappo i campi per coerenza con il resto del codice
    req.user = {
      uid: user.id || user.uid,
      nome: user.name || user.nome,
      username: user.username || user.email || null
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

module.exports = verifyToken;

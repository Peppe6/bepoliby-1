
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: "Token mancante" });
  }

 
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: "Formato token non valido" });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // dati utente in req.user per usarli nelle rotte
    req.user = {
      uid: decoded.id,
      nome: decoded.nome,
      username: decoded.username
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token non valido o scaduto" });
  }
}

module.exports = verifyToken;





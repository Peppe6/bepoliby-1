const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("No authorization header");
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log("No token in header");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Utente decodificato dal token:", user);

    req.user = {
      uid: user.id || user._id || user.ID || null,
      nome: user.nome || null,
      username: user.username || user.email || null
    };

    if (!req.user.uid) {
      return res.status(401).json({ message: "Token non valido (manca uid)" });
    }

    next();
  } catch (err) {
    console.log("Token invalid:", err.message);
    return res.status(403).json({ message: "Invalid token" });
  }
}

module.exports = verifyToken;





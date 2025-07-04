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
    console.log("User decoded from token:", user);

    req.user = {
      id: user.id,
      uid: user.id, // ✅ PATCH: compatibilità con codice esistente
      nome: user.nome,
      username: user.username
    };
    next();
  } catch (err) {
    console.log("Token invalid:", err.message);
    return res.status(403).json({ message: "Invalid token" });
  }
}

module.exports = verifyToken;



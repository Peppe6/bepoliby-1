
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

    // 🔥 Normalizza i campi
    req.user = {
      id: user.ID || user.id || user._id,
      uid: user.ID || user.id || user._id,
      nome: user.nome,
      username: user["nome utente"] || user.username || user.email
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



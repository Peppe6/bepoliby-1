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
      uid: user.id || user.uid,
      nome: user.name || user.nome,
      username: user.username || user.email || null
    };
    next();
  } catch (err) {
    console.log("Token invalid:", err.message);
    return res.status(403).json({ message: "Invalid token" });
  }
}
module.exports = verifyToken;

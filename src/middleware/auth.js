// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

// -----------------------
// Express JWT middleware
// -----------------------
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) return res.status(401).json({ message: 'Invalid token user' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// -----------------------
// Role authorization
// -----------------------
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'User not authenticated' });

    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: insufficient role' });

    next();
  };
};

// -----------------------
// Socket.IO authentication
// -----------------------
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: token required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) return next(new Error('Authentication error: invalid user'));

    socket.userId = user.id; // attach userId to socket
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

module.exports = { authenticateToken, authorizeRoles, authenticateSocket };

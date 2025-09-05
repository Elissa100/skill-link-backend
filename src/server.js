const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const bidRoutes = require('./routes/bids');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const { setupSwagger } = require('./config/swagger');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateSocket } = require('./middleware/auth');
const MessageService = require('./services/MessageService');
const { connectRedis } = require('./config/redis');

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Swagger docs
setupSwagger(app);

// Socket.IO auth
io.use(authenticateSocket);

// Socket.IO events
io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);

  socket.on('join_task', (taskId) => {
    socket.join(`task_${taskId}`);
    console.log(`User ${socket.userId} joined task ${taskId}`);
  });

  socket.on('leave_task', (taskId) => {
    socket.leave(`task_${taskId}`);
    console.log(`User ${socket.userId} left task ${taskId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const message = await MessageService.createMessage({
        content: data.content,
        senderId: socket.userId,
        taskId: data.taskId
      });
      io.to(`task_${data.taskId}`).emit('new_message', message);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Error handler & 404
app.use(errorHandler);
app.use('*', (req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await connectRedis();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
    });
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
})();

module.exports = { app, server, io };

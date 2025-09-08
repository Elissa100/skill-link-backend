const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

// Import our beautiful logger
const logger = require('./config/logger');

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
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });
    res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
  }
});

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  req.startTime = Date.now();
  next();
});

// Beautiful request logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      userId: req.user?.id || 'anonymous',
      contentLength: Buffer.isBuffer(data) ? data.length : (typeof data === 'string' ? data.length : 'unknown')
    });
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    const duration = Date.now() - req.startTime;
    logger.info('API Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      userId: req.user?.id || 'anonymous',
      dataSize: JSON.stringify(data).length
    });
    return originalJson.call(this, data);
  };
  
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "http://localhost:5173", 
  credentials: true,
  optionsSuccessStatus: 200
}));

// Request logging with Morgan (for development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId
  });
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes with logging
app.use('/api/auth', (req, res, next) => {
  logger.info('Auth route accessed', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    requestId: req.requestId
  });
  next();
}, authRoutes);

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Swagger docs
setupSwagger(app);

// Enhanced error handler with logging
app.use((error, req, res, next) => {
  const duration = Date.now() - req.startTime;
  
  logger.error('Application error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
      },
      ip: req.ip,
      requestId: req.requestId
    },
    user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : 'anonymous',
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });

  // Call the original error handler
  errorHandler(error, req, res, next);
});

// 404 handler with logging
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
    userId: req.user?.id || 'anonymous'
  });
  
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
});

// Socket.IO auth with logging
io.use((socket, next) => {
  logger.info('Socket authentication attempt', {
    socketId: socket.id,
    handshake: {
      address: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      auth: socket.handshake.auth ? '[PRESENT]' : '[MISSING]'
    }
  });
  
  authenticateSocket(socket, next);
});

// Socket.IO events with logging
io.on('connection', (socket) => {
  logger.info('🔗 User connected to socket', {
    socketId: socket.id,
    userId: socket.userId,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });

  socket.on('join_task', (taskId) => {
    socket.join(`task_${taskId}`);
    logger.info('📋 User joined task room', {
      socketId: socket.id,
      userId: socket.userId,
      taskId,
      room: `task_${taskId}`
    });
  });

  socket.on('leave_task', (taskId) => {
    socket.leave(`task_${taskId}`);
    logger.info('🚪 User left task room', {
      socketId: socket.id,
      userId: socket.userId,
      taskId,
      room: `task_${taskId}`
    });
  });

  socket.on('send_message', async (data) => {
    try {
      const message = await MessageService.createMessage({
        content: data.content,
        senderId: socket.userId,
        taskId: data.taskId
      });
      
      io.to(`task_${data.taskId}`).emit('new_message', message);
      
      logger.info('💬 Message sent successfully', {
        socketId: socket.id,
        userId: socket.userId,
        taskId: data.taskId,
        messageId: message.id,
        contentLength: data.content.length
      });
    } catch (error) {
      logger.error('❌ Failed to send message', {
        socketId: socket.id,
        userId: socket.userId,
        taskId: data.taskId,
        error: error.message,
        stack: error.stack
      });
      
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info('🔌 User disconnected from socket', {
      socketId: socket.id,
      userId: socket.userId,
      reason,
      uptime: socket.handshake.issued
    });
  });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info('🛑 Received shutdown signal', { signal });
  
  server.close(() => {
    logger.info('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('❌ Forced server shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Promise Rejection', {
    reason: reason.message || reason,
    stack: reason.stack,
    promise: promise.toString()
  });
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    name: error.name
  });
  process.exit(1);
});

// Start server with beautiful logging
(async () => {
  try {
    logger.info('🚀 Starting SkillLink server...', {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });

    await connectRedis();
    logger.info('✅ Redis connection established');

    server.listen(PORT, () => {
      logger.info('🎯 SkillLink server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.FRONTEND_URL || "http://localhost:5173",
        docsUrl: `http://localhost:${PORT}/docs`,
        healthUrl: `http://localhost:${PORT}/health`,
        timestamp: new Date().toISOString()
      });
    });

  } catch (err) {
    logger.error('💥 Failed to start server', {
      error: err.message,
      stack: err.stack,
      code: err.code
    });
    process.exit(1);
  }
})();

module.exports = { app, server, io };
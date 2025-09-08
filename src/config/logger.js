const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ANSI color codes for beautiful console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  
  // Additional colors for status codes
  orange: '\x1b[38;5;208m',
  purple: '\x1b[35m',
  pink: '\x1b[38;5;205m'
};

// Emojis for different log levels
const emojis = {
  error: '🚨',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🔍',
  success: '✅',
  http: '🌐',
  database: '🗄️',
  security: '🔒',
  performance: '⚡',
  socket: '🔌',
  audit: '📋'
};

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Get current timestamp
const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
};

// Get color for HTTP status codes
const getStatusCodeColor = (statusCode) => {
  if (!statusCode) return colors.white;
  
  const code = parseInt(statusCode);
  
  // 2xx - Success (Green)
  if (code >= 200 && code < 300) {
    return colors.bgGreen + colors.bright;
  }
  
  // 3xx - Redirection (Orange)
  if (code >= 300 && code < 400) {
    return colors.orange + colors.bright;
  }
  
  // 4xx - Client Error (Red)
  if (code >= 400 && code < 500) {
    return colors.bgRed + colors.bright;
  }
  
  // 5xx - Server Error (Magenta/Purple)
  if (code >= 500 && code < 600) {
    return colors.bgMagenta + colors.bright;
  }
  
  // Default
  return colors.white;
};

// Format log message with colors and emojis
const formatMessage = (level, message, meta = {}) => {
  const timestamp = getTimestamp();
  const emoji = emojis[level] || '📝';
  const levelColor = {
    error: colors.red,
    warn: colors.yellow,
    info: colors.green,
    debug: colors.blue,
    success: colors.green,
    http: colors.magenta,
    database: colors.cyan,
    security: colors.red,
    performance: colors.yellow,
    socket: colors.blue,
    audit: colors.gray
  }[level] || colors.white;
  
  let output = `${colors.gray}${timestamp}${colors.reset} ${levelColor}${emoji} ${level.toUpperCase()}${colors.reset}: ${message}`;
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    const metaStr = Object.entries(meta)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        // Special handling for statusCode
        if (key === 'statusCode' && typeof value === 'number') {
          const statusColor = getStatusCodeColor(value);
          return `${colors.cyan}${key}${colors.reset}: ${statusColor}${value}${colors.reset}`;
        }
        
        if (typeof value === 'object') {
          return `${colors.cyan}${key}${colors.reset}: ${JSON.stringify(value, null, 2)}`;
        }
        return `${colors.cyan}${key}${colors.reset}: ${colors.white}${value}${colors.reset}`;
      })
      .join('\n   ');
    
    if (metaStr) {
      output += `\n   ${metaStr}`;
    }
  }
  
  return output;
};

// Write to file
const writeToFile = (filename, content) => {
  const filePath = path.join(logsDir, filename);
  const logEntry = `[${getTimestamp()}] ${content.replace(/\x1b\[[0-9;]*m/g, '')}\n`;
  
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) {
      console.error(`Failed to write to log file ${filename}:`, err);
    }
  });
};

// Create logger object
const logger = {
  // Basic logging methods
  error: (message, meta = {}) => {
    const formatted = formatMessage('error', message, meta);
    console.error(formatted);
    writeToFile('error.log', formatted);
    writeToFile('app.log', formatted);
  },
  
  warn: (message, meta = {}) => {
    const formatted = formatMessage('warn', message, meta);
    console.warn(formatted);
    writeToFile('app.log', formatted);
  },
  
  info: (message, meta = {}) => {
    const formatted = formatMessage('info', message, meta);
    console.info(formatted);
    writeToFile('app.log', formatted);
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const formatted = formatMessage('debug', message, meta);
      console.debug(formatted);
      writeToFile('debug.log', formatted);
    }
  },
  
  http: (message, meta = {}) => {
    const formatted = formatMessage('http', message, meta);
    console.log(formatted);
    writeToFile('http.log', formatted);
    writeToFile('app.log', formatted);
  },
  
  // Specialized logging methods
  success: (message, meta = {}) => {
    const formatted = formatMessage('success', message, meta);
    console.log(formatted);
    writeToFile('app.log', formatted);
  },
  
  database: (message, meta = {}) => {
    const formatted = formatMessage('database', message, meta);
    console.log(formatted);
    writeToFile('database.log', formatted);
  },
  
  security: (message, meta = {}) => {
    const formatted = formatMessage('security', message, meta);
    console.warn(formatted);
    writeToFile('security.log', formatted);
    writeToFile('app.log', formatted);
  },
  
  performance: (operation, duration, meta = {}) => {
    const message = `${operation} completed`;
    const formatted = formatMessage('performance', message, { duration: `${duration}ms`, ...meta });
    console.log(formatted);
    writeToFile('performance.log', formatted);
    writeToFile('app.log', formatted);
  },
  
  socket: (message, meta = {}) => {
    const formatted = formatMessage('socket', message, meta);
    console.log(formatted);
    writeToFile('socket.log', formatted);
  },
  
  audit: (action, userId, meta = {}) => {
    const message = `User ${userId}: ${action}`;
    const formatted = formatMessage('audit', message, { userId, ...meta });
    console.log(formatted);
    writeToFile('audit.log', formatted);
    writeToFile('app.log', formatted);
  }
};

// Add generic log method
logger.log = (level, message, meta = {}) => {
  if (logger[level]) {
    logger[level](message, meta);
  } else {
    logger.info(message, meta);
  }
};

module.exports = logger;
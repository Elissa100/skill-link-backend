const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large',
      error: 'File size exceeds the maximum allowed size'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: 'Unexpected file field',
      error: error.message
    });
  }

  // Prisma errors
  if (error.code === 'P2002') {
    return res.status(409).json({
      message: 'Conflict',
      error: 'A record with this data already exists'
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      message: 'Not found',
      error: 'Record not found'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      error: error.message
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      error: error.message
    });
  }

  // Default error
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = { errorHandler };
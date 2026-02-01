const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'moodmint-dev-secret';

/**
 * Middleware to verify JWT and attach agent info to request
 */
function authenticateAgent(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.agent = {
      id: decoded.agentId,
      openclawId: decoded.openclawId
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set req.agent
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.agent = {
      id: decoded.agentId,
      openclawId: decoded.openclawId
    };
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  
  next();
}

module.exports = { authenticateAgent, optionalAuth };

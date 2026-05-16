const { getAuth } = require('@clerk/express');

/**
 * Middleware to require authentication for specific routes.
 * Returns 401 Unauthorized if no userId is found in the session.
 */
function requireAuth(req, res, next) {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

module.exports = requireAuth;

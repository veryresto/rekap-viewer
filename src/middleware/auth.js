const { 
    extractSessionFromCookieHeader, 
    verifyJwt, 
    fetchApprovalStatus, 
    buildPortalRedirectUrl 
} = require('../auth');

const DEV_BYPASS_AUTH = process.env.DEV_BYPASS_AUTH === 'true';

/**
 * Step 1 — Authentication gate.
 * Reads and verifies the veryresto-auth cookie.
 * SUCCESS → attaches req.user, calls next().
 * FAILURE → 302 to portal (browser requests) or 401 JSON (API/XHR requests).
 */
async function requireAuth(req, res, next) {
    if (DEV_BYPASS_AUTH) {
        req.user = { id: 'dev-bypass-user', email: 'dev@localtest.me' };
        return next();
    }

    const cookieHeader = req.headers.cookie;
    const session = extractSessionFromCookieHeader(cookieHeader);
    
    if (!session || !session.access_token) {
        return handleAuthFailure(req, res);
    }
    
    const user = await verifyJwt(session.access_token);
    if (!user) {
        return handleAuthFailure(req, res);
    }
    
    req.user = user;
    next();
}

function handleAuthFailure(req, res) {
    const isApiRequest = req.path.startsWith('/api/');
    
    if (isApiRequest) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Must use req.originalUrl to preserve query strings.
    const currentUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const redirectUrl = buildPortalRedirectUrl(currentUrl);
    
    if (!redirectUrl) {
        // Fallback to portal root if origin isn't allowed (auth failure)
        return res.redirect(process.env.PORTAL_URL || 'https://community.veryresto.com');
    }
    
    res.redirect(redirectUrl);
}

/**
 * Step 2 — Governance gate.
 * Requires req.user set by requireAuth.
 * SUCCESS → calls next().
 * FAILURE → auth-denied.html?reason= (browser) or 403 JSON (API/XHR requests).
 *           Sets Cache-Control: no-store so the denial page is never cached.
 */
async function requireApprovedResident(req, res, next) {
    if (DEV_BYPASS_AUTH) {
        return next();
    }

    if (!req.user) {
        return handleAuthFailure(req, res);
    }
    
    const status = await fetchApprovalStatus(req.user.id);
    
    if (status === 'approved') {
        return next();
    }
    
    const isApiRequest = req.path.startsWith('/api/');
    if (isApiRequest) {
        return res.status(403).json({ error: 'Access denied', reason: status || 'unknown' });
    }
    
    // Governance denial -> redirect to auth-denied page
    res.set('Cache-Control', 'no-store');
    res.redirect(`/auth-denied?reason=${status || 'unknown'}`);
}

module.exports = {
    requireAuth,
    requireApprovedResident
};

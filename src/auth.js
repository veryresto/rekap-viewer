const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORTAL_URL = process.env.PORTAL_URL || 'https://community.veryresto.com';

// Redirect Allowlist Validation
const ALLOWED_RETURN_ORIGINS = [
    'http://rekap.localtest.me:3000',
    'https://rekap.veryresto.com'
];

let supabase = null;

// Multi-level in-process cache with TTL for auth performance and rate limit prevention
const jwtCache = new Map();
const approvalCache = new Map();
const CACHE_TTL_MS = 45 * 1000; // 45 seconds

// Periodically clean up expired cache entries to prevent memory growth
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of jwtCache.entries()) {
        if (now >= val.expiresAt) {
            jwtCache.delete(key);
        }
    }
    for (const [key, val] of approvalCache.entries()) {
        if (now >= val.expiresAt) {
            approvalCache.delete(key);
        }
    }
}, 10 * 60 * 1000); // every 10 minutes

if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
}

function getSupabase() {
    if (!supabase) {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false },
            realtime: { transport: require('ws') }
        });
    }
    return supabase;
}

// Parse the veryresto-auth cookie value from a raw cookie header string.
// Returns { access_token, refresh_token } or null.
function extractSessionFromCookieHeader(cookieHeader) {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('veryresto-auth='));
    
    if (!authCookie) return null;
    
    try {
        const cookieValue = authCookie.split('=')[1];
        const decoded = decodeURIComponent(cookieValue);
        const parsed = JSON.parse(decoded);
        return parsed; 
    } catch (e) {
        console.error('Failed to parse veryresto-auth cookie:', e.message);
        return null;
    }
}

// Verify a JWT with Supabase Auth. Returns the user object or null.
async function verifyJwt(accessToken) {
    if (!accessToken) return null;
    
    const cached = jwtCache.get(accessToken);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.user;
    }
    
    try {
        const client = getSupabase();
        const { data, error } = await client.auth.getUser(accessToken);
        
        if (error || !data?.user) {
            return null;
        }
        
        jwtCache.set(accessToken, {
            user: data.user,
            expiresAt: Date.now() + CACHE_TTL_MS
        });
        
        return data.user;
    } catch (e) {
        console.error('Error verifying JWT:', e.message);
        return null;
    }
}

// Query profiles.approval_status for a given user ID.
// Returns 'approved' | 'rejected' | 'suspended' | 'pending' | null.
async function fetchApprovalStatus(userId) {
    if (!userId) return null;
    
    const cached = approvalCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.status;
    }
    
    try {
        const client = getSupabase();
        const { data, error } = await client
            .from('profiles')
            .select('approval_status')
            .eq('id', userId)
            .single();
            
        if (error) {
            console.error('Error fetching approval status:', error.message);
            return null;
        }
        
        const status = data?.approval_status || null;
        if (status) {
            approvalCache.set(userId, {
                status: status,
                expiresAt: Date.now() + CACHE_TTL_MS
            });
        }
        
        return status;
    } catch (e) {
        console.error('Error fetching approval status:', e.message);
        return null;
    }
}

// Build the full portal redirect URL preserving the current request URL,
// INCLUDING query string (e.g. ?blok=A&search=123).
function buildPortalRedirectUrl(currentUrl) {
    try {
        const urlObj = new URL(currentUrl);
        
        if (!ALLOWED_RETURN_ORIGINS.includes(urlObj.origin)) {
            console.warn(`Origin ${urlObj.origin} is not in ALLOWED_RETURN_ORIGINS`);
            return null;
        }
        
        const encodedUrl = encodeURIComponent(currentUrl);
        return `${PORTAL_URL}/?redirect_to=${encodedUrl}`;
    } catch (e) {
        console.error('Error building redirect URL:', e.message);
        return null;
    }
}

async function globalLogout(accessToken) {
    if (!accessToken) return;
    try {
        const url = `${SUPABASE_URL}/auth/v1/logout?scope=global`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!res.ok) {
            console.error('Global logout failed:', await res.text());
        }
    } catch (e) {
        console.error('Error during global logout:', e.message);
    }
}

module.exports = {
    extractSessionFromCookieHeader,
    verifyJwt,
    fetchApprovalStatus,
    buildPortalRedirectUrl,
    globalLogout
};

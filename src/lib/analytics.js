const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Scopes Supabase queries with the user's JWT to resolve RLS properly
function getSupabaseUserClient(accessToken) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        },
        realtime: { transport: require('ws') }
    });
}

async function track(accessToken, userId, eventName, properties = {}) {
  try {
    if (!accessToken || !userId) return;
    const client = getSupabaseUserClient(accessToken);
    const { error } = await client.from('analytics_events').insert({
      user_id: userId,
      app_slug: 'rekap_viewer',
      event_name: eventName,
      properties: properties || {}
    });
    if (error) {
      console.error('[analytics] Error writing to Supabase:', error.message);
    }
  } catch (error) {
    // Fail silently
    console.error('[analytics] Failed to track event:', error.message || error);
  }
}

module.exports = { track };

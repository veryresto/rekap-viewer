require('dotenv').config();
const express = require('express');
const path = require('path');
const { uploadCache, readCache } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Configuration from environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SHEET_ID = process.env.SHEET_ID;
const RANGE = process.env.RANGE || 'Import!A1:ZZ550';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Middleware for logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const region = process.env.FLY_REGION || 'local';
        console.log(`[${region}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), region: process.env.FLY_REGION });
});

/**
 * Fetch and process data from Google Sheets
 */
async function fetchGoogleSheetsData() {
    if (!GOOGLE_API_KEY || !SHEET_ID) {
        throw new Error('Missing GOOGLE_API_KEY or SHEET_ID');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&key=${GOOGLE_API_KEY}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for refresh

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || `Google API returned ${response.status}`);
        }

        const data = await response.json();
        
        // Filter out index 2 (Nama) if values exist
        if (data.values && Array.isArray(data.values)) {
            data.values = data.values.map(row => {
                if (row.length > 2) {
                    const newRow = [...row];
                    newRow.splice(2, 1); // Remove 3rd element (index 2)
                    return newRow;
                }
                return row;
            });
        }
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Refresh the cache in Tigris
 */
async function refreshCache() {
    const region = process.env.FLY_REGION || 'local';
    console.log(`[${region}] Cache refresh started...`);
    const start = Date.now();

    try {
        const data = await fetchGoogleSheetsData();
        const cacheObject = {
            updatedAt: new Date().toISOString(),
            region: region,
            data: data
        };

        await uploadCache(cacheObject);
        const duration = Date.now() - start;
        console.log(`[${region}] Cache refresh success - ${duration}ms`);
        return true;
    } catch (error) {
        console.error(`[${region}] Cache refresh failed:`, error.message);
        return false;
    }
}

// API endpoint serving from cache
app.get('/api/rekap', async (req, res) => {
    try {
        const cache = await readCache();
        
        if (!cache) {
            console.error('Cache not found in storage');
            return res.status(404).json({ error: 'Data not available yet. Please try again in a few minutes.' });
        }

        const updatedAt = new Date(cache.updatedAt);
        const ageSeconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);

        // Add headers
        res.setHeader('X-Fly-Region', cache.region || 'unknown');
        res.setHeader('X-Cache-Updated-At', cache.updatedAt);
        res.setHeader('X-Cache-Age', ageSeconds);

        res.json(cache.data);
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start background refresh
setInterval(refreshCache, REFRESH_INTERVAL);

app.listen(PORT, HOST, async () => {
    console.log(`--------------------------------------------------`);
    console.log(`Rekap Viewer Backend (Cached) is running!`);
    console.log(`Region: ${process.env.FLY_REGION || 'local'}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`--------------------------------------------------`);

    // Initial refresh on startup
    console.log('Performing initial cache refresh...');
    await refreshCache();
});

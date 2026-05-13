require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Configuration from environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SHEET_ID = process.env.SHEET_ID;
const RANGE = process.env.RANGE || 'Import!A1:ZZ550';

// Middleware for logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Proxy for Google Sheets
app.get('/api/rekap', async (req, res) => {
    if (!GOOGLE_API_KEY || !SHEET_ID) {
        console.error('Missing GOOGLE_API_KEY or SHEET_ID in environment variables');
        return res.status(500).json({ error: 'Server configuration error: missing credentials' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&key=${GOOGLE_API_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData?.error?.message || `Google API returned ${response.status}`;
            console.error(`Google API Failure: ${response.status} - ${message}`);
            return res.status(response.status).json({ error: message });
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

        res.json(data);
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('Google API Request timed out after 8s');
            return res.status(504).json({ error: 'Request to Google Sheets timed out' });
        }
        console.error('Fetch Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error while fetching data' });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`--------------------------------------------------`);
    console.log(`Rekap Viewer Backend is running!`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://${HOST}:${PORT}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`--------------------------------------------------`);
});

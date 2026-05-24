const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET_NAME = process.env.BUCKET_NAME;
const CACHE_KEY = 'rekap-cache.json';

// In-process cache variables to minimize Tigris object storage API reads
let localMemoryCache = null;
let cacheExpiresAt = 0;
const MEMORY_CACHE_TTL_MS = 30 * 1000; // 30 seconds

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || 'https://fly.storage.tigris.dev',
    forcePathStyle: false,
});

/**
 * Upload data to Tigris object storage
 * @param {Object} data - The data to store
 */
async function uploadCache(data) {
    if (!BUCKET_NAME) {
        throw new Error('BUCKET_NAME environment variable is not set');
    }

    const body = JSON.stringify(data);
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: CACHE_KEY,
        Body: body,
        ContentType: 'application/json',
    });

    try {
        const start = Date.now();
        await s3Client.send(command);
        const duration = Date.now() - start;

        // Update in-memory cache immediately to stay hot and consistent
        localMemoryCache = data;
        cacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;

        return { success: true, duration };
    } catch (error) {
        console.error('Tigris Upload Error:', error);
        throw error;
    }
}

/**
 * Read data from Tigris object storage
 * @returns {Promise<Object|null>} The cached data or null if not found
 */
async function readCache() {
    if (!BUCKET_NAME) {
        throw new Error('BUCKET_NAME environment variable is not set');
    }

    // Check if valid in-memory cache exists
    if (localMemoryCache && Date.now() < cacheExpiresAt) {
        return localMemoryCache;
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: CACHE_KEY,
    });

    try {
        const response = await s3Client.send(command);
        const bodyContents = await streamToString(response.Body);
        const parsed = JSON.parse(bodyContents);

        // Update in-memory cache
        localMemoryCache = parsed;
        cacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;

        return parsed;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return null;
        }
        console.error('Tigris Read Error:', error);
        // Fallback to stale in-memory cache if S3 is down
        if (localMemoryCache) {
            console.log('Serving stale in-memory cache due to S3 read failure');
            return localMemoryCache;
        }
        throw error;
    }
}

/**
 * Helper to convert stream to string
 */
async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

module.exports = {
    uploadCache,
    readCache,
    CACHE_KEY
};

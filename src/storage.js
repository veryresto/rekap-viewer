const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET_NAME = process.env.BUCKET_NAME;
const CACHE_KEY = 'rekap-cache.json';

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

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: CACHE_KEY,
    });

    try {
        const response = await s3Client.send(command);
        const bodyContents = await streamToString(response.Body);
        return JSON.parse(bodyContents);
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return null;
        }
        console.error('Tigris Read Error:', error);
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

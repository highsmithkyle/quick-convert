const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const inputImagePath = path.join(__dirname, 'images', 'test2.jpeg');
const tokenPath = path.join(__dirname, '..', 'secure', 'api-access-token.txt');
const keyFilename = path.join(__dirname, '..', 'secure', 'new-google-upload-credentials.json');
const bucketName = 'image-2d-to-3d';

// Upload image to Google Cloud Storage and get public URL
async function uploadImage() {
    const storage = new Storage({ keyFilename });
    const bucket = storage.bucket(bucketName);

    const uploadFile = async () => {
        const blob = bucket.file('test2.jpeg');
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: { contentType: 'image/jpeg' }
        });

        return new Promise((resolve, reject) => {
            blobStream.on('error', err => reject(err));
            blobStream.on('finish', () => {
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                resolve(publicUrl);
            });

            fs.createReadStream(inputImagePath).pipe(blobStream);
        });
    };

    try {
        const publicUrl = await uploadFile();
        console.log('Generated Public URL:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Generate a pre-signed URL for the result
async function generatePresignedUrl() {
    const storage = new Storage({ keyFilename });
    const fileName = 'result-file-name.png';

    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'image/png',
    };

    const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
    console.log('Generated signed URL:', url);
    return url;
}

// Get API access token from file
const getApiAccessToken = () => {
    try {
        const token = fs.readFileSync(tokenPath, 'utf8').trim();
        console.log('Retrieved API access token:', token);
        return token;
    } catch (error) {
        console.error('Error reading API access token:', error);
        return null;
    }
};

// Test the 2D to 3D API endpoint
async function test2DTo3D() {
    const inputImageUrl = await uploadImage();
    if (!inputImageUrl) {
        console.error('Failed to upload image and get URL.');
        return;
    }

    const accessToken = getApiAccessToken();
    if (!accessToken) {
        console.error('Failed to retrieve API access token.');
        return;
    }

    const resultPresignedUrl = await generatePresignedUrl();
    if (!resultPresignedUrl) {
        console.error('Failed to generate presigned URL.');
        return;
    }

    const correlationId = uuidv4();
    console.log('Generated correlationId:', correlationId); // Log the UUID to verify

    const authorizationHeader = `Bearer ${accessToken}`;

    console.log('Sending request to API with data:', {
        correlationId,
        inputImageUrl,
        resultPresignedUrl
    });

    try {
        const response = await axios.post(
            'https://api.immersity.ai/api/v1/disparity',
            {
                correlationId,
                inputImageUrl,
                resultPresignedUrl
            },
            {
                headers: {
                    Authorization: authorizationHeader,
                    'Content-Type': 'application/json'
                },
                timeout: 180000
            }
        );
        console.log('2D to 3D response:', response.data);
    } catch (error) {
        console.error('API Call Failed:', error.response ? error.response.data : error.message);

        // Log detailed error information with proper formatting
        if (error.response) {
            console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
}

test2DTo3D();

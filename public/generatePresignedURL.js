const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Update the path to your service account key file relative to the public directory
const keyFilename = path.join(__dirname, '..', 'secure', 'new-google-upload-credentials.json');

// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilename;

// Replace with your bucket name
const bucketName = 'upload-to-gc';
// Replace with the desired file name for the result file
const fileName = 'result-file-name.png';

const storage = new Storage();

async function generateV4UploadSignedUrl() {
    // These options will allow temporary uploading of a file
    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'image/png', // Adjust content type based on your file type
    };

    // Get a v4 signed URL for uploading file
    const [url] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl(options);

    console.log('Generated signed URL:', url);
    return url;
}

generateV4UploadSignedUrl().catch(console.error);
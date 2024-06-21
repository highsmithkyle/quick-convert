require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');

// Function to get access token
const getApiAccessToken = async () => {
    const url = 'https://auth.immersity.ai/auth/realms/immersity/protocol/openid-connect/token';
    const data = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'af443606-de91-4d07-802f-8598369f8be7',
        client_secret: 'G1rU2dPC39pw8OQr54wdghVPQoKhOpVN',
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('Access token fetched successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Function to generate pre-signed URL
const generatePresignedUrl = (callback) => {
    const credentialsPath = '/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/new-google-upload-credentials.json';
    const bucketName = 'image-2d-to-3d';
    const objectName = 'result-file-name.png';

    if (!fs.existsSync(credentialsPath)) {
        console.error('Credentials file not found:', credentialsPath);
        return callback(null);
    }

    const command = `gsutil signurl -m PUT -d 1h ${credentialsPath} gs://${bucketName}/${objectName}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error generating pre-signed URL: ${stderr}`);
            return callback(null);
        }
        const match = stdout.match(/https:\/\/storage\.googleapis\.com[^\s]+/);
        if (match) {
            callback(match[0]);
        } else {
            console.error('Failed to parse pre-signed URL');
            callback(null);
        }
    });
};

// Main function to convert 2D image to 3D disparity map
const convert2dTo3d = async () => {
    console.log('Starting the 2D to 3D conversion process...');
    const accessToken = await getApiAccessToken();
    const correlationId = uuidv4();

    if (!accessToken) {
        console.error('Failed to retrieve API access token.');
        return;
    }

    generatePresignedUrl(async (resultPresignedUrl) => {
        if (!resultPresignedUrl) {
            console.error('Failed to generate pre-signed URL.');
            return;
        }

        const inputImageUrl = 'https://storage.googleapis.com/image-2d-to-3d/2.jpeg';

        console.log('Access token acquired, proceeding with API request...');
        console.log(`Correlation ID: ${correlationId}`);
        console.log(`Input Image URL: ${inputImageUrl}`);
        console.log(`Result Pre-signed URL: ${resultPresignedUrl}`);

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
                        Authorization: `Bearer ${accessToken}`,
                    },
                    timeout: 180000
                }
            );

            console.log('API response:', response.data);
            console.log('Disparity has been uploaded to the temporary storage.');
            console.log(`To view it, use this GET URL: ${response.data.resultPresignedUrl}`);
        } catch (error) {
            console.error('API Call Failed:', error.response ? error.response.data : error.message);
            if (error.response) {
                console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
                console.error('Error response status:', error.response.status);
                console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
            } else {
                console.error('Error message:', error.message);
            }
        }
    });
};

// Execute the main function
convert2dTo3d();



// require('dotenv').config();
// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');

// // Function to get access token
// const getApiAccessToken = async () => {
//     const url = 'https://auth.immersity.ai/auth/realms/immersity/protocol/openid-connect/token';
//     const data = new URLSearchParams({
//         grant_type: 'client_credentials',
//         client_id: 'af443606-de91-4d07-802f-8598369f8be7',
//         client_secret: 'G1rU2dPC39pw8OQr54wdghVPQoKhOpVN',
//     });

//     try {
//         const response = await axios.post(url, data, {
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             }
//         });
//         console.log('Access token fetched successfully');
//         return response.data.access_token;
//     } catch (error) {
//         console.error('Error fetching access token:', error.response ? error.response.data : error.message);
//         return null;
//     }
// };

// // Main function to convert 2D image to 3D disparity map
// const convert2dTo3d = async () => {
//     console.log('Starting the 2D to 3D conversion process...');
//     const accessToken = await getApiAccessToken();
//     const correlationId = uuidv4();

//     if (!accessToken) {
//         console.error('Failed to retrieve API access token.');
//         return;
//     }

//     const inputImageUrl = 'https://storage.googleapis.com/image-2d-to-3d/2.jpeg'; // Your hardcoded input image URL
//     const resultPresignedUrl = 'https://storage.googleapis.com/image-2d-to-3d/result-file-name.png?x-goog-signature=798a5eba21788efa99dbec0f452000befc6a0601cb9cf6c1480436e4a9d8c964db116d94d0ec031d8e146e9ba4465bb6a2c8ffd75abc957e1998f47c47da5b5dae905068c313bcc036d0ed95e4d9d31a7bd82651831f78a41cdd2ae3bb7e5be8c2c7cb17fdb7dce33a438e5c2fc8a29cb07f23641edeb15c380e135cd8f1acd253b352dde57432bd5f838253495d2c7051cfbc024145848e1b20b6d40a705ed837414cb2b62bd179613136adf6a3166d0b944ad9edf5b268ebd23b9d27499df32097f369bbd43ea585fa36a9bb242fe0ddb19fdc8faedee2b06e229c6f4278b204e21e2792c849241c386485eb30c03f506f3dece6d5f01b00ebc4287a6ed48a&x-goog-algorithm=GOOG4-RSA-SHA256&x-goog-credential=upload-to-gc%40quick-convert.iam.gserviceaccount.com%2F20240617%2Fus-west1%2Fstorage%2Fgoog4_request&x-goog-date=20240617T114156Z&x-goog-expires=3600&x-goog-signedheaders=host'; // Replace with the new pre-signed URL

//     console.log('Access token acquired, proceeding with API request...');
//     console.log(`Correlation ID: ${correlationId}`);
//     console.log(`Input Image URL: ${inputImageUrl}`);
//     console.log(`Result Pre-signed URL: ${resultPresignedUrl}`);

//     try {
//         const response = await axios.post(
//             'https://api.immersity.ai/api/v1/disparity',
//             {
//                 correlationId,
//                 inputImageUrl,
//                 resultPresignedUrl
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                 },
//                 timeout: 180000
//             }
//         );

//         console.log('API response:', response.data);
//         console.log('Disparity has been uploaded to the temporary storage.');
//         console.log(`To view it, use this GET URL: ${response.data.resultPresignedUrl}`);
//     } catch (error) {
//         console.error('API Call Failed:', error.response ? error.response.data : error.message);
//         if (error.response) {
//             console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
//             console.error('Error response status:', error.response.status);
//             console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
//         } else {
//             console.error('Error message:', error.message);
//         }
//     }
// };

// // Execute the main function
// convert2dTo3d();



// Execute the main


// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');

// // Hardcoded client credentials
// const CLIENT_ID = 'af443606-de91-4d07-802f-8598369f8be7';
// const CLIENT_SECRET = 'G1rU2dPC39pw8OQr54wdghVPQoKhOpVN';

// // Function to get access token
// const getAccessToken = async () => {
//     const url = 'https://auth.immersity.ai/auth/realms/immersity/protocol/openid-connect/token';
//     const data = new URLSearchParams({
//         grant_type: 'client_credentials',
//         client_id: CLIENT_ID,
//         client_secret: CLIENT_SECRET,
//     });

//     try {
//         const response = await axios.post(url, data, {
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             }
//         });
//         return response.data.access_token;
//     } catch (error) {
//         console.error('Error fetching access token:', error.response ? error.response.data : error.message);
//         return null;
//     }
// };

// // Main function to convert 2D image to 3D disparity map
// const convert2dTo3d = async () => {
//     const accessToken = await getAccessToken();
//     const correlationId = uuidv4();

//     if (!accessToken) {
//         console.error('Failed to retrieve API access token.');
//         return;
//     }

//     const inputImageUrl = 'https://storage.googleapis.com/image-2d-to-3d/2.jpeg'; // Your hardcoded input image URL
//     const resultPresignedUrl = 'https://storage.googleapis.com/image-2d-to-3d/result-file-name.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=upload-to-gc%40quick-convert.iam.gserviceaccount.com%2F20240617%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20240617T101052Z&X-Goog-Expires=900&X-Goog-SignedHeaders=content-type%3Bhost&X-Goog-Signature=1c8d68a1527d853847a15244c3914d533f145df575fc740883c14813929c1a5045228509a54e2e9baa64451d7c1fe168b2c4d28ebe68346df62fbff74793b372df1aac2a5b1c78cf36feabaa086299dd774efd6f1f159c2d30a71f2dee744f8990bcc799739ce0473919dac4011e9ab525de3a4a9a9bc676dfc0f46ee9af3c66df6b7c400ad1c78c11f999db1300ab399482fca1e0a9b02b942a7c30e58576e07adb4d746ada1c6a8f9e5cc6c5fc0c179c1a6e99f172972f889141dccc33d036ceef134f98b83ca694d1b4b626d7744f16c079f39953a2105bdd1c4ffc4c92feef4ba8ee4b6a8f9e2ecdbe34b62b3250a668ed246adf956335aac4fe8a18448c';

//     // Check if the pre-signed URL allows write access (this is a simplified check)
//     if (!resultPresignedUrl.includes('X-Goog-Expires')) {
//         console.error('The pre-signed URL does not have an expiration time, which might indicate it is not writable.');
//         return;
//     }

//     try {
//         const response = await axios.post(
//             'https://api.immersity.ai/api/v1/disparity',
//             {
//                 correlationId,
//                 inputImageUrl,
//                 resultPresignedUrl
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                 },
//                 timeout: 180000
//             }
//         );

//         console.log('API response:', response.data);
//         console.log('Disparity has been uploaded to the temporary storage.');
//         console.log(`To view it, use this GET URL: ${response.data.resultPresignedUrl}`);
//     } catch (error) {
//         console.error('API Call Failed:', error.response ? error.response.data : error.message);
//         if (error.response) {
//             console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
//             console.error('Error response status:', error.response.status);
//             console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
//         } else {
//             console.error('Error message:', error.message);
//         }
//     }
// };

// // Execute the main function
// convert2dTo3d();

// require('dotenv').config();
// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');

// // Function to get access token
// const getApiAccessToken = async () => {
//     const url = 'https://auth.immersity.ai/auth/realms/immersity/protocol/openid-connect/token';
//     const data = new URLSearchParams({
//         grant_type: 'client_credentials',
//         client_id: process.env.CLIENT_ID,
//         client_secret: process.env.CLIENT_SECRET,
//     });

//     try {
//         const response = await axios.post(url, data, {
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             }
//         });
//         return response.data.access_token;
//     } catch (error) {
//         console.error('Error fetching access token:', error.response ? error.response.data : error.message);
//         return null;
//     }
// };

// // Main function to convert 2D image to 3D disparity map
// const convert2dTo3d = async () => {
//     const accessToken = await getApiAccessToken();
//     const correlationId = uuidv4();

//     if (!accessToken) {
//         console.error('Failed to retrieve API access token.');
//         return;
//     }

//     const inputImageUrl = 'https://storage.googleapis.com/image-2d-to-3d/2.jpeg'; // Your hardcoded input image URL
//     const resultPresignedUrl = 'https://storage.googleapis.com/image-2d-to-3d/result-file-name.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=upload-to-gc%40quick-convert.iam.gserviceaccount.com%2F20240617%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20240617T101052Z&X-Goog-Expires=900&X-Goog-SignedHeaders=content-type%3Bhost&X-Goog-Signature=1c8d68a1527d853847a15244c3914d533f145df575fc740883c14813929c1a5045228509a54e2e9baa64451d7c1fe168b2c4d28ebe68346df62fbff74793b372df1aac2a5b1c78cf36feabaa086299dd774efd6f1f159c2d30a71f2dee744f8990bcc799739ce0473919dac4011e9ab525de3a4a9a9bc676dfc0f46ee9af3c66df6b7c400ad1c78c11f999db1300ab399482fca1e0a9b02b942a7c30e58576e07adb4d746ada1c6a8f9e5cc6c5fc0c179c1a6e99f172972f889141dccc33d036ceef134f98b83ca694d1b4b626d7744f16c079f39953a2105bdd1c4ffc4c92feef4ba8ee4b6a8f9e2ecdbe34b62b3250a668ed246adf956335aac4fe8a18448c'; // Your actual pre-signed URL for the output

//     try {
//         const response = await axios.post(
//             'https://api.immersity.ai/api/v1/disparity',
//             {
//                 correlationId,
//                 inputImageUrl,
//                 resultPresignedUrl
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                 },
//                 timeout: 180000
//             }
//         );

//         console.log('API response:', response.data);
//         console.log('Disparity has been uploaded to the temporary storage.');
//         console.log(`To view it, use this GET URL: ${response.data.resultPresignedUrl}`);
//     } catch (error) {
//         console.error('API Call Failed:', error.response ? error.response.data : error.message);
//         if (error.response) {
//             console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
//             console.error('Error response status:', error.response.status);
//             console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
//         } else {
//             console.error('Error message:', error.message);
//         }
//     }
// };

// // Execute the main function
// convert2dTo3d();


// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');
// const { v4: uuidv4 } = require('uuid');
// const axiosDebug = require('axios-debug-log');

// axiosDebug({
//   request: function (debug, config) {
//     debug('Starting Request', config);
//     return config;
//   },
//   response: function (debug, response) {
//     debug('Response:', response);
//     return response;
//   },
//   error: function (debug, error) {
//     debug('Error:', error);
//     return Promise.reject(error);
//   }
// });

// // Function to get the API access token
// const getApiAccessToken = () => {
//     try {
//         const tokenPath = '/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/api-access-token.txt';
//         const token = fs.readFileSync(tokenPath, 'utf8').trim();
//         console.log('Retrieved API access token:', token);
//         return token;
//     } catch (error) {
//         console.error('Error reading API access token:', error);
//         return null;
//     }
// };

// // Hardcoded URLs
// const inputImageUrl = 'https://storage.googleapis.com/image-2d-to-3d/2.jpeg';
// const resultPresignedUrl = 'https://storage.googleapis.com/image-2d-to-3d/result-file-name.png';

// // Function to send the 2D to 3D API request
// const convert2dTo3d = async () => {
//     const accessToken = getApiAccessToken();
//     const correlationId = uuidv4();

//     if (!accessToken) {
//         console.error('Failed to retrieve API access token.');
//         return;
//     }

//     console.log('Sending request to API with data:', {
//         correlationId,
//         inputImageUrl,
//         resultPresignedUrl
//     });

//     // Log the full Authorization header
//     const authorizationHeader = `Bearer ${accessToken}`;
//     console.log('Authorization header:', authorizationHeader);

//     // Log the exact URL
//     const apiUrl = 'https://api.immersity.ai/api/v1/disparity';
//     console.log('API URL:', apiUrl);

//     try {
//         const response = await axios.post(
//             apiUrl,
//             {
//                 correlationId,
//                 inputImageUrl,
//                 resultPresignedUrl
//             },
//             {
//                 headers: {
//                     Authorization: authorizationHeader,
//                 },
//                 timeout: 180000
//             }
//         );
//         console.log('API response:', response.data);
//     } catch (error) {
//         console.error('API Call Failed:', error.response ? error.response.data : error.message);

//         // Log detailed error information with proper formatting
//         if (error.response) {
//             console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
//             console.error('Error response status:', error.response.status);
//             console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
//         } else {
//             console.error('Error message:', error.message);
//         }
//     }
// };

// // Enable Axios debug logging
// axiosDebug({
//   request: function (debug, config) {
//     debug('Starting Request', config);
//     return config;
//   },
//   response: function (debug, response) {
//     debug('Response:', response);
//     return response;
//   },
//   error: function (debug, error) {
//     debug('Error:', error);
//     return Promise.reject(error);
//   }
// });

// // Run the function to test the API
// convert2dTo3d();

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const getAccessToken = require("./auth");

const MEDIA_CLOUD_REST_API_BASE_URL = "https://api.immersity.ai";
const THREE_MIN_IN_MS = 3 * 60 * 1000;

async function getDisparityMap(inputImageUrl) {
  try {
    const accessToken = await getAccessToken();
    console.log(`\nImmersity AI Login AccessToken acquired: ${accessToken}`);

    const correlationId = uuidv4();
    console.log(`\nGenerating Disparity with correlationId: ${correlationId}...`);

    const disparityGenerationResult = await axios.post(
      `${MEDIA_CLOUD_REST_API_BASE_URL}/api/v1/disparity`,
      {
        correlationId,
        inputImageUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: THREE_MIN_IN_MS,
      }
    );

    const getDisparityPresignedUrl = disparityGenerationResult.data.resultPresignedUrl;
    console.log(`\nDisparity has been uploaded to the temporary storage. To view it, use this GET URL: ${getDisparityPresignedUrl}`);

    return getDisparityPresignedUrl;
  } catch (e) {
    console.error(`Error generating disparity map: ${e.message}`);
    throw new Error("Failed to generate disparity map");
  }
}

module.exports = getDisparityMap;

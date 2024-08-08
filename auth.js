const axios = require("axios");
const qs = require("qs");

async function getAccessToken() {
  const clientId = "7023b647-50a3-42e7-b744-d9e3403382e0";
  const clientSecret = "ph22EconeRGqeotPf4qusMRynUQKYp1b";

  const tokenUrl = "https://auth.immersity.ai/auth/realms/immersity/protocol/openid-connect/token";

  const data = qs.stringify({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const config = {
    method: "post",
    url: tokenUrl,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.response ? error.response.data : error.message);
    throw new Error("Failed to fetch access token");
  }
}

module.exports = getAccessToken;

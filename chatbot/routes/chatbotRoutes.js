const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

// Function to get OpenAI API Key from environment variables
const getOpenAIKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not defined in the .env file.");
  }
  return apiKey.trim();
};

// Load FAQ data on server startup
let faqData = [];
const loadFAQ = () => {
  try {
    const faqFilePath = path.join(__dirname, "../data/faq.json");
    const data = fs.readFileSync(faqFilePath, "utf8");
    faqData = JSON.parse(data);
    console.log("FAQ data loaded successfully:", faqData.length, "entries.");
  } catch (error) {
    console.error("Error loading FAQ data:", error.message);
    faqData = []; // Fallback to an empty array
  }
};
loadFAQ();

// Helper function to find exact match (case-insensitive)
const findExactMatch = (userQuery) => {
  const normalizedQuery = userQuery.trim().toLowerCase();
  const matchedEntry = faqData.find((entry) => entry.question.toLowerCase() === normalizedQuery);
  return matchedEntry || null;
};

// POST /chatbot/api/chat
router.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ reply: "Please provide a message." });
  }

  console.log(`Received message from user: "${userMessage}"`);

  // Find exact match in FAQ
  const matchedEntry = findExactMatch(userMessage);

  if (matchedEntry) {
    const { question, answer } = matchedEntry;

    // Prepare system prompt to restrict GPT-4 to use only the provided answer
    const systemPrompt = `
You are a helpful support chatbot. Use only the information provided below to answer the user's question. Do not use any external knowledge.

Q: ${question}
A: ${answer}
    `;

    try {
      const openaiApiKey = getOpenAIKey();
      const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

      const response = await axios.post(
        openaiEndpoint,
        {
          model: "gpt-4", // Use GPT-4 model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
        }
      );

      const botReply = response.data.choices[0].message.content.trim();
      console.log(`Bot Reply: "${botReply}"`);
      res.json({ reply: botReply });
    } catch (error) {
      console.error("Error communicating with OpenAI API:", error.response ? error.response.data : error.message);
      res.status(500).json({ reply: "Sorry, I'm having trouble responding right now." });
    }
  } else {
    console.log("No matching FAQ entry found.");
    res.json({
      reply: "I'm sorry, I couldn't find an answer to your question. Please contact support for further assistance.",
    });
  }
});

module.exports = router;

// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const axios = require("axios");
// require("dotenv").config();

// // Function to get OpenAI API Key from environment variables
// const getOpenAIKey = () => {
//   const apiKey = process.env.OPENAI_API_KEY;
//   if (!apiKey) {
//     throw new Error("OPENAI_API_KEY is not defined in the .env file.");
//   }
//   return apiKey.trim();
// };

// // POST /chatbot/api/chat
// router.post("/chat", async (req, res) => {
//   const userMessage = req.body.message;

//   if (!userMessage) {
//     return res.status(400).json({ reply: "Please provide a message." });
//   }

//   try {
//     const openaiApiKey = getOpenAIKey();
//     const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

//     const response = await axios.post(
//       openaiEndpoint,
//       {
//         model: "gpt-4", // Use GPT-4 model
//         messages: [
//           { role: "system", content: "You are a helpful support chatbot." },
//           { role: "user", content: userMessage },
//         ],
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${openaiApiKey}`,
//         },
//       }
//     );

//     const botReply = response.data.choices[0].message.content.trim();
//     res.json({ reply: botReply });
//   } catch (error) {
//     console.error("Error communicating with OpenAI API:", error.response ? error.response.data : error.message);
//     res.status(500).json({ reply: "Sorry, I'm having trouble responding right now." });
//   }
// });

// module.exports = router;

// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const axios = require("axios");
// require("dotenv").config();

// const getOpenAIKey = () => {
//   const keyPath = process.env.OPENAI_API_KEY_PATH;
//   if (!keyPath) {
//     throw new Error("OPENAI_API_KEY_PATH is not defined in the .env file.");
//   }
//   try {
//     return fs.readFileSync(keyPath, "utf8").trim();
//   } catch (error) {
//     throw new Error(`Failed to read OpenAI API key from file: ${error.message}`);
//   }
// };
// chatbot/routes/chatbotRoutes.js
// router.post("/chat", async (req, res) => {
//   const userMessage = req.body.message;

//   if (!userMessage) {
//     return res.status(400).json({ reply: "Please provide a message." });
//   }

//   try {
//     const openaiApiKey = getOpenAIKey();
//     const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

//     const response = await axios.post(
//       openaiEndpoint,
//       {
//         model: "ft:gpt-3.5-turbo-0125:tailoredmail::AVK8h2dn",
//         messages: [
//           { role: "system", content: "You are a helpful support chatbot." },
//           { role: "user", content: userMessage },
//         ],
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${openaiApiKey}`,
//         },
//       }
//     );

//     const botReply = response.data.choices[0].message.content.trim();
//     res.json({ reply: botReply });
//   } catch (error) {
//     console.error("Error communicating with OpenAI API:", error.response ? error.response.data : error.message);
//     res.status(500).json({ reply: "Sorry, I'm having trouble responding right now." });
//   }
// });

// module.exports = router;

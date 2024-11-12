const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

// Path to the system prompt
const systemPromptPath = path.join(__dirname, "../systemPrompt.txt");
let systemPrompt = "";

// Read system prompt from file
try {
  systemPrompt = fs.readFileSync(systemPromptPath, "utf-8");
} catch (error) {
  console.error(`Error reading system prompt from ${systemPromptPath}:`, error);
  systemPrompt = `You are a support chatbot for [Your SaaS Company]. Use your knowledge to assist users accurately.`;
}

// POST /chatbot/api/chat
router.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ reply: "Please provide a message." });
  }

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

    const response = await axios.post(
      openaiEndpoint,
      {
        model: "gpt-3.5-turbo", // Use "gpt-4" if available and accessible
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
    res.json({ reply: botReply });
  } catch (error) {
    console.error("Error communicating with OpenAI API:", error.response ? error.response.data : error.message);
    res.status(500).json({ reply: "Sorry, I'm having trouble responding right now." });
  }
});

module.exports = router;

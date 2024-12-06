const fs = require("fs");
const path = require("path");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") }); // Explicitly load the .env file

// Function to read OpenAI API key from file
const getOpenAIKey = () => {
  const keyPath = process.env.OPENAI_API_KEY_PATH;
  if (!keyPath) {
    throw new Error("OPENAI_API_KEY_PATH is not defined in the .env file.");
  }
  try {
    return fs.readFileSync(keyPath, "utf8").trim();
  } catch (error) {
    throw new Error(`Failed to read OpenAI API key from file: ${error.message}`);
  }
};

// Initialize OpenAI Configuration
const configuration = new Configuration({
  apiKey: getOpenAIKey(),
});
const openai = new OpenAIApi(configuration);

// Define directories
const dataDir = path.join(__dirname, "../data");
const embeddingsPath = path.join(__dirname, "embeddings.json");

// Function to read and parse JSON files from the data directory
const readJSONFiles = () => {
  const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json"));
  const data = [];

  files.forEach((file) => {
    const filePath = path.join(dataDir, file);
    let content;
    try {
      content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      console.warn(`Failed to parse JSON from file ${file}: ${error.message}. Skipping this file.`);
      return;
    }

    const videoId = content.id;
    if (!videoId) {
      console.warn(`File ${file} does not have an 'id' field. Skipping.`);
      return;
    }

    if (!content.qa_pairs || !Array.isArray(content.qa_pairs)) {
      console.warn(`File ${file} does not have a valid 'qa_pairs' array. Skipping.`);
      return;
    }

    content.qa_pairs.forEach((qa, index) => {
      if (!qa.question || !qa.answer) {
        console.warn(`QA pair at index ${index} in file ${file} is missing 'question' or 'answer'. Skipping.`);
        return;
      }

      data.push({
        id: `${videoId}_qa_${index}`,
        question: qa.question,
        answer: qa.answer,
        variations: qa.variations || [],
        video: content.video || "",
        summary: content.summary || "",
        transcript: content.transcript || "",
        tags: content.tags || [],
      });
    });
  });

  return data;
};

// Function to generate embedding for a given text
const generateEmbedding = async (text) => {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error.response ? error.response.data : error.message);
    throw error;
  }
};

// Main function to process embeddings
const processEmbeddings = async () => {
  console.log("Starting the embedding generation process...");

  // Step 1: Read current data
  const currentData = readJSONFiles();
  const currentDataMap = new Map(currentData.map((item) => [item.id, item]));
  console.log(`Total Q&A pairs in data: ${currentData.length}`);

  // Step 2: Load existing embeddings
  let existingEmbeddings = [];
  let existingEmbeddingsMap = new Map();
  if (fs.existsSync(embeddingsPath)) {
    try {
      existingEmbeddings = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));
      existingEmbeddingsMap = new Map(existingEmbeddings.map((item) => [item.id, item]));
      console.log(`Total existing embeddings: ${existingEmbeddings.length}`);
    } catch (error) {
      console.error(`Failed to parse embeddings.json: ${error.message}`);
      return;
    }
  } else {
    console.log("No existing embeddings found. A new embeddings.json will be created.");
  }

  // Initialize logs
  const logs = {
    added: [],
    updated: [],
    removed: [],
  };

  // Step 3: Identify removed embeddings
  const existingIds = new Set(existingEmbeddingsMap.keys());
  const currentIds = new Set(currentDataMap.keys());

  const removedIds = [...existingIds].filter((id) => !currentIds.has(id));
  removedIds.forEach((id) => {
    logs.removed.push(id);
    console.log(`Removed embedding for ID: ${id}`);
  });

  // Step 4: Identify added and updated embeddings
  const addedIds = [...currentIds].filter((id) => !existingIds.has(id));
  const updatedIds = [...currentIds].filter((id) => {
    const existing = existingEmbeddingsMap.get(id);
    const current = currentDataMap.get(id);

    // Check all fields for updates
    return (
      existing &&
      (existing.metadata.question !== current.question ||
        existing.metadata.answer !== current.answer ||
        existing.metadata.tags.toString() !== current.tags.toString() ||
        existing.metadata.transcript !== current.transcript ||
        JSON.stringify(existing.metadata.variations) !== JSON.stringify(current.variations))
    );
  });

  // Step 5: Generate embeddings for added and updated IDs
  const newEmbeddings = [];

  // Process added IDs
  for (const id of addedIds) {
    const item = currentDataMap.get(id);
    const textToEmbed = `${item.question} ${item.answer} ${item.variations.join(" ")} ${item.transcript}`;
    try {
      const embeddingValues = await generateEmbedding(textToEmbed);
      const newEmbedding = {
        id: item.id,
        values: embeddingValues,
        metadata: {
          question: item.question,
          answer: item.answer,
          variations: item.variations,
          video: item.video,
          summary: item.summary,
          transcript: item.transcript,
          tags: item.tags,
        },
      };
      newEmbeddings.push(newEmbedding);
      logs.added.push(id);
      console.log(`Added embedding for ID: ${id}`);
    } catch (error) {
      console.error(`Failed to add embedding for ID: ${id}. Error: ${error.message}`);
    }
  }

  // Process updated IDs
  for (const id of updatedIds) {
    const item = currentDataMap.get(id);
    const textToEmbed = `${item.question} ${item.answer} ${item.variations.join(" ")} ${item.transcript}`;
    try {
      const embeddingValues = await generateEmbedding(textToEmbed);
      const updatedEmbedding = {
        id: item.id,
        values: embeddingValues,
        metadata: {
          question: item.question,
          answer: item.answer,
          variations: item.variations,
          video: item.video,
          summary: item.summary,
          transcript: item.transcript,
          tags: item.tags,
        },
      };
      newEmbeddings.push(updatedEmbedding);
      logs.updated.push(id);
      console.log(`Updated embedding for ID: ${id}`);
    } catch (error) {
      console.error(`Failed to update embedding for ID: ${id}. Error: ${error.message}`);
    }
  }

  // Step 6: Retain unchanged embeddings
  const unchangedEmbeddings = [];
  for (const id of existingIds) {
    if (!logs.updated.includes(id) && !logs.removed.includes(id)) {
      unchangedEmbeddings.push(existingEmbeddingsMap.get(id));
    }
  }

  // Step 7: Combine all embeddings: unchanged + new/updated
  const finalEmbeddings = [...unchangedEmbeddings, ...newEmbeddings];

  // Write updated embeddings to embeddings.json
  try {
    fs.writeFileSync(embeddingsPath, JSON.stringify(finalEmbeddings, null, 2));
    console.log("\nEmbeddings have been updated and saved to chatbot/embeddings/embeddings.json");
  } catch (error) {
    console.error(`Failed to write embeddings.json: ${error.message}`);
    return;
  }

  // Log summary of changes
  console.log("\nSummary of Changes:");
  console.log(`Added: ${logs.added.length}`);
  console.log(`Updated: ${logs.updated.length}`);
  console.log(`Removed: ${logs.removed.length}`);
};

// Execute the main function
processEmbeddings();

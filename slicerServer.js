// Load environment variables first
require("dotenv").config();

// Core Node.js modules
const fs = require("fs");
const path = require("path");
const { exec, execFile, spawn } = require("child_process");
const os = require("os");
const http = require("http");

// Third-party packages
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const { Server } = require("socket.io"); // For Socket.io
const sharp = require("sharp");
const Vibrant = require("node-vibrant");
const multer = require("multer");

// Google Cloud-related packages
const { google } = require("googleapis");
const { Storage } = require("@google-cloud/storage");
const speech = require("@google-cloud/speech");

// Local modules
const chatbotRoutes = require("./chatbot/routes/chatbotRoutes");

// Google Cloud setup
google.options({ auth: new google.auth.GoogleAuth({ logLevel: "debug" }) });
const speechClient = new speech.SpeechClient();
const storage = new Storage({
  keyFilename: process.env.GOOGLE_UPLOAD_CREDENTIALS || "/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/google-credentials.json",
});
const bucket = storage.bucket("image-2d-to-3d");

// Express setup
const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());

app.use(express.json({ limit: "10gb" }));
app.use(express.urlencoded({ extended: true, limit: "10gb" }));

// Environment Path
process.env.PATH += ":/usr/bin";

// Serve general static files
app.use(express.static("public"));

// Serve static files for specific paths
app.use("/videos", express.static(path.join(__dirname, "videos")));
app.use("/subtitles", express.static(path.join(__dirname, "subtitles")));
app.use("/compressed", express.static(path.join(__dirname, "compressed")));

app.use("/processed", express.static(path.join(__dirname, "processed")));

// Serve static files for chatbot assets
app.use("/chatbot", express.static(path.join(__dirname, "chatbot", "public")));
app.use("/chatbot-videos", express.static(path.join(__dirname, "chatbot", "public", "chatbot-videos")));

const convertedDir = path.join(__dirname, "converted");

const CLIPDROP_API_KEY = "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e";

const server = http.createServer(app);
const processedDir = path.join(__dirname, "processedDir");

class CustomMulterStorage {
  constructor(opts) {
    this.destination = opts.destination;
    this.filename = opts.filename;
  }

  _handleFile(req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = `${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
    const finalPath = path.join(this.destination, uniqueSuffix);

    // Create a write stream
    const outStream = fs.createWriteStream(finalPath);

    // Create a progress stream
    const progStream = Progress({
      length: req.headers["content-length"],
      time: 100 /* ms */,
    });

    progStream.on("progress", (progress) => {
      if (req.socketId && req.io) {
        req.io.to(req.socketId).emit("uploadProgress", {
          percentage: progress.percentage.toFixed(2),
          transferred: progress.transferred,
          length: progress.length,
          remaining: progress.remaining,
        });
      }
      console.log(`[UPLOAD] ${progress.percentage.toFixed(2)}% uploaded`);
    });

    // Pipe the file stream through progress and then to the write stream
    file.stream
      .pipe(progStream)
      .pipe(outStream)
      .on("error", (err) => {
        cb(err);
      })
      .on("finish", () => {
        cb(null, {
          path: finalPath,
          size: progStream.bytesWritten,
        });
      });
  }

  _removeFile(req, file, cb) {
    const path = file.path;

    fs.unlink(path, cb);
  }
}

module.exports = CustomMulterStorage;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this as needed for security
    methods: ["GET", "POST"],
  },
});

// Handle Socket.io connections
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
server.timeout = 600000; // Increased server timeout
server.keepAliveTimeout = 600000;

// Helper function to parse FFmpeg time format (e.g., "00:00:10.00") to seconds
const parseTime = (timeStr) => {
  const parts = timeStr.split(":");
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
};

// Function to delete files safely
const deleteFile = (filePath, description) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error(`[ERROR] Failed to delete ${description}: ${err.message}`);
      else console.log(`[INFO] Deleted ${description}: ${filePath}`);
    });
  }
};

// Configure Multer to accept only MP4 files with a 5GB limit
const largeFileUpload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["video/mp4"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Only MP4 is allowed."));
    }
  },
});

// Function to get video metadata using FFprobe
const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration,bit_rate", "-of", "default=noprint_wrappers=1:nokey=1", videoPath]);

    let output = "";
    let errorOutput = "";

    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe exited with code ${code}: ${errorOutput}`));
      } else {
        const lines = output.trim().split("\n");
        const duration = parseFloat(lines[0]);
        const bitrate = parseInt(lines[1], 10);
        resolve({ duration, bitrate });
      }
    });
  });
};

// Function to split video into chunks based on duration
const splitVideoIntoChunks = (videoPath, chunkDuration, outputDir) => {
  return new Promise((resolve, reject) => {
    const chunkPattern = path.join(outputDir, `chunk_%03d.mp4`);
    const ffmpegArgs = ["-i", videoPath, "-c", "copy", "-map", "0", "-segment_time", chunkDuration.toString(), "-f", "segment", "-reset_timestamps", "1", chunkPattern];

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, { stdio: "ignore" });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg split process exited with code ${code}`));
      } else {
        // Read all chunk files
        fs.readdir(outputDir, (err, files) => {
          if (err) {
            reject(err);
          } else {
            const chunkFiles = files
              .filter((file) => file.startsWith("chunk_") && file.endsWith(".mp4"))
              .map((file) => path.join(outputDir, file))
              .sort();
            resolve(chunkFiles);
          }
        });
      }
    });
  });
};

// Function to compress a single video chunk
const compressChunk = (inputPath, outputPath, crf, preset, scaleWidth, socket, chunkIndex, totalChunks) => {
  return new Promise((resolve, reject) => {
    const scalingFilter = `scale=${scaleWidth}:-2`;
    const ffmpegArgs = ["-i", inputPath, "-vcodec", "libx264", "-preset", preset, "-crf", crf.toString(), "-vf", `${scalingFilter},format=yuv420p`, "-movflags", "faststart", outputPath];

    // Spawn FFmpeg process and capture stderr for progress
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    ffmpegProcess.stderr.on("data", (data) => {
      const message = data.toString();
      const regex = /time=\s*([0-9:.]+)/;
      const match = message.match(regex);

      if (match && match[1]) {
        const currentTime = parseTime(match[1]);
        // Ensure currentTime is a number before calling toFixed
        if (!isNaN(currentTime)) {
          socket.emit("compressionProgress", {
            percentage: ((currentTime / 100) * 50).toFixed(2), // Assume 50% for compression
            message: `Processing chunk ${chunkIndex + 1}/${totalChunks}`,
          });
        }
      }
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg compression exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};

const concatenateChunksWithFilter = (chunkPaths, outputPath) => {
  return new Promise((resolve, reject) => {
    if (chunkPaths.length === 0) {
      return reject(new Error("No chunks provided for concatenation."));
    }

    // Build the FFmpeg input arguments
    const ffmpegArgs = [];
    chunkPaths.forEach((chunkPath, index) => {
      ffmpegArgs.push("-i", chunkPath);
    });

    // Construct the filter_complex string for the concat filter
    const filterComplex = chunkPaths.map((_, index) => `[${index}:v:0][${index}:a:0]`).join("") + `concat=n=${chunkPaths.length}:v=1:a=1[outv][outa]`;

    ffmpegArgs.push("-filter_complex", filterComplex);
    ffmpegArgs.push("-map", "[outv]");
    ffmpegArgs.push("-map", "[outa]");
    ffmpegArgs.push("-c:v", "libx264");
    ffmpegArgs.push("-c:a", "aac");
    ffmpegArgs.push("-strict", "experimental"); // Necessary for some FFmpeg versions
    ffmpegArgs.push("-movflags", "faststart"); // Optimize for web streaming
    ffmpegArgs.push(outputPath);

    const ffmpegCommand = `ffmpeg ${ffmpegArgs.join(" ")}`;

    // Log the FFmpeg command being executed
    console.log(`[DEBUG] Executing FFmpeg Concatenation Command with concat filter:\n${ffmpegCommand}`);

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    let ffmpegStdErr = "";
    let ffmpegStdOut = "";

    ffmpegProcess.stdout.on("data", (data) => {
      ffmpegStdOut += data.toString();

      console.log(`[FFmpeg STDOUT]: ${data}`);
    });

    ffmpegProcess.stderr.on("data", (data) => {
      ffmpegStdErr += data.toString();

      console.error(`[FFmpeg STDERR]: ${data}`);
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[ERROR] FFmpeg Concatenation Process Failed with Exit Code ${code}`);
        console.error(`[ERROR] FFmpeg STDERR Output:\n${ffmpegStdErr}`);
        console.error(`[ERROR] FFmpeg STDOUT Output:\n${ffmpegStdOut}`);
        return reject(new Error(`FFmpeg concatenation exited with code ${code}`));
      } else {
        console.log(`[INFO] FFmpeg Concatenation Completed Successfully. Output File: ${outputPath}`);
        return resolve();
      }
    });

    ffmpegProcess.on("error", (err) => {
      console.error(`[ERROR] FFmpeg Concatenation Process Encountered an Error: ${err.message}`);
      return reject(new Error(`FFmpeg concatenation process error: ${err.message}`));
    });
  });
};

app.post("/compress-video", largeFileUpload.single("video"), async (req, res) => {
  const videoPath = req.file.path;
  const { crf, preset, scaleWidth, socketId } = req.body;
  const outputPath = path.join(processedDir, `compressed_${uuidv4()}.mp4`);

  console.log("[INFO] Received video for compression:", videoPath);
  console.log("[INFO] Compression parameters:", { crf, preset, scaleWidth, socketId });

  // Validate socketId
  if (!socketId || !io.sockets.sockets.get(socketId)) {
    console.error("[ERROR] Invalid or missing socketId.");
    deleteFile(videoPath, "original video");
    return res.status(400).send("Invalid socket ID.");
  }

  const socket = io.sockets.sockets.get(socketId);
  console.log(`[INFO] Validated socket ID: ${socketId}`);

  // Initialize tempDir
  let tempDir;
  let chunkPaths = [];
  let compressedChunkPaths = [];

  try {
    // Validate inputs
    const crfValue = parseInt(crf, 10);
    const presetValue = (preset || "slow").toLowerCase();
    const width = parseInt(scaleWidth, 10);

    const allowedPresets = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"];

    if (isNaN(crfValue) || crfValue < 0 || crfValue > 51 || isNaN(width) || width < 320 || width > 3840 || !allowedPresets.includes(presetValue)) {
      console.error("[ERROR] Invalid compression parameters.");
      deleteFile(videoPath, "original video");
      return res.status(400).send("Invalid compression parameters.");
    }

    console.log("[INFO] Compression parameters validated successfully.");

    // Get video metadata
    const metadata = await getVideoMetadata(videoPath);
    const { duration, bitrate } = metadata; // bitrate in bps
    console.log(`[INFO] Video Metadata: Duration = ${duration} seconds, Bitrate = ${bitrate} bps`);

    // Calculate total file size in bytes
    const fileSizeInBytes = req.file.size;
    console.log(`[INFO] Video File Size: ${fileSizeInBytes} bytes`);

    const chunkSizeThresholds = [
      { maxSize: 100 * 1024 * 1024, chunks: 1 }, // <=100MB: 1 chunk
      { maxSize: 150 * 1024 * 1024, chunks: 2 }, // <=150MB: 2 chunks
      { maxSize: 200 * 1024 * 1024, chunks: 2 }, // <=200MB: 2 chunks
      { maxSize: 250 * 1024 * 1024, chunks: 3 }, // <=250MB: 3 chunks
      { maxSize: 300 * 1024 * 1024, chunks: 4 }, // <=300MB: 4 chunks
      { maxSize: 500 * 1024 * 1024, chunks: 5 }, // <=500MB: 5 chunks
      { maxSize: 800 * 1024 * 1024, chunks: 6 }, // <=800MB: 6 chunks
      { maxSize: 1024 * 1024 * 1024, chunks: 7 }, // <=1GB: 7 chunks
    ];

    // Determine number of chunks
    let numberOfChunks = 1;
    for (const threshold of chunkSizeThresholds) {
      if (fileSizeInBytes <= threshold.maxSize) {
        numberOfChunks = threshold.chunks;
        break;
      }
    }
    if (fileSizeInBytes > 1024 * 1024 * 1024) {
      numberOfChunks = Math.ceil(fileSizeInBytes / (300 * 1024 * 1024));
    }

    console.log(`[INFO] Determined number of chunks: ${numberOfChunks}`);

    // Calculate chunk duration
    const chunkSizeBytes = Math.min(300 * 1024 * 1024, fileSizeInBytes / numberOfChunks);
    const chunkDuration = (chunkSizeBytes * 8) / bitrate; // seconds

    console.log(`[INFO] Chunk Size: ${chunkSizeBytes} bytes, Chunk Duration: ${chunkDuration} seconds`);

    // Create a temporary directory for processing
    tempDir = path.join(os.tmpdir(), `video_compress_${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`[INFO] Created temporary directory: ${tempDir}`);

    // Split the video into chunks
    chunkPaths = await splitVideoIntoChunks(videoPath, chunkDuration, tempDir);
    console.log(`[INFO] Split into ${chunkPaths.length} chunks:`, chunkPaths);

    // Emit initial progress
    socket.emit("compressionProgress", {
      percentage: "0.00",
      message: `Starting compression: ${chunkPaths.length} chunk(s) to process.`,
    });

    // Compress each chunk
    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i];
      const compressedChunkPath = path.join(tempDir, `compressed_chunk_${i}.mp4`);
      console.log(`[INFO] Compressing chunk ${i + 1}/${chunkPaths.length}: ${chunkPath}`);

      // Emit progress before starting compression of each chunk
      socket.emit("compressionProgress", {
        percentage: ((i / (chunkPaths.length + 1)) * 100).toFixed(2),
        message: `Processing chunk ${i + 1}/${chunkPaths.length}`,
      });

      await compressChunk(chunkPath, compressedChunkPath, crfValue, presetValue, width, socket, i, chunkPaths.length);
      compressedChunkPaths.push(compressedChunkPath);
      console.log(`[INFO] Compressed chunk ${i + 1}/${chunkPaths.length}: ${compressedChunkPath}`);

      // Update progress after compression of each chunk
      socket.emit("compressionProgress", {
        percentage: (((i + 1) / (chunkPaths.length + 1)) * 100).toFixed(2),
        message: `Completed chunk ${i + 1}/${chunkPaths.length}`,
      });
    }

    // Concatenate compressed chunks using concat filter
    console.log("[INFO] Concatenating compressed chunks.");
    socket.emit("compressionProgress", {
      percentage: ((chunkPaths.length / (chunkPaths.length + 1)) * 100).toFixed(2),
      message: "Concatenating compressed chunks.",
    });
    await concatenateChunksWithFilter(compressedChunkPaths, outputPath);
    console.log(`[INFO] Concatenation complete. Output Path: ${outputPath}`);

    // Emit progress after concatenation
    socket.emit("compressionProgress", {
      percentage: "100.00",
      message: "Compression completed successfully.",
    });

    // Send the compressed video
    socket.emit("compressionComplete", { message: "Compression completed successfully." });

    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error("[ERROR] Error sending compressed video:", err.message);
        return res.status(500).send("Error sending compressed video.");
      } else {
        console.log("[INFO] Compressed video sent successfully.");
        deleteFile(outputPath, "compressed video");
      }
    });
  } catch (error) {
    console.error("[ERROR]", error.message);
    socket.emit("compressionError", { message: error.message });
    deleteFile(videoPath, "original video");
    return res.status(500).send("Failed to compress video.");
  } finally {
    // Perform cleanup in the finally block to ensure it runs regardless of success or error
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        // Log contents of tempDir before deletion
        const remainingFiles = fs.readdirSync(tempDir);
        if (remainingFiles.length > 0) {
          console.warn(`[WARNING] Temp directory not empty before deletion. Remaining files: ${remainingFiles.join(", ")}`);
        } else {
          console.log(`[INFO] Temp directory is empty before deletion.`);
        }

        // Attempt to delete tempDir recursively and forcefully
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[INFO] Successfully deleted temporary directory: ${tempDir}`);
      } catch (err) {
        console.error(`[ERROR] Failed to delete tempDir: ${err.message}`);
      }
    }
  }
});

app.post("/get-suggested-colors", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    const imagePath = req.file.path;
    // Use Vibrant to get a color palette
    const palette = await Vibrant.from(imagePath).getPalette();

    const swatchKeys = Object.keys(palette);
    const suggestedColors = swatchKeys
      .map((key) => palette[key] && palette[key].getHex())
      .filter(Boolean)
      .slice(0, 5);

    // Cleanup
    fs.unlinkSync(imagePath);

    return res.json({ colors: suggestedColors });
  } catch (err) {
    console.error("Error in /get-suggested-colors:", err);
    // Cleanup
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: "Failed to get suggested colors." });
  }
});

app.post("/create-background-image", upload.single("image"), async (req, res) => {
  try {
    console.log("===== /create-background-image route hit =====");

    const imagePath = req.file.path;
    // Destructure targetWidth & targetHeight for resizing/upscaling
    // Note that color is coming from req.body.color
    const { color, gradientSize, height, targetWidth, targetHeight } = req.body;

    console.log("Received body:", req.body);

    if (!color || !gradientSize || !height) {
      throw new Error("Missing required parameters (color, gradientSize, height).");
    }

    const parsedTargetWidth = parseInt(targetWidth, 10);
    const parsedTargetHeight = parseInt(targetHeight, 10);
    console.log("Parsed target width:", parsedTargetWidth);
    console.log("Parsed target height:", parsedTargetHeight);

    // **[UPDATED CODE]** - Include 'eighth' and 'sixteenth' in validGradientSizes
    const validGradientSizes = ["full", "half", "quarter", "eighth", "sixteenth"];
    if (!validGradientSizes.includes(gradientSize)) {
      throw new Error("Invalid gradient size. Must be one of: full, half, quarter, eighth, sixteenth.");
    }

    const colorBlockHeight = parseInt(height, 10);
    if (isNaN(colorBlockHeight) || colorBlockHeight <= 0) {
      throw new Error("Invalid height value for the colored block.");
    }

    // Identify the original dimensions
    const identifyCommand = `identify -format "%w %h" "${imagePath}"`;
    const originalDimensions = await new Promise((resolve, reject) => {
      exec(identifyCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error getting image dimensions:", stderr);
          return reject(new Error("Failed to get image dimensions."));
        }
        const [w, h] = stdout.trim().split(" ").map(Number);
        if (isNaN(w) || isNaN(h)) {
          return reject(new Error("Invalid image dimensions."));
        }
        resolve({ width: w, height: h });
      });
    });

    let { width: originalWidth, height: originalHeight } = originalDimensions;
    console.log(`Original image dimensions: ${originalWidth}x${originalHeight}`);

    // =========================================================================
    //  1. Decide if we need to resize (downscale) or upscale, or do nothing
    // =========================================================================
    let finalWorkingImagePath = imagePath; // The file we will eventually apply gradient to

    // Only do something if targetWidth is a valid positive number
    if (!isNaN(parsedTargetWidth) && parsedTargetWidth > 0) {
      // -- Case 1: Original is bigger => Downscale
      if (originalWidth > parsedTargetWidth) {
        console.log("Resizing (downscaling) needed...");

        let newHeight;
        if (!isNaN(parsedTargetHeight) && parsedTargetHeight > 0) {
          newHeight = parsedTargetHeight;
        } else {
          const aspectRatio = originalHeight / originalWidth;
          newHeight = Math.round(parsedTargetWidth * aspectRatio);
        }
        console.log(`Downscaling to ${parsedTargetWidth}x${newHeight}`);

        const extension = path.extname(req.file.originalname).toLowerCase();
        const resizedImagePath = path.join(__dirname, "processed", `resized_${uuidv4()}${extension}`);
        const qualityOption = "-quality 85";
        const resizeCommand = `convert "${imagePath}" -resize ${parsedTargetWidth}x${newHeight} ${qualityOption} "${resizedImagePath}"`;

        await new Promise((resolve, reject) => {
          exec(resizeCommand, (error, stdout, stderr) => {
            if (error) {
              console.error("Error resizing image:", stderr);
              return reject(new Error("Failed to resize image."));
            }
            resolve();
          });
        });

        fs.unlinkSync(imagePath); // Remove original
        finalWorkingImagePath = resizedImagePath;
        originalWidth = parsedTargetWidth;
        originalHeight = newHeight;
      }
      // -- Case 2: Original is smaller => Upscale
      else if (originalWidth < parsedTargetWidth) {
        console.log("Upscaling needed...");

        // We'll figure out final target height
        let finalTargetHeight;
        if (!isNaN(parsedTargetHeight) && parsedTargetHeight > 0) {
          finalTargetHeight = parsedTargetHeight;
        } else {
          const aspectRatio = originalHeight / originalWidth;
          finalTargetHeight = Math.round(parsedTargetWidth * aspectRatio);
        }
        console.log(`Upscaling to ${parsedTargetWidth}x${finalTargetHeight}`);

        // Use ClipDrop API
        const upscaleFormData = new FormData();
        upscaleFormData.append("image_file", fs.createReadStream(imagePath));
        upscaleFormData.append("target_width", parsedTargetWidth);
        upscaleFormData.append("target_height", finalTargetHeight);

        try {
          const response = await axios.post("https://clipdrop-api.co/image-upscaling/v1/upscale", upscaleFormData, {
            headers: {
              ...upscaleFormData.getHeaders(),
              "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
            },
            responseType: "arraybuffer",
          });

          // Delete original local file
          fs.unlinkSync(imagePath);

          // Write the upscaled image to disk
          const extension = response.headers["content-type"] === "image/webp" ? ".webp" : ".jpg";
          const upscaledPath = path.join(__dirname, "processed", `upscaled_${uuidv4()}${extension}`);
          fs.writeFileSync(upscaledPath, response.data);

          finalWorkingImagePath = upscaledPath;
          originalWidth = parsedTargetWidth;
          originalHeight = finalTargetHeight;
        } catch (error) {
          console.error("Failed to upscale image:", error);
          throw new Error("Failed to upscale image.");
        }
      } else {
        console.log("No resizing/upscaling needed (image is already about targetWidth).");
      }
    } else {
      console.log("No targetWidth provided or invalid; skipping resize/upscale.");
    }

    console.log(`Final working dimensions: ${originalWidth}x${originalHeight}`);

    // =========================================================================
    //  2. Create the gradient
    // =========================================================================
    let gradientHeight;
    switch (gradientSize) {
      case "full":
        gradientHeight = originalHeight;
        break;
      case "half":
        gradientHeight = Math.floor(originalHeight / 2);
        break;
      case "quarter":
        gradientHeight = Math.floor(originalHeight / 4);
        break;
      case "eighth":
        gradientHeight = Math.floor(originalHeight / 8);
        break;
      case "sixteenth":
        gradientHeight = Math.floor(originalHeight / 16);
        break;
      default:
        gradientHeight = originalHeight;
    }

    const gradientImagePath = path.join(__dirname, "processed", `gradient_${uuidv4()}.png`);
    const gradientCommand = `convert -size ${originalWidth}x${gradientHeight} gradient:none-${color} "${gradientImagePath}"`;

    await new Promise((resolve, reject) => {
      exec(gradientCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error creating gradient:", stderr);
          return reject(new Error("Failed to create gradient."));
        }
        resolve();
      });
    });

    // =========================================================================
    //  3. Create the colored block
    // =========================================================================
    const coloredBlockPath = path.join(__dirname, "processed", `colored_block_${uuidv4()}.png`);
    const coloredBlockCommand = `convert -size ${originalWidth}x${colorBlockHeight} canvas:"${color}" "${coloredBlockPath}"`;

    await new Promise((resolve, reject) => {
      exec(coloredBlockCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error creating colored block:", stderr);
          return reject(new Error("Failed to create colored block."));
        }
        resolve();
      });
    });

    // =========================================================================
    //  4. Overlay the gradient onto the finalWorkingImage
    // =========================================================================
    const overlayGradientPath = path.join(__dirname, "processed", `overlay_gradient_${uuidv4()}.png`);
    const overlayGradientCommand = `convert "${finalWorkingImagePath}" "${gradientImagePath}" -gravity south -composite "${overlayGradientPath}"`;

    await new Promise((resolve, reject) => {
      exec(overlayGradientCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error overlaying gradient:", stderr);
          return reject(new Error("Failed to overlay gradient."));
        }
        resolve();
      });
    });

    // =========================================================================
    //  5. Append the colored block
    // =========================================================================
    const finalImagePath = path.join(__dirname, "processed", `final_background_${uuidv4()}.png`);
    const appendBlockCommand = `convert "${overlayGradientPath}" "${coloredBlockPath}" -append "${finalImagePath}"`;

    await new Promise((resolve, reject) => {
      exec(appendBlockCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error appending colored block:", stderr);
          return reject(new Error("Failed to append colored block."));
        }
        resolve();
      });
    });

    // =========================================================================
    //  6. Send results
    // =========================================================================
    const finalImageStats = fs.statSync(finalImagePath);
    const finalImageSizeMB = (finalImageStats.size / (1024 * 1024)).toFixed(2);
    const finalDimensions = `${originalWidth}x${originalHeight + colorBlockHeight}px`;

    console.log(`Final image dimensions: ${finalDimensions} (about ${finalImageSizeMB} MB)`);

    // Cleanup temp files
    fs.unlinkSync(gradientImagePath);
    fs.unlinkSync(coloredBlockPath);
    fs.unlinkSync(overlayGradientPath);

    // Remove finalWorkingImage if it exists (and is not the final image).
    if (fs.existsSync(finalWorkingImagePath)) {
      try {
        if (finalWorkingImagePath !== finalImagePath) {
          fs.unlinkSync(finalWorkingImagePath);
        }
      } catch (err) {
        console.warn("Could not remove finalWorkingImagePath:", err.message);
      }
    }

    res.json({
      imageUrl: `/processed/${path.basename(finalImagePath)}`,
      sizeMB: finalImageSizeMB,
      dimensions: finalDimensions,
    });
  } catch (error) {
    console.error("Error in /create-background-image:", error.message);

    // Clean up if still on disk
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/slice-multi", upload.fields([{ name: "video1" }, { name: "video2" }, { name: "video3" }]), (req, res) => {
  console.log("Received /slice-multi POST request");
  console.log("Body:", req.body);
  console.log("Files:", req.files);

  const numVideos = parseInt(req.body.numVideos, 10);
  const outputWidth = parseInt(req.body.outputWidth, 10);
  const outputHeight = parseInt(req.body.outputHeight, 10);
  const enableOverlay = req.body.enableOverlay === "on";
  const overlayColor = req.body.overlayColor || "";
  const overlayOpacity = parseFloat(req.body.overlayOpacity || "0");
  const enableGradientOverlay = req.body.enableGradientOverlay === "on";
  const gradientColor = req.body.gradientColor ? req.body.gradientColor.replace("#", "") : "";
  const gradientDirection = req.body.gradientDirection || "";
  const enableSlowVideo = req.body.enableSlowVideo === "on";
  const slowFactor = parseFloat(req.body.slowFactor || "1");
  const enableGifConversion = req.body.enableGifConversion === "on";
  const gifFps = parseInt(req.body.gifFps || "15", 10);
  const gifQuality = parseInt(req.body.gifQuality || "80", 10);

  console.log("Parsed Parameters:");
  console.log({
    numVideos,
    outputWidth,
    outputHeight,
    enableOverlay,
    overlayColor,
    overlayOpacity,
    enableGradientOverlay,
    gradientColor,
    gradientDirection,
    enableSlowVideo,
    slowFactor,
    enableGifConversion,
    gifFps,
    gifQuality,
  });

  // Initialize arrays to hold video paths and slice data
  const videoPaths = [];
  const tempOutputPaths = [];
  const slices = [];

  for (let i = 1; i <= numVideos; i++) {
    const videoKey = `video${i}`;
    if (req.files[videoKey] && req.files[videoKey][0]) {
      const videoPath = req.files[videoKey][0].path;
      videoPaths.push(videoPath);

      const tempOutputPath = path.join(__dirname, `processed/temp_output${i}_${Date.now()}.mp4`);
      tempOutputPaths.push(tempOutputPath);

      const sliceStartKey = `slice1Start${i}`;
      const sliceEndKey = `slice1End${i}`;
      const sliceStart = parseFloat(req.body[sliceStartKey]);
      const sliceEnd = parseFloat(req.body[sliceEndKey]);

      console.log(`Video ${i}: Slice Start = ${sliceStart}, Slice End = ${sliceEnd}`);

      if (!isNaN(sliceStart) && !isNaN(sliceEnd) && sliceEnd > sliceStart) {
        slices.push([{ start: sliceStart, end: sliceEnd }]);
      } else {
        slices.push([]);
      }
    }
  }

  console.log("Slices Array:", slices);

  let finalOutputPath = path.join(__dirname, `processed/final_output_${Date.now()}.mp4`);

  const processVideo = (videoPath, slices, outputPath, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
      let filterComplex = "";
      let inputs = [];

      slices.forEach((slice, index) => {
        const { start, end } = slice;
        if (!isNaN(start) && !isNaN(end) && end > start) {
          let duration = end - start;
          filterComplex += `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,crop=${targetWidth}:${targetHeight}:(in_w-out_w)/2:(in_h-out_h)/2[v${index}]; `;
          inputs.push(`[v${index}]`);
        }
      });

      if (inputs.length > 0) {
        filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv]`;
      } else {
        return reject("No valid video segments specified.");
      }

      console.log(`FFmpeg Filter Complex for ${videoPath}:`, filterComplex);

      const ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${outputPath}"`;

      console.log(`Executing FFmpeg Command: ${ffmpegCommand}`);

      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing FFmpeg command for ${videoPath}:`, stderr);
          return reject("Failed to process video.");
        }
        console.log(`Processed video saved to ${outputPath}`);
        resolve();
      });
    });
  };

  const concatenateVideos = (inputPaths, outputPath) => {
    return new Promise((resolve, reject) => {
      const concatFileContent = inputPaths.map((path) => `file '${path}'`).join("\n");
      const concatFilePath = path.join(__dirname, `processed/concat_${Date.now()}.txt`);

      fs.writeFileSync(concatFilePath, concatFileContent);
      console.log(`Created Concat File at ${concatFilePath}`);

      const ffmpegConcatCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;

      console.log(`Executing FFmpeg Concat Command: ${ffmpegConcatCommand}`);

      exec(ffmpegConcatCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing FFmpeg concat command:", stderr);
          return reject("Failed to concatenate videos.");
        }
        fs.unlinkSync(concatFilePath);
        console.log(`Deleted Concat File at ${concatFilePath}`);
        resolve();
      });
    });
  };

  // Function to apply colored overlay
  const applyOverlay = (inputPath, outputPath, color, opacity) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        if (error) {
          console.error("Error getting video size:", error);
          return reject("Failed to get video size.");
        }

        const [width, height] = stdout.trim().split(",");
        const overlayPath = path.join(__dirname, `overlay/overlay_${Date.now()}.png`);

        console.log(`Video Dimensions: Width=${width}, Height=${height}`);
        console.log(`Creating Overlay at ${overlayPath}`);

        exec(
          `convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0, 2), 16)},${parseInt(color.substring(2, 4), 16)},${parseInt(
            color.substring(4, 6),
            16
          )},${opacity})" "${overlayPath}"`,
          (overlayError) => {
            if (overlayError) {
              console.error("Error creating overlay:", overlayError);
              return reject("Failed to create overlay.");
            }

            console.log(`Applying Overlay to ${inputPath}, Output at ${outputPath}`);

            exec(`ffmpeg -i "${inputPath}" -i "${overlayPath}" -filter_complex "[0:v][1:v] overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError) => {
              if (ffmpegError) {
                console.error("Error applying overlay:", ffmpegError);
                return reject("Failed to apply overlay.");
              }

              fs.unlinkSync(overlayPath);
              console.log(`Deleted Overlay File at ${overlayPath}`);
              resolve();
            });
          }
        );
      });
    });
  };

  // Function to apply gradient overlay
  const applyGradientOverlay = (inputPath, outputPath, color, type) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        if (error) {
          console.error("Error getting video size:", error);
          return reject("Failed to get video size.");
        }

        const [width, height] = stdout.trim().split(",");
        const gradientPath = path.join(__dirname, `overlay/gradient_${Date.now()}.png`);
        let gradientSize, overlayPosition;

        switch (type) {
          case "full":
            gradientSize = `${width}x${height}`;
            overlayPosition = "0:0";
            break;
          case "half":
            gradientSize = `${width}x${Math.floor(height / 2)}`;
            overlayPosition = `0:${Math.floor(height / 2)}`;
            break;
          case "quarter":
            gradientSize = `${width}x${Math.floor(height / 4)}`;
            overlayPosition = `0:${Math.floor((3 * height) / 4)}`;
            break;
          default:
            gradientSize = `${width}x${height}`;
            overlayPosition = "0:0";
        }

        console.log(`Creating Gradient: Size=${gradientSize}, Position=${overlayPosition}, Color=#${color}`);

        exec(`convert -size ${gradientSize} gradient:#00000000-#${color} "${gradientPath}"`, (gradientError) => {
          if (gradientError) {
            console.error("Error creating gradient:", gradientError);
            return reject("Failed to create gradient.");
          }

          console.log(`Applying Gradient Overlay to ${inputPath}, Output at ${outputPath}`);

          exec(`ffmpeg -i "${inputPath}" -i "${gradientPath}" -filter_complex "[0:v][1:v] overlay=${overlayPosition}" -c:a copy "${outputPath}"`, (ffmpegError) => {
            if (ffmpegError) {
              console.error("Error applying gradient overlay:", ffmpegError);
              return reject("Failed to apply gradient overlay.");
            }

            fs.unlinkSync(gradientPath);
            console.log(`Deleted Gradient File at ${gradientPath}`);
            resolve();
          });
        });
      });
    });
  };

  // Function to apply slow motion
  const applySlowVideo = (inputPath, outputPath, factor) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        let ffmpegCommand;

        if (stdout.trim() === "audio") {
          // Has audio
          ffmpegCommand = `ffmpeg -i "${inputPath}" -filter_complex "[0:v]setpts=${factor}*PTS[v];[0:a]atempo=${1 / factor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
        } else {
          // No audio
          ffmpegCommand = `ffmpeg -i "${inputPath}" -filter:v "setpts=${factor}*PTS" "${outputPath}"`;
        }

        console.log(`Executing FFmpeg Slow Video Command: ${ffmpegCommand}`);

        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error("Error executing FFmpeg slow video command:", stderr);
            return reject("Failed to slow down video.");
          }

          console.log(`Applied Slow Motion: ${outputPath}`);
          resolve();
        });
      });
    });
  };

  // Function to convert video to GIF
  const convertToGif = (videoPath, fps, quality) => {
    return new Promise((resolve, reject) => {
      const framesDir = path.join(__dirname, `frames_${Date.now()}`);
      const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.gif`);

      fs.mkdirSync(framesDir, { recursive: true });
      console.log(`Created Frames Directory at ${framesDir}`);

      const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=${fps} "${path.join(framesDir, "frame_%04d.png")}"`;

      console.log(`Executing FFmpeg Extract Frames Command: ${extractFramesCommand}`);

      exec(extractFramesCommand, (extractError) => {
        if (extractError) {
          console.error("Error extracting frames:", extractError);
          cleanup(framesDir);
          return reject("Error extracting frames.");
        }

        fs.readdir(framesDir, (err, files) => {
          if (err) {
            console.error("Error reading frames directory:", err);
            cleanup(framesDir);
            return reject("Could not read frames directory.");
          }

          files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

          const frameFiles = files.map((file) => path.join(framesDir, file));

          console.log(`Frame Files:`, frameFiles);

          execFile("gifski", ["-o", outputPath, "--fps", `${fps}`, "--quality", `${quality}`, ...frameFiles], (gifskiError, stdout, stderr) => {
            if (gifskiError) {
              console.error("Error creating GIF with gifski:", gifskiError);
              console.error("stderr:", stderr);
              cleanup(framesDir);
              return reject("Error creating GIF with gifski.");
            }

            console.log(`GIF Created at ${outputPath}`);
            resolve(outputPath);
            cleanup(framesDir);
          });
        });
      });
    });
  };

  // Cleanup function to delete temporary directories
  const cleanup = (framesDir) => {
    if (framesDir) {
      fs.rm(framesDir, { recursive: true, force: true }, (err) => {
        if (err) console.error(`Error deleting frames directory: ${framesDir}`, err);
        else console.log(`Deleted Frames Directory at ${framesDir}`);
      });
    }
  };

  // Main processing logic
  (async () => {
    try {
      // Process each video slice
      for (let i = 0; i < videoPaths.length; i++) {
        if (slices[i].length > 0) {
          await processVideo(videoPaths[i], slices[i], tempOutputPaths[i], outputWidth, outputHeight);
          console.log(`Processed Video ${i + 1}: ${videoPaths[i]}`);
        } else {
          console.warn(`No valid slice for Video ${i + 1}: ${videoPaths[i]}`);
        }
      }

      // Check if at least one video was processed
      const validProcessedVideos = tempOutputPaths.filter((path, index) => slices[index].length > 0);

      if (validProcessedVideos.length === 0) {
        throw "No valid video segments specified.";
      }

      // Concatenate all processed videos
      await concatenateVideos(validProcessedVideos, finalOutputPath);
      console.log(`Concatenated Videos into ${finalOutputPath}`);

      // Apply Colored Overlay if enabled
      if (enableOverlay) {
        const overlayedOutputPath = path.join(__dirname, `processed/final_output_overlayed_${Date.now()}.mp4`);
        await applyOverlay(finalOutputPath, overlayedOutputPath, overlayColor, overlayOpacity);
        fs.unlinkSync(finalOutputPath);
        finalOutputPath = overlayedOutputPath;
        console.log(`Applied Colored Overlay: ${overlayedOutputPath}`);
      }

      // Apply Gradient Overlay if enabled
      if (enableGradientOverlay) {
        const gradientOverlayedOutputPath = path.join(__dirname, `processed/final_output_gradient_overlayed_${Date.now()}.mp4`);
        await applyGradientOverlay(finalOutputPath, gradientOverlayedOutputPath, gradientColor, gradientDirection);
        fs.unlinkSync(finalOutputPath);
        finalOutputPath = gradientOverlayedOutputPath;
        console.log(`Applied Gradient Overlay: ${gradientOverlayedOutputPath}`);
      }

      // Apply Slow Motion if enabled
      if (enableSlowVideo) {
        const slowedOutputPath = path.join(__dirname, `processed/final_output_slowed_${Date.now()}.mp4`);
        await applySlowVideo(finalOutputPath, slowedOutputPath, slowFactor);
        fs.unlinkSync(finalOutputPath);
        finalOutputPath = slowedOutputPath;
        console.log(`Applied Slow Motion: ${slowedOutputPath}`);
      }

      // Convert to GIF if enabled
      if (enableGifConversion) {
        const gifOutputPath = await convertToGif(finalOutputPath, gifFps, gifQuality);
        fs.unlinkSync(finalOutputPath);
        console.log(`Converted to GIF: ${gifOutputPath}`);
        res.download(gifOutputPath, (downloadErr) => {
          if (downloadErr) {
            console.error("Error sending the converted GIF:", downloadErr);
          }
          // Cleanup uploaded and temporary files
          videoPaths.forEach((path) => fs.unlinkSync(path));
          validProcessedVideos.forEach((path) => fs.unlinkSync(path));
          fs.unlinkSync(gifOutputPath);
        });
      } else {
        res.download(finalOutputPath, (downloadErr) => {
          if (downloadErr) {
            console.error("Error sending the processed video:", downloadErr);
          }
          // Cleanup uploaded and temporary files
          videoPaths.forEach((path) => fs.unlinkSync(path));
          validProcessedVideos.forEach((path) => fs.unlinkSync(path));
          fs.unlinkSync(finalOutputPath);
        });
      }
    } catch (error) {
      console.error("Processing Error:", error);
      res.status(500).send(error);
    }
  })();
});

app.post("/SliceMultiConvertToMp4", upload.single("video"), (req, res) => {
  // Log the incoming request for debugging
  console.log("Received request to /SliceMultiConvertToMp4");
  console.log("Uploaded file:", req.file);

  // Check if a video file was uploaded
  if (!req.file) {
    console.error("No file uploaded.");
    return res.status(400).send("No file uploaded.");
  }

  const videoPath = req.file.path; // Get the uploaded video path
  const outputPath = path.join(outputDir, `converted_${Date.now()}.mp4`); // Output path for MP4

  // Convert the video to MP4 format using ffmpeg
  const convertCommand = `ffmpeg -i "${videoPath}" -vcodec libx264 -preset medium -crf 16 "${outputPath}"`;

  exec(convertCommand, (convertError, stdout, stderr) => {
    if (convertError) {
      console.error("Error converting video to MP4:", convertError);
      console.error("ffmpeg stderr:", stderr);
      fs.unlinkSync(videoPath); // Clean up the uploaded file
      return res.status(500).send("Error converting video to MP4.");
    }

    // Send the converted MP4 file directly in the response
    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error("Error sending the converted video:", err);
        return res.status(500).send("Error sending the converted video.");
      }
      // Clean up original and output files
      fs.unlinkSync(videoPath);
      fs.unlinkSync(outputPath);
    });
  });
});

// ------- Image Effects ------- //

// image resize

app.post("/resize-image", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const targetWidth = parseInt(req.body.target_width, 10);
  const targetHeight = parseInt(req.body.target_height, 10);

  const extension = path.extname(req.file.originalname).toLowerCase();
  let outputFileName = `resized_${Date.now()}${extension}`;
  let qualityOption = "-quality 85"; // You can adjust this for better quality.

  let resizeCommand = `convert "${imagePath}" -resize ${targetWidth}x${targetHeight} ${qualityOption} "${path.join(__dirname, "processed", outputFileName)}"`;

  exec(resizeCommand, (error, stdout, stderr) => {
    fs.unlinkSync(imagePath);

    if (error) {
      console.error("Error resizing image:", stderr);
      return res.status(500).send("Failed to resize image.");
    }

    const outputFilePath = path.join(__dirname, "processed", outputFileName);

    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error("Error sending resized image:", err);
        return res.status(500).send("Error sending resized image.");
      }

      fs.unlinkSync(outputFilePath);
    });
  });
});

// image crop

app.post("/upload-image", upload.single("media"), (req, res) => {
  const imagePath = req.file.path;
  const extension = req.body.extension;
  const timestamp = Date.now();
  const outputPath = path.join(__dirname, "processed", `cropped_image_${timestamp}.${extension}`);

  const { width, height, left, top } = req.body;
  const safeWidth = parseInt(width, 10);
  const safeHeight = parseInt(height, 10);
  const safeLeft = parseInt(left, 10);
  const safeTop = parseInt(top, 10);

  if (isNaN(safeWidth) || isNaN(safeHeight) || isNaN(safeLeft) || isNaN(safeTop)) {
    return res.status(400).send("Invalid crop dimensions");
  }

  const cropCommand = `convert "${imagePath}" -crop ${safeWidth}x${safeHeight}+${safeLeft}+${safeTop} "${outputPath}"`;

  exec(cropCommand, (error, stdout, stderr) => {
    fs.unlinkSync(imagePath);
    if (error) {
      return res.status(500).send("Error processing image");
    }

    switch (extension) {
      case "jpeg":
      case "jpg":
        compressJpeg(outputPath, res);
        break;
      case "png":
        compressPng(outputPath, res);
        break;
      case "webp":
        compressWebp(outputPath, res);
        break;
      case "gif":
        compressGif(outputPath, res);
        break;
      default:
        res.sendFile(outputPath, (err) => {
          if (err) {
            return res.status(500).send("Error sending cropped image");
          }
          fs.unlinkSync(outputPath);
        });
    }
  });
});

// recolor image/logo

app.post("/detectColors", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // Load image and check for white color with sharp
    const image = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
    const whiteThreshold = { r: 230, g: 230, b: 230 };
    let containsWhite = false;

    for (let i = 0; i < image.data.length; i += 3) {
      const red = image.data[i];
      const green = image.data[i + 1];
      const blue = image.data[i + 2];

      if (red >= whiteThreshold.r && green >= whiteThreshold.g && blue >= whiteThreshold.b) {
        containsWhite = true;
        break;
      }
    }

    const palette = await Vibrant.from(imagePath).getPalette();
    const vibrantColors = [];

    for (const swatch in palette) {
      if (palette[swatch]) {
        vibrantColors.push(palette[swatch].getHex());
      }
    }

    const detectedColors = [];
    if (containsWhite) {
      detectedColors.push("#FFFFFF");
    }
    detectedColors.push(...vibrantColors.slice(0, 3));

    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    res.json({ colors: detectedColors });
  } catch (error) {
    console.error("Error detecting colors:", error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).send("Failed to detect colors.");
  }
});

app.post("/recolorImage", upload.single("image"), (req, res) => {
  const targetColors = JSON.parse(req.body.targetColors);
  const sourceColors = JSON.parse(req.body.sourceColors);
  const fuzzPercentage = parseFloat(req.body.fuzz) || 10;
  const inputPath = req.file.path;
  const outputPath = `uploads/recolored-${uuidv4()}.png`;

  if (!sourceColors || !targetColors || sourceColors.length !== targetColors.length) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    return res.status(400).send("Source and target colors must be provided and match in length.");
  }

  let command = `convert "${inputPath}"`;

  sourceColors.forEach((srcColor, index) => {
    const tgtColor = targetColors[index];
    const srcColorFormatted = srcColor.startsWith("#") ? srcColor : `#${srcColor}`;
    const tgtColorFormatted = `#${tgtColor}`;

    if (srcColorFormatted.toUpperCase() === "#FFFFFF") {
      command += ` -fuzz ${fuzzPercentage}% -fill "${tgtColorFormatted}" -opaque "${srcColorFormatted}"`;
    }
  });

  sourceColors.forEach((srcColor, index) => {
    const tgtColor = targetColors[index];
    const srcColorFormatted = srcColor.startsWith("#") ? srcColor : `#${srcColor}`;
    const tgtColorFormatted = `#${tgtColor}`;

    if (srcColorFormatted.toUpperCase() !== "#FFFFFF") {
      command += ` -fuzz ${fuzzPercentage}% -fill "${tgtColorFormatted}" -opaque "${srcColorFormatted}"`;
    }
  });

  command += ` "${outputPath}"`;

  exec(command, (err, stdout, stderr) => {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    if (err) {
      console.error("Error processing image:", stderr);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      return res.status(500).send("Error processing image.");
    }

    res.sendFile(path.resolve(outputPath), (err) => {
      if (err) {
        console.error("Error sending recolored image:", err);
        return res.status(500).send("Error sending recolored image.");
      }
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });
  });
});

// Image-slideshow

app.post("/create-video", upload.array("images"), async (req, res) => {
  const files = req.files;
  const durations = JSON.parse(req.body.durations);
  const handlingOption = req.body.handlingOption;
  const transitionOption = req.body.transitionOption || "none";

  console.log("Received durations:", durations);
  console.log(`Handling option: ${handlingOption}`);
  console.log(`Transition option: ${transitionOption}`);

  if (!files || files.length === 0) {
    return res.status(400).send("No images provided or empty request.");
  }

  if (files.length !== durations.length) {
    console.error("Mismatch between images and durations.");
    return res.status(400).send("Mismatch between images and durations.");
  }

  const fps = 25;
  const fadeDuration = transitionOption === "fade" ? 0.5 : 0;
  const outputVideoPath = path.join(__dirname, "videos", `slideshow_${Date.now()}.mp4`);

  const tempVideoPaths = [];
  const tempVideoDurations = [];

  try {
    let outputWidth, outputHeight;
    if (handlingOption === "headerBackground") {
      outputWidth = 1000;
      outputHeight = 400;
    } else if (handlingOption === "square") {
      outputWidth = 500;
      outputHeight = 500;
    }

    console.log(`Output dimensions: ${outputWidth}x${outputHeight}`);

    const allFiles = [...files];
    const allDurations = [...durations];

    if (transitionOption === "fade") {
      allFiles.push(files[0]);
      allDurations.push(fadeDuration);
    }

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      let duration;

      if (i === allFiles.length - 1) {
        duration = transitionOption === "fade" ? fadeDuration * 2 : allDurations[i];
      } else {
        duration = allDurations[i] + (transitionOption === "fade" ? fadeDuration : 0);
      }
      tempVideoDurations.push(duration);

      const inputImagePath = file.path;
      const tempVideoPath = path.join(__dirname, "uploads", `temp_video_${i}.mp4`);
      tempVideoPaths.push(tempVideoPath);

      const ffmpegCommand = `ffmpeg -y -loop 1 -i "${inputImagePath}" -c:v libx264 -t ${duration} -r ${fps} -vsync 1 -pix_fmt yuv420p -vf "fps=${fps},format=yuv420p,scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2" "${tempVideoPath}"`;

      await new Promise((resolve, reject) => {
        console.log(`Creating video from image ${i + 1}:`, ffmpegCommand);
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error creating video from image ${i + 1}:`, stderr);
            return reject(`Failed to create video from image ${i + 1}.`);
          }
          resolve();
        });
      });
    }

    let filterComplex = "";
    let inputs = "";
    let lastOutput = "";

    for (let i = 0; i < tempVideoPaths.length; i++) {
      inputs += `-i "${tempVideoPaths[i]}" `;
    }

    const cumulativeDurations = [];
    let cumulative = 0;
    for (let i = 0; i < tempVideoDurations.length; i++) {
      cumulativeDurations.push(cumulative);
      cumulative += tempVideoDurations[i] - (i < tempVideoDurations.length - 1 && transitionOption === "fade" ? fadeDuration : 0);
    }

    for (let i = 0; i < tempVideoPaths.length; i++) {
      filterComplex += `[${i}:v]fps=${fps},format=yuv420p,setsar=1[v${i}];`;
    }

    if (transitionOption === "fade") {
      for (let i = 0; i < tempVideoPaths.length - 1; i++) {
        const offset = cumulativeDurations[i + 1];
        if (i === 0) {
          filterComplex += `[v${i}][v${i + 1}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}[vxf${i + 1}];`;
        } else {
          filterComplex += `[vxf${i}][v${i + 1}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}[vxf${i + 1}];`;
        }
        lastOutput = `[vxf${i + 1}]`;
      }
    } else {
      let concatInputs = "";
      for (let i = 0; i < tempVideoPaths.length; i++) {
        concatInputs += `[v${i}]`;
      }
      filterComplex += `${concatInputs}concat=n=${tempVideoPaths.length}:v=1:a=0[outv];`;
      lastOutput = "[outv]";
    }

    const finalFFmpegCommand = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "${lastOutput}" -c:v libx264 -pix_fmt yuv420p "${outputVideoPath}"`;

    await new Promise((resolve, reject) => {
      console.log("Executing FFmpeg command for concatenation:", finalFFmpegCommand);
      exec(finalFFmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing FFmpeg command:", stderr);
          return reject("Failed to create slideshow.");
        }
        resolve();
      });
    });

    console.log("Slideshow created successfully.");
    res.json({ videoPath: `/videos/${path.basename(outputVideoPath)}` });

    try {
      files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      tempVideoPaths.forEach((videoPath) => {
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      });
    } catch (cleanupErr) {
      console.error("Error cleaning up files:", cleanupErr);
    }
  } catch (err) {
    console.error("Error processing videos:", err);
    res.status(500).send(`Error processing videos: ${err}`);
  }
});

app.post("/crop-image", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputPath = path.join(__dirname, "videos", `cropped_${Date.now()}.jpg`);
  const { width, height, left, top } = req.body;

  const safeWidth = parseInt(width, 10);
  const safeHeight = parseInt(height, 10);
  const safeLeft = parseInt(left, 10);
  const safeTop = parseInt(top, 10);

  exec(`ffprobe -v error -show_entries stream=width,height -of csv=p=0:s=x ${imagePath}`, (err, stdout) => {
    if (err) {
      console.error("Error getting image dimensions:", err);
      return res.status(500).send("Error processing image");
    }

    const [imageWidth, imageHeight] = stdout.split("x").map(Number);

    if (safeWidth <= 0 || safeHeight <= 0 || safeLeft < 0 || safeTop < 0 || safeWidth + safeLeft > imageWidth || safeHeight + safeTop > imageHeight) {
      return res.status(400).send("Invalid crop dimensions");
    }

    const cropCommand = `ffmpeg -i "${imagePath}" -vf "crop=${safeWidth}:${safeHeight}:${safeLeft}:${safeTop}" -y "${outputPath}"`;

    exec(cropCommand, (error) => {
      fs.unlinkSync(imagePath);
      if (error) {
        console.error(`Error cropping image ${imagePath}:`, error);
        return res.status(500).send("Error processing image");
      }

      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error(`SendFile Error: ${err.message}`);
          return res.status(500).send("Error sending cropped image");
        }
        fs.unlinkSync(outputPath);
      });
    });
  });
});

// ----- Video Effects ---- //

// video-crop
app.post("/upload", upload.single("video"), (req, res) => {
  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  const videoPath = req.file.path;
  const timestamp = Date.now();
  const outputPath = path.join(__dirname, "processed", `cropped_video_${timestamp}.mp4`);
  const { width, height, left, top } = req.body;

  const safeWidth = parseInt(width, 10);
  const safeHeight = parseInt(height, 10);
  const safeLeft = parseInt(left, 10);
  const safeTop = parseInt(top, 10);

  if (isNaN(safeWidth) || isNaN(safeHeight) || isNaN(safeLeft) || isNaN(safeTop)) {
    return res.status(400).send("Invalid crop dimensions");
  }

  const cropCommand = `crop=${safeWidth}:${safeHeight}:${safeLeft}:${safeTop}`;
  const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "${cropCommand}" -c:a copy "${outputPath}"`;

  exec(ffmpegCommand, (error, stdout, stderr) => {
    fs.unlinkSync(videoPath);
    if (error) {
      console.error(`Exec Error: ${error.message}`);
      return res.status(500).send("Error processing video");
    }

    res.sendFile(outputPath, (err) => {
      fs.unlinkSync(outputPath);
    });
  });
});

// video-slice-multi-video + crop + gradient + colored overlay + slow

//colored overlay
app.post("/overlay", upload.single("video"), (req, res) => {
  console.log("Request Body:", req.body); // Log form fields
  console.log("Uploaded Files:", req.file); // Log uploaded files

  if (!req.file) {
    return res.status(400).send("No video file uploaded.");
  }

  const videoPath = req.file.path;
  const color = req.body.color.replace("#", "");
  const opacity = parseFloat(req.body.opacity);
  const outputPath = path.join(__dirname, "directories/video_colored_overlay", `overlay_video_${Date.now()}.mp4`);

  exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
    if (error) {
      console.error("Error getting video size:", error);
      return res.status(500).send("Failed to get video size.");
    }

    const [width, height] = stdout.trim().split(",");
    const overlayPath = path.join(__dirname, "overlay", `overlay_${Date.now()}.png`);

    exec(
      `convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0, 2), 16)},${parseInt(color.substring(2, 4), 16)},${parseInt(color.substring(4, 6), 16)},${opacity})" "${overlayPath}"`,
      (overlayError) => {
        if (overlayError) {
          console.error("Error creating overlay:", overlayError);
          return res.status(500).send("Failed to create overlay.");
        }

        exec(`ffmpeg -i "${videoPath}" -i "${overlayPath}" -filter_complex "[0:v][1:v] overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError) => {
          if (ffmpegError) {
            console.error("Error applying overlay:", ffmpegError);
            return res.status(500).send("Failed to apply overlay.");
          }

          res.download(outputPath, (downloadErr) => {
            if (downloadErr) {
              console.error("Error sending the overlay video:", downloadErr);
            }
            fs.unlinkSync(videoPath);
            fs.unlinkSync(overlayPath);
          });
        });
      }
    );
  });
});

// gradient overlay
app.post("/gradientOverlay", upload.single("video"), (req, res) => {
  console.log("Request Body:", req.body); // Log form fields
  console.log("Uploaded Files:", req.file); // Log uploaded files

  if (!req.file) {
    return res.status(400).send("No video file uploaded.");
  }

  const videoPath = req.file.path;
  const gradientType = req.body.gradientType;
  const gradientColor = req.body.gradientColor.replace("#", "");
  const outputPath = path.join(__dirname, "directories/video_gradient_overlay", `gradient_overlay_video_${Date.now()}.mp4`);

  exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
    if (error) {
      console.error("Error getting video size:", error);
      return res.status(500).send("Failed to get video size.");
    }

    const [width, height] = stdout.trim().split(",");
    const gradientPath = path.join(__dirname, "overlay", `gradient_${Date.now()}.png`);
    let gradientSize, overlayPosition;

    switch (gradientType) {
      case "full":
        gradientSize = `${width}x${height}`;
        overlayPosition = "0:0";
        break;
      case "half":
        gradientSize = `${width}x${parseInt(height / 2)}`;
        overlayPosition = `0:${parseInt(height / 2)}`;
        break;
      case "quarter":
        gradientSize = `${width}x${parseInt(height / 4)}`;
        overlayPosition = `0:${3 * parseInt(height / 4)}`;
        break;
    }

    const gradientCommand = `convert -size ${gradientSize} gradient:#00000000-#${gradientColor} "${gradientPath}"`;

    exec(gradientCommand, (gradientError) => {
      if (gradientError) {
        console.error("Error creating gradient:", gradientError);
        return res.status(500).send("Failed to create gradient.");
      }

      // Apply the gradient
      const ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${gradientPath}" -filter_complex "[0:v][1:v] overlay=${overlayPosition} [outv]" -map "[outv]" -map 0:a? -c:a copy "${outputPath}"`;

      exec(ffmpegCommand, (ffmpegError) => {
        if (ffmpegError) {
          console.error("Error applying gradient overlay:", ffmpegError);
          return res.status(500).send("Failed to apply gradient overlay.");
        }

        res.download(outputPath, (downloadErr) => {
          if (downloadErr) {
            console.error("Error sending the gradient overlay video:", downloadErr);
          }
          fs.unlinkSync(videoPath);
          fs.unlinkSync(gradientPath);
        });
      });
    });
  });
});

// slow video
app.post("/slowVideo", upload.single("video"), (req, res) => {
  console.log("Request Body:", req.body); // Log form fields
  console.log("Uploaded Files:", req.file); // Log uploaded files

  const videoPath = req.file.path;
  const slowFactor = parseFloat(req.body.slowFactor);
  const outputPath = path.join(__dirname, "directories/video_slow", `slowed_video_${Date.now()}.mp4`);

  exec(`ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${videoPath}"`, (error, stdout) => {
    let ffmpegCommand;

    if (stdout) {
      // has audio
      ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "[0:v]setpts=${slowFactor}*PTS[v];[0:a]atempo=1/${slowFactor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
    } else {
      // no audio
      ffmpegCommand = `ffmpeg -i "${videoPath}" -filter:v "setpts=${slowFactor}*PTS" "${outputPath}"`;
    }

    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing FFmpeg command:", stderr);
        return res.status(500).send("Failed to slow down video.");
      }

      res.download(outputPath, (downloadErr) => {
        if (downloadErr) {
          console.error("Error sending the slowed video:", downloadErr);
        }

        fs.unlinkSync(videoPath);
      });
    });
  });
});

// ------- Compression ------- //

// ------- Compress WebP Image ------- //
app.post("/compress-webp", upload.single("image"), (req, res) => {
  // Get the path of the uploaded image
  const imagePath = req.file.path;

  // Parse the compression level from the request body
  const compressionLevel = parseInt(req.body.compression_level, 10);

  // Generate a unique filename for the compressed WebP image
  const outputFileName = `compressed_${Date.now()}.webp`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Construct the ImageMagick command to convert and compress the image to WebP
  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error) => {
    // Delete the original uploaded image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, send a 500 response
    if (error) return res.status(500).send("Failed to compress WebP.");

    // Send the compressed WebP file back to the client
    res.sendFile(outputFilePath, () => {
      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
});

// ------- Compress JPEG Image ------- //
app.post("/compress-jpeg", upload.single("image"), (req, res) => {
  // Get the path of the uploaded image
  const imagePath = req.file.path;

  // Parse the compression level from the request body
  const compressionLevel = parseInt(req.body.compression_level, 10);

  // Generate filename for the compressed JPEG image
  const outputFileName = `compressed_${Date.now()}.jpg`;

  // Path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Construct the ImageMagick command to convert and compress the image to JPEG
  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error, stdout, stderr) => {
    // Delete the original uploaded image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, log it and send a 500 response
    if (error) {
      console.error("Error compressing JPEG:", stderr);
      return res.status(500).send("Failed to compress JPEG.");
    }

    // Send the compressed JPEG file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, log it and send a 500 response
      if (err) {
        console.error("Error sending compressed JPEG:", err);
        return res.status(500).send("Error sending compressed JPEG.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
});

// ------- Compress PNG Image ------- //
app.post("/compress-png", upload.single("image"), (req, res) => {
  // Get the path of the uploaded image
  const imagePath = req.file.path;

  // Generate a unique filename for the compressed PNG image
  const outputFileName = `compressed_${Date.now()}.png`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Check if the 'processed' directory exists; if not, create it
  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  // Construct the ImageMagick command to convert, strip metadata, and compress the image to PNG
  const compressCommand = `convert "${imagePath}" -strip -quality 80 "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error, stdout, stderr) => {
    // Delete the original uploaded image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, log it and send a 500 response
    if (error) {
      console.error("Error compressing PNG:", stderr);
      return res.status(500).send("Failed to compress PNG.");
    }

    // Send the compressed PNG file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, log it and send a 500 response
      if (err) {
        console.error("Error sending compressed PNG:", err);
        return res.status(500).send("Error sending compressed PNG.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
});

// ------- Compress GIF Image Using Gifsicle ------- //
app.post("/compress-gif", upload.single("image"), (req, res) => {
  // Get the path of the uploaded GIF image
  const imagePath = req.file.path;

  // Generate a unique filename for the compressed GIF image
  const outputFileName = `compressed_${Date.now()}.gif`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Extract compression parameters from the request body
  const lossy = req.body.lossy;
  const colors = req.body.colors;
  const optimize = req.body.optimize;

  // Check if the 'processed' directory exists; if not, create it
  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  // Construct the Gifsicle command to optimize and compress the GIF
  const compressCommand = `gifsicle --optimize=${optimize} --lossy=${lossy} --colors=${colors} "${imagePath}" > "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error) => {
    // Delete the original uploaded GIF
    fs.unlinkSync(imagePath);

    // If there's an error during compression, log it and send a 500 response
    if (error) {
      console.error("Error compressing GIF:", error);
      return res.status(500).send("Failed to compress GIF.");
    }

    // Send the compressed GIF file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, log it and send a 500 response
      if (err) {
        console.error("Error sending compressed GIF:", err);
        return res.status(500).send("Error sending compressed GIF.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
});

// ------- Compress GIF Image Using Gifsicle ------- //
app.post("/compress-gif-gifsicle", upload.single("image"), (req, res) => {
  // Get the path of the uploaded GIF image
  const imagePath = req.file.path;

  // Generate a unique filename for the compressed GIF image
  const outputFileName = `compressed_${Date.now()}.gif`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Extract compression parameters from the request body
  const lossy = req.body.lossy;
  const colors = req.body.colors;
  const optimize = req.body.optimize;

  // Check if the 'processed' directory exists; if not, create it
  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  // Construct the Gifsicle command to optimize and compress the GIF
  const compressCommand = `gifsicle --optimize=${optimize} --lossy=${lossy} --colors=${colors} "${imagePath}" > "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error) => {
    // Delete the original uploaded GIF image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, log it and send a 500 response
    if (error) {
      console.error("Error compressing GIF:", error);
      return res.status(500).send("Failed to compress GIF.");
    }

    // Send the compressed GIF file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, log it and send a 500 response
      if (err) {
        console.error("Error sending compressed GIF:", err);
        return res.status(500).send("Error sending compressed GIF.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
});

// ------- Compress GIF Image Using Gifski ------- //
app.post("/compress-gif-gifski", upload.single("image"), (req, res) => {
  // Get the path of the uploaded GIF image
  const imagePath = req.file.path;

  // Generate a unique filename for the compressed GIF image
  const outputFileName = `compressed_${Date.now()}.gif`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Extract compression parameters from the request body
  const fps = req.body.gifskiFps;
  const quality = req.body.gifskiQuality;

  // Construct the Gifski command to compress the GIF with specified FPS and quality
  const gifskiCommand = `gifski --fps ${fps} --quality ${quality} --output "${outputFilePath}" ${imagePath}`;

  // Execute the compression command
  exec(gifskiCommand, (error) => {
    // Delete the original uploaded GIF image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, log it and send a 500 response
    if (error) {
      console.error("Error compressing GIF with Gifski:", error);
      return res.status(500).send("Failed to compress GIF with Gifski.");
    }

    // Send the compressed GIF file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, log it and send a 500 response
      if (err) {
        console.error("Error sending Gifski-compressed GIF:", err);
        return res.status(500).send("Error sending compressed GIF.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
});

// Callbacks for compression

// ------- Callback Function to Compress JPEG ------- //
function compressJpeg(imagePath, res) {
  // Define a default compression level for JPEG
  const compressionLevel = 85;

  // Generate a unique filename for the compressed JPEG image
  const outputFileName = `compressed_${Date.now()}.jpg`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Construct the ImageMagick command to compress the JPEG image
  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error) => {
    // Delete the original uploaded image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, send a 500 response
    if (error) {
      return res.status(500).send("Failed to compress JPEG.");
    }

    // Send the compressed JPEG file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, send a 500 response
      if (err) {
        return res.status(500).send("Error sending compressed JPEG.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
}

// ------- Callback Function to Compress PNG ------- //
function compressPng(imagePath, res) {
  // Generate a unique filename for the compressed PNG image
  const outputFileName = `compressed_${Date.now()}.png`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // ImageMagick command to strip metadata and compress the PNG image
  const compressCommand = `convert "${imagePath}" -strip -quality 80 "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error, stdout, stderr) => {
    // Delete the original uploaded image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, send a 500 response
    if (error) {
      return res.status(500).send("Failed to compress PNG.");
    }

    // Send the compressed PNG file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, send a 500 response
      if (err) {
        return res.status(500).send("Error sending compressed PNG.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
}

// ------- Callback Function to Compress WebP ------- //
function compressWebp(imagePath, res) {
  // Define a default compression level for WebP
  const compressionLevel = 80;

  // Generate a unique filename for the compressed WebP image
  const outputFileName = `compressed_${Date.now()}.webp`;

  // Define the full path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // ImageMagick command to compress the WebP image
  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error) => {
    // Delete the original uploaded image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, send a 500 response
    if (error) {
      return res.status(500).send("Failed to compress WebP.");
    }

    // Send the compressed WebP file back to the client
    res.sendFile(outputFilePath, () => {
      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
}

// ------- Callback Function to Compress GIF ------- //
function compressGif(imagePath, res) {
  // Generate a unique filename for the compressed GIF
  const outputFileName = `compressed_${Date.now()}.gif`;

  // Define path for the output file
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  // Gifsicle command to optimize and compress the GIF
  const compressCommand = `gifsicle --optimize=3 --lossy=80 --colors=128 "${imagePath}" > "${outputFilePath}"`;

  // Execute the compression command
  exec(compressCommand, (error) => {
    // Delete the original uploaded GIF image to save space
    fs.unlinkSync(imagePath);

    // If there's an error during compression, send a 500 response
    if (error) {
      return res.status(500).send("Failed to compress GIF.");
    }

    // Send the compressed GIF file back to the client
    res.sendFile(outputFilePath, (err) => {
      // If there's an error sending the file, send a 500 response
      if (err) {
        return res.status(500).send("Error sending compressed GIF.");
      }

      // After sending the file, delete the compressed file from the server
      fs.unlinkSync(outputFilePath);
    });
  });
}

// ------- Convert to ------- //

// ------- Convert to PNG ------- //
app.post("/convertToPng", upload.single("image"), (req, res) => {
  // Get the uploaded image path
  const imagePath = req.file.path;
  const tempPngPath = path.join(convertedDir, `temp_${Date.now()}.png`); // Temporary PNG path
  const outputPath = path.join(convertedDir, `compressed_${Date.now()}.png`); // Final output path

  // Convert the image to PNG format using ImageMagick
  exec(`convert "${imagePath}" -strip -quality 80 "${tempPngPath}"`, (convertError) => {
    if (convertError) {
      console.error("Error converting image to PNG:", convertError);
      return res.status(500).send("Error converting image to PNG.");
    }

    // Compress the PNG using pngquant
    const compressCommand = `pngquant --quality=65-80 "${tempPngPath}" --output "${outputPath}" --force`;

    exec(compressCommand, (compressError) => {
      if (compressError) {
        console.error("Error compressing PNG:", compressError);
        return res.status(500).send("Error compressing PNG.");
      }

      // Download the compressed PNG file
      res.download(outputPath, () => {
        // Clean up temporary and output files
        fs.unlinkSync(imagePath);
        fs.unlinkSync(tempPngPath);
        fs.unlinkSync(outputPath);
      });
    });
  });
});

// ------- Convert to JPEG ------- //
app.post("/convertToJpeg", upload.single("image"), (req, res) => {
  // Get the uploaded image path
  const imagePath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.jpeg`); // Output path for JPEG

  // Compress JPEG with a quality setting for smaller size
  const convertCommand = `convert "${imagePath}" -quality 85 "${outputPath}"`;

  exec(convertCommand, (error) => {
    if (error) {
      console.error("Error converting image to JPEG:", error);
      return res.status(500).send("Error converting image to JPEG.");
    }

    // Download the converted JPEG file
    res.download(outputPath, () => {
      // Clean up original and output files
      fs.unlinkSync(imagePath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.post("/convertToMp4", upload.single("video"), (req, res) => {
  // Check if a video file was uploaded
  if (!req.file) {
    console.error("No file uploaded.");
    return res.status(400).send("No file uploaded.");
  }

  const videoPath = req.file.path; // Get the uploaded video path
  const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.mp4`); // Output path for MP4

  // Convert the video to MP4 format using ffmpeg with a 10-minute timeout
  const convertCommand = `ffmpeg -i "${videoPath}" -vcodec libx264 -preset ultrafast -crf 28 "${outputPath}"`;

  // Set the timeout to 10 minutes (600,000 ms)
  exec(convertCommand, { timeout: 600000 }, (convertError) => {
    if (convertError) {
      if (convertError.killed) {
        console.error("Conversion process timed out after 10 minutes.");
        return res.status(500).send("Conversion process timed out.");
      }
      console.error("Error converting video to MP4:", convertError);
      return res.status(500).send("Error converting video to MP4.");
    }

    // Download the converted MP4 file
    res.download(outputPath, () => {
      // Clean up original and output files
      fs.unlinkSync(videoPath);
      fs.unlinkSync(outputPath);
    });
  });
});

// ------- Convert to WebP (Image) ------- //
app.post("/convertToWebP", upload.single("image"), (req, res) => {
  // Get the uploaded image path
  const imagePath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`); // Output path for WebP

  // Compress WEBP with a quality setting for smaller size
  const convertCommand = `convert "${imagePath}" -quality 80 "${outputPath}"`;

  exec(convertCommand, (error) => {
    if (error) {
      console.error("Error converting image to WEBP:", error);
      return res.status(500).send("Error converting image to WEBP.");
    }

    // Download the converted WebP file
    res.download(outputPath, () => {
      // Clean up original and output files
      fs.unlinkSync(imagePath);
      fs.unlinkSync(outputPath);
    });
  });
});

// ------- Convert Video to WebP ------- //
app.post("/convertToWebP", upload.single("video"), (req, res) => {
  const videoPath = req.file.path; // Get the uploaded video path
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`); // Output path for WebP

  // Convert the video to WebP format using ffmpeg
  const convertCommand = `ffmpeg -i "${videoPath}" -vf scale=iw:ih -vcodec libwebp -compression_level 6 -q:v 30 -preset picture -an -loop 0 -vsync 0 "${outputPath}"`;

  exec(convertCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error converting video to WebP:", stderr);
      return res.status(500).send("Error converting video to WebP.");
    }

    res.setHeader("Content-Type", "image/webp"); // Set content type for the response
    // Download the converted WebP file
    res.download(outputPath, "video.webp", (downloadErr) => {
      if (downloadErr) {
        console.error("Error sending the WebP file:", downloadErr);
      }

      // Clean up original and output files
      fs.unlinkSync(videoPath);
      fs.unlinkSync(outputPath);
    });
  });
});

// ------- Convert Video to AVIF ------- //
app.post("/convertToAvif", upload.single("video"), (req, res) => {
  const videoPath = req.file.path; // Get the uploaded video path
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.avif`); // Output path for AVIF
  const trimStart = parseInt(req.body.trimStart) || 0; // Get trim start time
  const trimEnd = parseInt(req.body.trimEnd) || 0; // Get trim end time

  let inputOptions = "";
  if (trimEnd > trimStart) {
    inputOptions = `-ss ${trimStart} -to ${trimEnd}`; // Set input options for trimming
  }

  // Convert the video to AVIF format using ffmpeg
  const convertCommand = `ffmpeg -y ${inputOptions} -i "${videoPath}" -c:v libaom-av1 -crf 63 -b:v 0 -cpu-used 8 -row-mt 1 -an "${outputPath}"`;

  exec(convertCommand, { timeout: 600000 }, (convertError) => {
    fs.unlinkSync(videoPath); // Clean up the original video file
    if (convertError) {
      if (convertError.killed) {
        console.error("Conversion timed out.");
        return res.status(500).send("Conversion timed out.");
      }
      console.error("Conversion Error:", convertError);
      return res.status(500).send("Error converting video to AVIF.");
    }

    // Download the converted AVIF file
    res.download(outputPath, "video.avif", (downloadErr) => {
      if (downloadErr) {
        console.error("SendFile Error:", downloadErr.message);
        return res.status(500).send("Error sending the converted file.");
      }
      fs.unlinkSync(outputPath); // Clean up the output file
    });
  });
});

// ------- Trim Video ------- //
app.post("/trimVideo", upload.single("video"), (req, res) => {
  const videoPath = req.file.path; // Get the uploaded video path
  const trimStart = parseInt(req.body.trimStart) || 0; // Get trim start time
  const trimEnd = parseInt(req.body.trimEnd) || 0; // Get trim end time
  const outputPath = path.join(__dirname, "trimmed", `trimmed_${Date.now()}_${req.file.originalname}`); // Output path for trimmed video

  // Create a directory for trimmed videos if it doesn't exist
  if (!fs.existsSync("trimmed")) {
    fs.mkdirSync("trimmed");
  }

  const duration = trimEnd - trimStart; // Calculate duration for trimming
  // Command to trim the video using ffmpeg
  const trimCommand = `ffmpeg -y -i "${videoPath}" -ss ${trimStart} -t ${duration} -c copy "${outputPath}"`;

  exec(trimCommand, (error, stdout, stderr) => {
    fs.unlinkSync(videoPath); // Clean up the original video file

    if (error) {
      console.error("Error trimming video:", stderr);
      return res.status(500).send("Failed to trim video.");
    }

    // Send the trimmed video file to the client
    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error("Error sending trimmed video:", err);
        return res.status(500).send("Error sending trimmed video.");
      }

      fs.unlinkSync(outputPath); // Clean up the output file
    });
  });
});

// ------- Convert Video to GIF ------- //
app.post("/convertToGif", upload.single("video"), (req, res) => {
  if (!req.file) {
    console.error("No file uploaded.");
    return res.status(400).send("No file uploaded.");
  }

  const videoPath = req.file.path; // Get the uploaded video path
  const framesDir = path.join(__dirname, `frames_${Date.now()}`); // Temporary frames directory
  const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.gif`); // Output path for GIF

  fs.mkdirSync(framesDir, { recursive: true }); // Create frames directory

  // Command to extract frames from the video
  const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=15 "${path.join(framesDir, "frame_%04d.png")}"`;

  exec(extractFramesCommand, (extractError) => {
    if (extractError) {
      console.error("Error extracting frames:", extractError);
      cleanup(videoPath, framesDir); // Clean up
      return res.status(500).send("Error extracting frames.");
    }

    // Read the frames directory to get the frame files
    fs.readdir(framesDir, (err, files) => {
      if (err) {
        console.error("Error reading frames directory:", err);
        cleanup(videoPath, framesDir); // Clean up
        return res.status(500).send("Could not read frames directory.");
      }

      // Sort frame files numerically
      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      const frameFiles = files.map((file) => path.join(framesDir, file)); // Prepare frame file paths

      // Command to create GIF using gifski
      execFile("gifski", ["-o", outputPath, "--fps", "15", "--quality", "80", ...frameFiles], (gifskiError, stdout, stderr) => {
        if (gifskiError) {
          console.error("Error creating GIF with gifski:", gifskiError);
          console.error("stderr:", stderr);
          cleanup(videoPath, framesDir); // Clean up
          return res.status(500).send("Error creating GIF with gifski.");
        }

        // Download the created GIF
        res.download(outputPath, () => {
          cleanup(videoPath, framesDir, outputPath); // Clean up
        });
      });
    });
  });
});

// ------- Cleanup for GIF ------- //
const cleanup = (videoPath, framesDir, outputPath) => {
  // Delete the uploaded video file
  fs.unlink(videoPath, (err) => {
    if (err) console.error(`Error deleting video file: ${videoPath}`, err);
  });

  // Delete the frames directory
  fs.rm(framesDir, { recursive: true }, (err) => {
    if (err) console.error(`Error deleting frames directory: ${framesDir}`, err);
  });

  // Delete the output GIF file if it exists
  if (outputPath) {
    fs.unlink(outputPath, (err) => {
      if (err) console.error(`Error deleting output GIF: ${outputPath}`, err);
    });
  }
};

// ------ Clipdrop API Effects ------ //

// inpaint

app.post("/text-to-image", upload.none(), async (req, res) => {
  const prompt = req.body.prompt;

  // Validate prompt
  if (!prompt || prompt.length > 1000) {
    return res.status(400).send("Invalid prompt. Please provide a prompt with up to 1000 characters.");
  }

  // Prepare form data for Clipdrop API
  const formData = new FormData();
  formData.append("prompt", prompt);

  try {
    const response = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    // Check if the response is an image
    if (response.headers["content-type"] === "image/png") {
      // Set appropriate headers
      res.setHeader("Content-Type", "image/png");

      // Optionally, set headers for credits remaining and consumed
      res.setHeader("x-remaining-credits", response.headers["x-remaining-credits"]);
      res.setHeader("x-credits-consumed", response.headers["x-credits-consumed"]);

      // Send the image buffer
      res.send(response.data);
    } else {
      // If not an image, it's likely an error in JSON format
      const errorData = JSON.parse(Buffer.from(response.data).toString("utf-8"));
      console.error("API Error:", errorData);
      res.status(response.status).send(errorData.error || "Unknown error from Text to Image API.");
    }
  } catch (error) {
    console.error("Failed to generate image:", error.response ? error.response.data : error.message);
    if (error.response && error.response.data) {
      try {
        const errorData = JSON.parse(Buffer.from(error.response.data).toString("utf-8"));
        res.status(error.response.status).send(errorData.error || "Unknown error from Text to Image API.");
      } catch (parseError) {
        res.status(error.response.status).send("Error generating image.");
      }
    } else {
      res.status(500).send("Failed to generate image.");
    }
  }
});

app.post("/text-inpainting", upload.fields([{ name: "image_file" }, { name: "mask_file" }]), async (req, res) => {
  const imagePath = req.files["image_file"][0].path;
  const maskPath = req.files["mask_file"][0].path;
  const textPrompt = req.body.text_prompt;

  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));
  formData.append("mask_file", fs.createReadStream(maskPath));
  formData.append("text_prompt", textPrompt);

  try {
    const response = await axios.post("https://clipdrop-api.co/text-inpainting/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    fs.unlinkSync(imagePath);
    fs.unlinkSync(maskPath);

    const imageType = response.headers["content-type"];
    res.setHeader("Content-Type", imageType);
    res.send(response.data);
  } catch (error) {
    console.error("Failed to inpaint text:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to inpaint text.");
  }
});

// remove text
app.post("/remove-text", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const imagePath = req.file.path;

  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));

  try {
    const response = await axios.post("https://clipdrop-api.co/remove-text/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    fs.unlinkSync(imagePath);

    const imageType = response.headers["content-type"];
    res.setHeader("Content-Type", imageType);
    res.send(response.data);
  } catch (error) {
    console.error("Failed to remove text from image:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to remove text from image.");
  }
});

//cleanup
app.post("/cleanup-image", upload.fields([{ name: "image_file" }, { name: "mask_file" }]), async (req, res) => {
  const imagePath = req.files["image_file"][0].path;
  const maskPath = req.files["mask_file"][0].path;

  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));
  formData.append("mask_file", fs.createReadStream(maskPath));
  formData.append("mode", "quality");

  try {
    const response = await axios.post("https://clipdrop-api.co/cleanup/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    // console.log('API Call Success:', response.data);

    fs.unlinkSync(imagePath);
    fs.unlinkSync(maskPath);
    const imageType = "image/png";
    res.setHeader("Content-Type", imageType);
    res.send(response.data);
  } catch (error) {
    console.error("API Call Failed:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to cleanup image");
  }
});

// uncrop
app.post("/uncrop-image", upload.single("image"), async (req, res) => {
  // Check if an image file was uploaded
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  // Extract image path and parameters from the request
  const imagePath = req.file.path;
  const { extend_left, extend_right, extend_up, extend_down, seed } = req.body;

  console.log("Received parameters:", { extend_left, extend_right, extend_up, extend_down, seed });

  // Prepare form data for the API request
  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));
  if (extend_left) formData.append("extend_left", extend_left);
  if (extend_right) formData.append("extend_right", extend_right);
  if (extend_up) formData.append("extend_up", extend_up);
  if (extend_down) formData.append("extend_down", extend_down);
  if (seed) formData.append("seed", seed);

  try {
    // Send request to the uncrop API
    const response = await axios.post("https://clipdrop-api.co/uncrop/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer", // Expecting binary data in response
    });

    // Delete the original image file after processing
    fs.unlinkSync(imagePath);
    const imageType = response.headers["content-type"] === "image/webp" ? "webp" : "jpeg"; // Determine image type
    res.setHeader("Content-Type", `image/${imageType}`); // Set the content type for response
    res.send(response.data); // Send the processed image back to the user
  } catch (error) {
    console.error("Failed to uncrop image:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to uncrop image"); // Handle errors
  }
});

// upscale
app.post("/upscale-image", upload.single("image"), async (req, res) => {
  // Check if an image file was uploaded
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  // Extract image path and target dimensions from the request
  const imagePath = req.file.path;
  const { target_width, target_height } = req.body;

  // Prepare form data for the API request
  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));
  formData.append("target_width", target_width);
  formData.append("target_height", target_height);

  try {
    // Send request to the external upscale API
    const response = await axios.post("https://clipdrop-api.co/image-upscaling/v1/upscale", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e", // API Key
      },
      responseType: "arraybuffer", // Expecting binary data in response
    });

    // Delete the original image file after processing
    fs.unlinkSync(imagePath);
    const imageType = response.headers["content-type"] === "image/webp" ? "webp" : "jpeg"; // Determine image type
    res.setHeader("Content-Type", `image/${imageType}`); // Set the content type for response
    res.send(response.data); // Send the processed image back to the client
  } catch (error) {
    console.error("Failed to upscale image:", error);
    res.status(500).send("Failed to upscale image."); // handle errors
  }
});

// remove bg
app.post("/remove-background", upload.single("image"), async (req, res) => {
  // Check if an image file was uploaded
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  // Extract image path for background removal
  const imagePath = req.file.path;
  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath)); // Prepare form data

  try {
    // Send request to the external background removal API
    const response = await axios.post("https://clipdrop-api.co/remove-background/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e", // Your API key
      },
      responseType: "arraybuffer", // Expecting binary data in response
    });

    // Delete the original image file after processing
    fs.unlinkSync(imagePath);
    const imageType = response.headers["content-type"]; // Determine image type
    res.setHeader("Content-Type", imageType); // Set the content type for response
    res.send(response.data); // Send the processed image back to the client
  } catch (error) {
    console.error("Failed to remove background:", error);
    res.status(500).send("Failed to remove background"); // Handle errors
  }
});

// ----- Video Subtitles with speech-to-text API ------ //

async function uploadFileToGCS(filePath) {
  try {
    const fileName = path.basename(filePath);
    await bucket.upload(filePath, {
      destination: fileName,
      gzip: true, // Compress the file
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });
    console.log(`File ${fileName} uploaded to ${bucket.name}.`);
    return `gs://${bucket.name}/${fileName}`;
  } catch (error) {
    console.error("Error uploading file to GCS:", error);
    throw new Error("Failed to upload file to Google Cloud Storage.");
  }
}

// Sends audio to Speech-to-Text API
async function transcribeAudio(filePath) {
  try {
    const gcsUri = await uploadFileToGCS(filePath);
    console.log(`Audio uploaded to GCS at ${gcsUri}`);

    const request = {
      audio: {
        uri: gcsUri,
      },
      config: {
        encoding: "FLAC",
        sampleRateHertz: 16000,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
      },
    };

    const [operation] = await speechClient.longRunningRecognize(request);
    console.log("Speech-to-Text operation started.");

    const [response] = await operation.promise();
    console.log("Speech-to-Text operation completed.");

    const transcriptionResults = response.results.map((result) => {
      const alternatives = result.alternatives[0];
      const timestamps = alternatives.words.map((word) => ({
        word: word.word,
        startTime: parseFloat(word.startTime.seconds) + word.startTime.nanos * 1e-9,
        endTime: parseFloat(word.endTime.seconds) + word.endTime.nanos * 1e-9,
      }));
      console.log("Raw Timestamps:", timestamps);
      return {
        transcript: alternatives.transcript,
        timestamps: timestamps,
      };
    });

    return transcriptionResults;
  } catch (error) {
    console.error("Error in transcribing audio:", error);
    throw new Error("Failed to transcribe audio.");
  }
}

// Creates SRT (SubRip Subtitle) file from the transcription results.
function createSRT(transcriptionResults, srtPath, maxWordsPerLine = 10, maxDurationPerLine = 5, bufferTime = 0.1) {
  let srtContent = [];
  let index = 1;
  let sentence = "";
  let startTime = 0;
  let endTime = 0;

  transcriptionResults.forEach((result) => {
    result.timestamps.forEach((word, idx) => {
      if (sentence === "") {
        startTime = word.startTime;
      }
      sentence += (sentence ? " " : "") + word.word;

      const currentDuration = word.endTime - startTime;
      const wordCount = sentence.split(" ").length;

      // Create a new subtitle line if the word count or duration exceeds the limits
      if (
        wordCount >= maxWordsPerLine ||
        currentDuration >= maxDurationPerLine ||
        idx === result.timestamps.length - 1 ||
        (result.timestamps[idx + 1] && result.timestamps[idx + 1].startTime - word.endTime > 1)
      ) {
        endTime = word.endTime;

        // Ensure no overlap
        if (srtContent.length > 0) {
          const previousSubtitle = srtContent[srtContent.length - 1];
          const previousEndTime = parseSRTTime(previousSubtitle.split(" --> ")[1].split("\n")[0]);
          if (startTime < previousEndTime) {
            startTime = previousEndTime + bufferTime;
          }
        }

        const formattedStart = formatSRTTime(startTime);
        const formattedEnd = formatSRTTime(endTime + bufferTime);
        srtContent.push(`${index}\n${formattedStart} --> ${formattedEnd}\n${sentence}\n`);
        index++;
        sentence = "";

        // Adjust the start time of the next subtitle to prevent overlap
        if (result.timestamps[idx + 1]) {
          startTime = Math.max(result.timestamps[idx + 1].startTime, endTime + bufferTime);
        }
      }
    });
  });

  fs.writeFileSync(srtPath, srtContent.join("\n\n"), "utf8");
  console.log(`SRT file created at: ${srtPath}`);
  console.log(`SRT file content:\n${srtContent.join("\n\n")}`);
}

// Converts time value to subtitle time format (HH:MM:SS,mmm)
function formatSRTTime(rawTime) {
  const time = parseFloat(rawTime);
  let hours = Math.floor(time / 3600);
  let minutes = Math.floor((time % 3600) / 60);
  let seconds = Math.floor(time % 60);
  let milliseconds = Math.round((time - Math.floor(time)) * 1000);

  hours = hours.toString().padStart(2, "0");
  minutes = minutes.toString().padStart(2, "0");
  seconds = seconds.toString().padStart(2, "0");
  milliseconds = milliseconds.toString().padStart(3, "0");

  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

// Converts SRT time back into seconds
function parseSRTTime(srtTime) {
  const [hours, minutes, seconds] = srtTime.split(":");
  const [secs, millis] = seconds.split(",");
  return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(secs) + parseFloat(millis) / 1000;
}

// Transcribes audio from a video file and returns the transcript with word timestamps
app.post("/transcribe-video", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No video file uploaded.");
  }

  const videoPath = req.file.path;
  const audioPath = path.join(__dirname, "subtitles", `${req.file.filename}.flac`);
  const srtPath = path.join(__dirname, "subtitles", `${req.file.filename}.srt`);
  const outputPath = path.join(__dirname, "subtitles", `${req.file.filename}_subtitled.mp4`);
  const fontSize = req.body.fontSize || 24;
  const fontFamily = req.body.fontFamily || "Arial";
  const fontColor = req.body.fontColor || "#FFFFFF";
  const maxWordsPerLine = parseInt(req.body.maxWordsPerLine, 10) || 10;
  const maxDurationPerLine = parseFloat(req.body.maxDurationPerLine) || 5;
  const bufferTime = parseFloat(req.body.bufferTime) || 0.1;
  const borderStyle = parseInt(req.body.borderStyle, 10) || 1;
  const outlineColor = req.body.outlineColor || "#000000";
  const subtitlePosition = req.body.subtitlePosition || "bottom";

  const convertHexToSubtitleColor = (hex) => {
    const alpha = "00"; // Fully opaque
    const red = hex.substring(1, 3);
    const green = hex.substring(3, 5);
    const blue = hex.substring(5, 7);
    return `&H${alpha}${blue}${green}${red}&`;
  };

  const primaryColor = convertHexToSubtitleColor(fontColor);
  const outlineSubtitleColor = convertHexToSubtitleColor(outlineColor);
  const alignment = subtitlePosition === "top" ? 6 : 2;

  try {
    // Extract audio from video and convert to FLAC
    const ffmpegExtractAudioCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -vn -y -f flac "${audioPath}"`;
    exec(ffmpegExtractAudioCommand, async (error) => {
      if (error) {
        console.error("Error converting video to audio:", error);
        return res.status(500).send("Failed to convert video.");
      }

      try {
        // Transcribe audio using Speech-to-Text
        const transcriptionResults = await transcribeAudio(audioPath);
        if (transcriptionResults.length === 0 || !transcriptionResults[0].transcript.trim()) {
          throw new Error("No transcribable audio found.");
        }

        // Create SRT file
        createSRT(transcriptionResults, srtPath, maxWordsPerLine, maxDurationPerLine, bufferTime);

        if (!fs.existsSync(srtPath)) {
          console.error("SRT file does not exist:", srtPath);
          return res.status(500).send("SRT file creation failed.");
        }

        // Add subtitles to video using FFmpeg
        const ffmpegAddSubtitlesCommand = `ffmpeg -i "${videoPath}" -vf "subtitles=${srtPath}:force_style='Fontsize=${fontSize},Fontname=${fontFamily},PrimaryColour=${primaryColor},BorderStyle=${borderStyle},OutlineColour=${outlineSubtitleColor},Outline=1,Shadow=0,Alignment=${alignment}'" -c:v libx264 -c:a copy "${outputPath}"`;
        console.log(`Running FFmpeg command: ${ffmpegAddSubtitlesCommand}`);
        exec(ffmpegAddSubtitlesCommand, (subError) => {
          cleanupFiles(videoPath, audioPath, srtPath);

          if (subError) {
            console.error("Error adding subtitles:", subError);
            return res.status(500).send("Failed to add subtitles to video.");
          }

          res.json({ message: "Video processed with subtitles", videoUrl: `/subtitles/${path.basename(outputPath)}` });
        });
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        cleanupFiles(videoPath, audioPath, srtPath);
        res.status(500).send("Failed to transcribe audio.");
      }
    });
  } catch (qualityError) {
    console.error("Audio quality error:", qualityError);
    cleanupFiles(videoPath, audioPath, srtPath);
    res.status(400).send("This video cannot be transcribed, please try another video.");
  }
});

// Cleanup files function
function cleanupFiles(videoPath, audioPath, srtPath) {
  try {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

//----- Extra Features -------//

// cleans up folders (compressed, converted, grad,overlay, subtitles, uploads)

// clean up all folders each time the server restarts and every 6 hours if server is running

const clearFolders = () => {
  const folders = [
    "compressed",
    "converted",
    "gradient-background",
    "overlay",
    "subtitles",
    "uploads",
    "processed",
    "videos",
    "processedDir",
    "directories/video_gradient_overlay",
    "directories/video_colored_overlay",
    "directories/video_slow",
  ];

  folders.forEach((folder) => {
    fs.readdir(path.join(__dirname, folder), (err, files) => {
      if (err) {
        console.error(`Error reading folder ${folder}:`, err);
        return;
      }

      files.forEach((file) => {
        const filePath = path.join(__dirname, folder, file);
        if (file !== ".gitkeep") {
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${file} in folder ${folder}:`, err);
              }
            });
          } else {
            console.warn(`File ${file} not found in folder ${folder}, skipping deletion.`);
          }
        }
      });
    });
  });
};
clearFolders(); // clear folders on server startup

setInterval(clearFolders, 6 * 60 * 60 * 1000); // clear folders every 6 hours

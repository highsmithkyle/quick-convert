console.log("Google Upload Credentials Path:", process.env.GOOGLE_UPLOAD_CREDENTIALS);
console.log("Google Application Credentials Path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("Api access token:", process.env.API_ACCESS_TOKEN);

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const app = express();
const upload = multer({ dest: "uploads/" });
const cors = require("cors");
const { Translate } = require("@google-cloud/translate").v2;
const translate = new Translate();
const { v4: uuidv4 } = require("uuid");

const ytdl = require("ytdl-core");

const speech = require("@google-cloud/speech");
const speechClient = new speech.SpeechClient();

const { google } = require("googleapis");
google.options({ auth: new google.auth.GoogleAuth({ logLevel: "debug" }) });

const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: process.env.GOOGLE_UPLOAD_CREDENTIALS,
});
const bucket = storage.bucket("image-2d-to-3d");

const getApiAccessToken = () => {
  try {
    const tokenPath = "/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/api-access-token.txt";
    const token = fs.readFileSync(tokenPath, "utf8").trim();
    console.log("Retrieved API access token:", token);
    return token;
  } catch (error) {
    console.error("Error reading API access token:", error);
    return null;
  }
};

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use("/subtitles", express.static(path.join(__dirname, "subtitles")));

process.env.PATH += ":/usr/bin";
const convertedDir = path.join(__dirname, "converted");
const compressedDir = path.join(__dirname, "compressed");

app.post("/slice-multi", upload.fields([{ name: "video1" }, { name: "video2" }]), (req, res) => {
  const videoPath1 = req.files["video1"][0].path;
  const videoPath2 = req.files["video2"][0].path;
  const tempOutputPath1 = path.join(__dirname, "processed", `temp_output1_${Date.now()}.mp4`);
  const tempOutputPath2 = path.join(__dirname, "processed", `temp_output2_${Date.now()}.mp4`);
  const finalOutputPath = path.join(__dirname, "processed", `final_output_${Date.now()}.mp4`);

  const slices1 = [
    { start: parseFloat(req.body["slice1Start1"]), end: parseFloat(req.body["slice1End1"]) },
    { start: parseFloat(req.body["slice2Start1"]), end: parseFloat(req.body["slice2End1"]) },
    { start: parseFloat(req.body["slice3Start1"]), end: parseFloat(req.body["slice3End1"]) },
  ];

  const slices2 = [
    { start: parseFloat(req.body["slice1Start2"]), end: parseFloat(req.body["slice1End2"]) },
    { start: parseFloat(req.body["slice2Start2"]), end: parseFloat(req.body["slice2End2"]) },
    { start: parseFloat(req.body["slice3Start2"]), end: parseFloat(req.body["slice3End2"]) },
  ];

  const processVideo = (videoPath, slices, outputPath) => {
    return new Promise((resolve, reject) => {
      let filterComplex = "";
      let inputs = [];

      slices.forEach((slice, index) => {
        const { start, end } = slice;
        if (!isNaN(start) && !isNaN(end) && end > start) {
          let duration = end - start;
          filterComplex += `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${index}]; `;
          inputs.push(`[v${index}]`);
        }
      });

      if (inputs.length > 0) {
        filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv]`;
      } else {
        return reject("No valid video segments specified.");
      }

      const ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${outputPath}"`;

      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing FFmpeg command for ${videoPath}:`, stderr);
          return reject("Failed to process video.");
        }
        resolve();
      });
    });
  };

  const concatenateVideos = (inputPaths, outputPath) => {
    return new Promise((resolve, reject) => {
      const concatFileContent = inputPaths.map((path) => `file '${path}'`).join("\n");
      const concatFilePath = path.join(__dirname, "processed", `concat_${Date.now()}.txt`);

      fs.writeFileSync(concatFilePath, concatFileContent);

      const ffmpegConcatCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;

      exec(ffmpegConcatCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing FFmpeg concat command:", stderr);
          return reject("Failed to concatenate videos.");
        }
        fs.unlinkSync(concatFilePath);
        resolve();
      });
    });
  };

  (async () => {
    try {
      await processVideo(videoPath1, slices1, tempOutputPath1);
      await processVideo(videoPath2, slices2, tempOutputPath2);

      await concatenateVideos([tempOutputPath1, tempOutputPath2], finalOutputPath);

      res.download(finalOutputPath, (downloadErr) => {
        if (downloadErr) {
          console.error("Error sending the processed video:", downloadErr);
        }
        fs.unlinkSync(videoPath1);
        fs.unlinkSync(videoPath2);
        fs.unlinkSync(tempOutputPath1);
        fs.unlinkSync(tempOutputPath2);
      });
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  })();
});

// const processSlices = (videoPath, slices, outputPath) => {
//   return new Promise((resolve, reject) => {
//     let filterComplex = "";
//     let inputs = [];

//     slices.forEach((slice, index) => {
//       const { start, end } = slice;
//       if (!isNaN(start) && !isNaN(end) && end > start) {
//         let duration = end - start;
//         filterComplex += `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${index}]; `;
//         inputs.push(`[v${index}]`);
//       }
//     });

//     if (inputs.length > 0) {
//       filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv]`;
//     } else {
//       return reject("No valid video segments specified.");
//     }

//     const ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${outputPath}"`;

//     exec(ffmpegCommand, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error executing FFmpeg command for ${videoPath}:`, stderr);
//         return reject("Failed to process video.");
//       }
//       resolve();
//     });
//   });
// };

// const concatenateVideos = (inputPaths, outputPath) => {
//   return new Promise((resolve, reject) => {
//     const concatFileContent = inputPaths.map((path) => `file '${path}'`).join("\n");
//     const concatFilePath = path.join(__dirname, "processed", `concat_${Date.now()}.txt`);

//     fs.writeFileSync(concatFilePath, concatFileContent);

//     const ffmpegConcatCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;

//     exec(ffmpegConcatCommand, (error, stdout, stderr) => {
//       if (error) {
//         console.error("Error executing FFmpeg concat command:", stderr);
//         return reject("Failed to concatenate videos.");
//       }
//       fs.unlinkSync(concatFilePath);
//       resolve();
//     });
//   });
// };

// app.post("/slice-multi", upload.fields([{ name: "video1" }, { name: "video2" }]), async (req, res) => {
//   const videoPath1 = req.files["video1"][0].path;
//   const videoPath2 = req.files["video2"][0].path;
//   const tempOutputPath1 = path.join(__dirname, "processed", `temp_output1_${Date.now()}.mp4`);
//   const tempOutputPath2 = path.join(__dirname, "processed", `temp_output2_${Date.now()}.mp4`);
//   const finalOutputPath = path.join(__dirname, "processed", `final_output_${Date.now()}.mp4`);

//   const slices1 = [
//     { start: parseFloat(req.body["slice1Start1"]), end: parseFloat(req.body["slice1End1"]) },
//     { start: parseFloat(req.body["slice2Start1"]), end: parseFloat(req.body["slice2End1"]) },
//     { start: parseFloat(req.body["slice3Start1"]), end: parseFloat(req.body["slice3End1"]) },
//   ];

//   const slices2 = [
//     { start: parseFloat(req.body["slice1Start2"]), end: parseFloat(req.body["slice1End2"]) },
//     { start: parseFloat(req.body["slice2Start2"]), end: parseFloat(req.body["slice2End2"]) },
//     { start: parseFloat(req.body["slice3Start2"]), end: parseFloat(req.body["slice3End2"]) },
//   ];

//   try {
//     await processSlices(videoPath1, slices1, tempOutputPath1);
//     await processSlices(videoPath2, slices2, tempOutputPath2);

//     await concatenateVideos([tempOutputPath1, tempOutputPath2], finalOutputPath);

//     res.download(finalOutputPath, (downloadErr) => {
//       if (downloadErr) {
//         console.error("Error sending the processed video:", downloadErr);
//       }
//       fs.unlinkSync(videoPath1);
//       fs.unlinkSync(videoPath2);
//       fs.unlinkSync(tempOutputPath1);
//       fs.unlinkSync(tempOutputPath2);
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send(error);
//   }
// });

app.post("/createGradientImage", (req, res) => {
  const { gradientType, topColor, bottomColor, size } = req.body;

  let dimensions;
  switch (size) {
    case "small":
      dimensions = "600x1000";
      break;
    case "medium":
      dimensions = "600x1500";
      break;
    case "large":
      dimensions = "600x2000";
      break;
    default:
      dimensions = "600x1000";
  }

  const outputFile = path.join(__dirname, "gradient-background", `gradient_${Date.now()}.png`);
  let command;

  switch (gradientType) {
    case "radial":
      command = `convert -size ${dimensions} radial-gradient:#${topColor}-#${bottomColor} ${outputFile}`;
      break;
    case "left-right":
      command = `convert -size ${dimensions} gradient:#${topColor}-#${bottomColor} ${outputFile}`;
      break;
    case "diagonal-tl-br":
      command = `convert -size ${dimensions} gradient:#${topColor}-#${bottomColor} -rotate 45 ${outputFile}`;
      break;
    case "diagonal-tr-bl":
      command = `convert -size ${dimensions} gradient:#${topColor}-#${bottomColor} -rotate 135 ${outputFile}`;
      break;
    case "linear": // Explicitly handle "Top to Bottom"
    default:
      command = `convert -size ${dimensions} gradient:#${topColor}-#${bottomColor} ${outputFile}`;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send("Failed to create gradient image.");
    }
    res.sendFile(outputFile);
  });
});

// yt downloader
app.post("/get-formats", async (req, res) => {
  const { url } = req.body;

  if (!ytdl.validateURL(url)) {
    console.log("Invalid URL attempt:", url);
    return res.status(400).send("Invalid YouTube URL.");
  }

  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl
      .filterFormats(info.formats, "video")
      .filter((format) => format.qualityLabel && !["144p", "240p"].includes(format.qualityLabel))
      .reduce(
        (acc, format) => {
          const key = `${format.qualityLabel}-${format.container}`;
          if (!acc.seen.has(key)) {
            acc.seen.add(key);
            acc.result.push(format);
          }
          return acc;
        },
        { seen: new Set(), result: [] }
      ).result;
    res.json(formats);
  } catch (error) {
    console.error("Error fetching formats:", error);
    res.status(500).send("Failed to fetch formats.");
  }
});

app.post("/download-youtube", async (req, res) => {
  const { url, format } = req.body;
  if (!ytdl.validateURL(url)) {
    return res.status(400).send("Invalid YouTube URL.");
  }

  try {
    const info = await ytdl.getInfo(url);
    const formatOption = info.formats.find((f) => f.itag.toString() === format);
    if (!formatOption) {
      return res.status(400).send("Invalid format selected.");
    }

    const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, "_");
    const videoPath = path.join(__dirname, "downloads", `${videoTitle}.mp4`);
    const audioPath = path.join(__dirname, "downloads", `${videoTitle}.mp3`);
    const outputPath = path.join(__dirname, "downloads", `${videoTitle}_final.mp4`);

    const videoStream = ytdl(url, { quality: formatOption.itag });
    videoStream
      .pipe(fs.createWriteStream(videoPath))
      .on("finish", () => {
        const audioStream = ytdl(url, { quality: "highestaudio" });
        audioStream
          .pipe(fs.createWriteStream(audioPath))
          .on("finish", () => {
            const ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -strict experimental "${outputPath}"`;
            exec(ffmpegCommand, (error, stdout, stderr) => {
              if (error) {
                console.error("ffmpeg error:", stderr);
                return res.status(500).send("Failed to merge video and audio.");
              }
              res.download(outputPath, (err) => {
                if (err) {
                  console.error("Download error:", err);
                }
                // Clean up files
                [videoPath, audioPath, outputPath].forEach((file) => fs.unlinkSync(file));
              });
            });
          })
          .on("error", (error) => {
            console.error("Audio download error:", error);
            res.status(500).send("Audio processing failed");
          });
      })
      .on("error", (error) => {
        console.error("Video download error:", error);
        res.status(500).send("Video processing failed");
      });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Failed to download video.");
  }
});

// youtube downloader

// app.post("/get-formats", async (req, res) => {
//   const { url } = req.body;

//   if (!ytdl.validateURL(url)) {
//     return res.status(400).send("Invalid YouTube URL.");
//   }

//   try {
//     const info = await ytdl.getInfo(url);
//     let formats = ytdl.filterFormats(info.formats, "video");
//     formats = formats.filter((format) => {
//       return format.qualityLabel && !["144p", "240p"].includes(format.qualityLabel);
//     });

//     // Remove duplicate formats
//     const seen = new Set();
//     formats = formats.filter((format) => {
//       const key = `${format.qualityLabel}-${format.container}`;
//       if (seen.has(key)) {
//         return false;
//       }
//       seen.add(key);
//       return true;
//     });

//     res.json(formats);
//   } catch (error) {
//     console.error("Error fetching formats:", error);
//     res.status(500).send("Failed to fetch formats.");
//   }
// });

// app.post("/download-youtube", async (req, res) => {
//   const { url, format } = req.body;

//   if (!ytdl.validateURL(url)) {
//     return res.status(400).send("Invalid YouTube URL.");
//   }

//   try {
//     const info = await ytdl.getInfo(url);
//     const formatOptions = info.formats.find((f) => f.itag.toString() === format);
//     if (!formatOptions) {
//       return res.status(400).send("Invalid format selected.");
//     }

//     const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, "_");
//     const videoPath = path.join(__dirname, "downloads", `${videoTitle}.mp4`);
//     const audioPath = path.join(__dirname, "downloads", `${videoTitle}.mp3`);
//     const outputPath = path.join(__dirname, "downloads", `${videoTitle}_final.mp4`);

//     // Download video stream
//     const videoStream = ytdl(url, { quality: formatOptions.itag });
//     const videoWriteStream = fs.createWriteStream(videoPath);
//     videoStream.pipe(videoWriteStream);

//     videoWriteStream.on("finish", () => {
//       // Download audio stream
//       const audioStream = ytdl(url, { quality: "highestaudio" });
//       const audioWriteStream = fs.createWriteStream(audioPath);
//       audioStream.pipe(audioWriteStream);

//       audioWriteStream.on("finish", () => {
//         const ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -strict experimental "${outputPath}"`;
//         exec(ffmpegCommand, (error, stdout, stderr) => {
//           if (error) {
//             console.error("ffmpeg error:", stderr);
//             return res.status(500).send("Failed to merge video and audio.");
//           }

//           res.download(outputPath, (err) => {
//             if (err) {
//               console.error("Download error:", err);
//             }
//             // Clean up files
//             fs.unlinkSync(videoPath);
//             fs.unlinkSync(audioPath);
//             fs.unlinkSync(outputPath);
//           });
//         });
//       });

//       audioWriteStream.on("error", (err) => {
//         console.error("Audio stream error:", err);
//         res.status(500).send("Failed to download audio.");
//       });
//     });

//     videoWriteStream.on("error", (err) => {
//       console.error("Video stream error:", err);
//       res.status(500).send("Failed to download video.");
//     });
//   } catch (error) {
//     console.error("Download error:", error);
//     res.status(500).send("Failed to download video.");
//   }
// });

// subtitles

async function uploadFileToGCS(filePath) {
  const fileName = path.basename(filePath);
  await bucket.upload(filePath, {
    destination: fileName,
  });
  return `gs://${bucket.name}/${fileName}`;
}

async function transcribeAudio(filePath) {
  const gcsUri = await uploadFileToGCS(filePath);

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
  const [response] = await operation.promise();

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
}

function createSRT(transcriptionResults, srtPath) {
  let srtContent = [];
  let index = 1;
  let sentence = "";
  let startTime = 0;
  let endTime = 0;
  const maxWordsPerLine = 10;
  const maxDurationPerLine = 5;
  const bufferTime = 0.1;

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

function parseSRTTime(srtTime) {
  const [hours, minutes, seconds] = srtTime.split(":");
  const [secs, millis] = seconds.split(",");
  return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(secs) + parseFloat(millis) / 1000;
}

function cleanupFiles(videoPath, audioPath, srtPath) {
  fs.unlinkSync(videoPath);
  fs.unlinkSync(audioPath);
  // fs.unlinkSync(srtPath);
}

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
  const maxWordsPerLine = req.body.maxWordsPerLine || 10;
  const maxDurationPerLine = req.body.maxDurationPerLine || 5;
  const bufferTime = req.body.bufferTime || 0.1;
  const borderStyle = req.body.borderStyle || 1;
  const outlineColor = req.body.outlineColor || "#000000";

  const hexToAssColor = (hex) => {
    const alpha = "00";
    const red = hex.substring(1, 3);
    const green = hex.substring(3, 5);
    const blue = hex.substring(5, 7);
    return `&H${alpha}${blue}${green}${red}&`;
  };

  const primaryColor = hexToAssColor(fontColor);
  const outlineAssColor = hexToAssColor(outlineColor);

  const ffmpegExtractAudioCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -vn -y -f flac "${audioPath}"`;
  exec(ffmpegExtractAudioCommand, async (error) => {
    if (error) {
      console.error("Error converting video to audio:", error);
      return res.status(500).send("Failed to convert video.");
    }

    try {
      const transcriptionResults = await transcribeAudio(audioPath);
      createSRT(transcriptionResults, srtPath, maxWordsPerLine, maxDurationPerLine, bufferTime);

      // Verify the SRT file exists before running FFmpeg
      if (!fs.existsSync(srtPath)) {
        console.error("SRT file does not exist:", srtPath);
        return res.status(500).send("SRT file creation failed.");
      }

      const ffmpegAddSubtitlesCommand = `ffmpeg -i "${videoPath}" -vf "subtitles=${srtPath}:force_style='Fontsize=${fontSize},Fontname=${fontFamily},PrimaryColour=${primaryColor},BorderStyle=${borderStyle},OutlineColour=${outlineAssColor},Outline=1,Shadow=0'" -c:v libx264 -c:a copy "${outputPath}"`;
      console.log(`Running FFmpeg command: ${ffmpegAddSubtitlesCommand}`); // Debug log
      exec(ffmpegAddSubtitlesCommand, (subError) => {
        cleanupFiles(videoPath, audioPath, srtPath);

        if (subError) {
          console.error("Error adding subtitles:", subError);
          return res.status(500).send("Failed to add subtitles to video.");
        }

        res.json({ message: "Video processed with subtitles", videoUrl: `/subtitles/${req.file.filename}_subtitled.mp4` });
      });
    } catch (transcriptionError) {
      console.error("Transcription error:", transcriptionError);
      cleanupFiles(videoPath, audioPath, srtPath);
      res.status(500).send("Failed to transcribe audio.");
    }
  });
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
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const imagePath = req.file.path;
  const { extend_left, extend_right, extend_up, extend_down, seed } = req.body;

  console.log("Received parameters:", { extend_left, extend_right, extend_up, extend_down, seed });

  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));
  if (extend_left) formData.append("extend_left", extend_left);
  if (extend_right) formData.append("extend_right", extend_right);
  if (extend_up) formData.append("extend_up", extend_up);
  if (extend_down) formData.append("extend_down", extend_down);
  if (seed) formData.append("seed", seed);

  try {
    const response = await axios.post("https://clipdrop-api.co/uncrop/v1", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    fs.unlinkSync(imagePath);
    const imageType = response.headers["content-type"] === "image/webp" ? "webp" : "jpeg";
    res.setHeader("Content-Type", `image/${imageType}`);
    res.send(response.data);
  } catch (error) {
    console.error("Failed to uncrop image:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to uncrop image");
  }
});

// reimage

app.post("/reimagine-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const imagePath = req.file.path;
  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));

  try {
    const response = await axios.post("https://clipdrop-api.co/reimagine/v1/reimagine", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    fs.unlinkSync(imagePath);
    res.setHeader("Content-Type", "image/jpeg");
    res.send(response.data);
  } catch (error) {
    console.error("API Call Failed:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to reimagine image");
  }
});

//upscale

app.post("/upscale-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const imagePath = req.file.path;
  const { target_width, target_height } = req.body;

  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));
  formData.append("target_width", target_width);
  formData.append("target_height", target_height);

  try {
    const response = await axios.post("https://clipdrop-api.co/image-upscaling/v1/upscale", formData, {
      headers: {
        ...formData.getHeaders(),
        "x-api-key": "2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e",
      },
      responseType: "arraybuffer",
    });

    fs.unlinkSync(imagePath);
    const imageType = response.headers["content-type"] === "image/webp" ? "webp" : "jpeg";
    res.setHeader("Content-Type", `image/${imageType}`);
    res.send(response.data);
  } catch (error) {
    console.error("Failed to upscale image:", error);
    res.status(500).send("Failed to upscale image");
  }
});

// remove bg
app.post("/remove-background", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const imagePath = req.file.path;
  const formData = new FormData();
  formData.append("image_file", fs.createReadStream(imagePath));

  try {
    const response = await axios.post("https://clipdrop-api.co/remove-background/v1", formData, {
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
    console.error("Failed to remove background:", error);
    res.status(500).send("Failed to remove background");
  }
});

// video-slice
app.post("/slice", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const finalOutputPath = path.join(__dirname, "processed", `final_output_${Date.now()}.mp4`);

  let filterComplex = "";
  let inputs = [];

  for (let i = 1; i <= 3; i++) {
    const start = parseFloat(req.body[`slice${i}Start`]);
    const end = parseFloat(req.body[`slice${i}End`]);

    if (!isNaN(start) && !isNaN(end) && end > start) {
      let duration = end - start;
      filterComplex += `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${i}]; `;
      inputs.push(`[v${i}]`);
    }
  }

  if (inputs.length > 0) {
    filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv]`;
  } else {
    return res.status(400).send("No valid video segments specified.");
  }

  const ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${finalOutputPath}"`;

  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error executing FFmpeg command:", stderr);
      return res.status(500).send("Failed to process video.");
    }

    res.download(finalOutputPath, (downloadErr) => {
      if (downloadErr) {
        console.error("Error sending the processed video:", downloadErr);
      }
      fs.unlinkSync(videoPath);
    });
  });
});

//colored overlay

app.post("/overlay", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const color = req.body.color.replace("#", "");
  const opacity = parseFloat(req.body.opacity);
  const outputPath = path.join(__dirname, "processed", `overlay_video_${Date.now()}.mp4`);

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
  const videoPath = req.file.path;
  const gradientType = req.body.gradientType;
  const gradientColor = req.body.gradientColor.replace("#", "");
  const outputPath = path.join(__dirname, "processed", `gradient_overlay_video_${Date.now()}.mp4`);

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

app.post("/slowVideo", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const slowFactor = parseFloat(req.body.slowFactor);
  const outputPath = path.join(__dirname, "processed", `slowed_video_${Date.now()}.mp4`);

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

app.post("/convertToWebP", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`);

  const convertCommand = `ffmpeg -i "${videoPath}" -vf scale=iw:ih -vcodec libwebp -compression_level 6 -q:v 30 -preset picture -an -loop 0 -vsync 0 "${outputPath}"`;

  exec(convertCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error converting video to WebP:", stderr);
      return res.status(500).send("Error converting video to WebP.");
    }

    res.setHeader("Content-Type", "image/webp");
    res.download(outputPath, "video.webp", (downloadErr) => {
      if (downloadErr) {
        console.error("Error sending the WebP file:", downloadErr);
      }

      fs.unlinkSync(videoPath);
      fs.unlinkSync(outputPath);
    });
  });
});

const { execFile } = require("child_process");

app.post("/convertToGif", upload.single("video"), (req, res) => {
  if (!req.file) {
    console.error("No file uploaded.");
    return res.status(400).send("No file uploaded.");
  }

  const videoPath = req.file.path;
  const framesDir = path.join(__dirname, `frames_${Date.now()}`);
  const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.gif`);

  fs.mkdirSync(framesDir, { recursive: true });

  const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=15 "${path.join(framesDir, "frame_%04d.png")}"`;

  exec(extractFramesCommand, (extractError) => {
    if (extractError) {
      console.error("Error extracting frames:", extractError);
      cleanup(videoPath, framesDir);
      return res.status(500).send("Error extracting frames.");
    }

    fs.readdir(framesDir, (err, files) => {
      if (err) {
        console.error("Error reading frames directory:", err);
        cleanup(videoPath, framesDir);
        return res.status(500).send("Could not read frames directory.");
      }

      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      const frameFiles = files.map((file) => path.join(framesDir, file));

      execFile("gifski", ["-o", outputPath, "--fps", "15", "--quality", "80", ...frameFiles], (gifskiError, stdout, stderr) => {
        if (gifskiError) {
          console.error("Error creating GIF with gifski:", gifskiError);
          console.error("stderr:", stderr);
          cleanup(videoPath, framesDir);
          return res.status(500).send("Error creating GIF with gifski.");
        }

        res.download(outputPath, () => {
          cleanup(videoPath, framesDir, outputPath);
        });
      });
    });
  });
});

const cleanup = (videoPath, framesDir, outputPath) => {
  fs.unlink(videoPath, (err) => {
    if (err) console.error(`Error deleting video file: ${videoPath}`, err);
  });

  fs.rmdir(framesDir, { recursive: true }, (err) => {
    if (err) console.error(`Error deleting frames directory: ${framesDir}`, err);
  });

  if (outputPath) {
    fs.unlink(outputPath, (err) => {
      if (err) console.error(`Error deleting output GIF: ${outputPath}`, err);
    });
  }
};

app.post("/convertToAvif", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.avif`);

  console.log(`Starting conversion for ${videoPath}`);
  const convertCommand = `ffmpeg -y -i "${videoPath}" -c:v libaom-av1 -crf 40 -b:v 0 -cpu-used 8 -row-mt 1 -an "${outputPath}"`;

  exec(convertCommand, (convertError) => {
    if (convertError) {
      console.error("Conversion Error:", convertError);
      return res.status(500).send("Error converting video to AVIF.");
    }

    fs.access(outputPath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("Converted file does not exist:", err);
        return res.status(404).send("Converted file not found.");
      }

      res.download(outputPath, "video.avif", (downloadErr) => {
        if (downloadErr) {
          console.error("SendFile Error:", downloadErr.message);
          return res.status(500).send("Error sending the converted file.");
        }

        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`Error deleting output file: ${outputPath}`, unlinkErr);
          }
        });
      });
    });
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log(`Server running on port 3000`);
});

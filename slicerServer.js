require("dotenv").config();

const express = require("express");
const multer = require("multer");
const { exec, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const ytdl = require("ytdl-core");
const { google } = require("googleapis");
const { Storage } = require("@google-cloud/storage");
const speech = require("@google-cloud/speech");
const Vibrant = require("node-vibrant");

const sharp = require("sharp");
// remove-text

// Google Cloud
google.options({ auth: new google.auth.GoogleAuth({ logLevel: "debug" }) });
const speechClient = new speech.SpeechClient();
const storage = new Storage({
  keyFilename: process.env.GOOGLE_UPLOAD_CREDENTIALS || "/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/google-credentials.json",
});
const bucket = storage.bucket("image-2d-to-3d");

// Express
const app = express();
const upload = multer({ dest: "uploads/" });
app.use("/videos", express.static(path.join(__dirname, "videos")));

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/subtitles", express.static(path.join(__dirname, "subtitles")));

// Environment Path
process.env.PATH += ":/usr/bin";
const convertedDir = path.join(__dirname, "converted");
const compressedDir = path.join(__dirname, "compressed");

// TensorFlow
const getAccessToken = require("./auth");
const getDisparityMap = require("./getDisparityMap");

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
app.post("/slice-multi", upload.fields([{ name: "video1" }, { name: "video2" }, { name: "video3" }]), async (req, res) => {
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
  let transitionOption = req.body.transitionOption || "none";

  if (Array.isArray(transitionOption)) {
    transitionOption = transitionOption[0];
  }

  console.log("Received /slice-multi request with the following parameters:");
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
    transitionOption,
  });

  const videoPaths = [];
  const tempOutputPaths = [];
  const slices = [];

  for (let i = 1; i <= numVideos; i++) {
    const videoKey = `video${i}`;
    if (req.files[videoKey] && req.files[videoKey][0]) {
      videoPaths.push(req.files[videoKey][0].path);
      tempOutputPaths.push(path.join(__dirname, `processed/temp_output${i}_${Date.now()}.mp4`));
      slices.push([
        {
          start: parseFloat(req.body[`slice1Start${i}`]),
          end: parseFloat(req.body[`slice1End${i}`]),
        },
        {
          start: parseFloat(req.body[`slice2Start${i}`]),
          end: parseFloat(req.body[`slice2End${i}`]),
        },
        {
          start: parseFloat(req.body[`slice3Start${i}`]),
          end: parseFloat(req.body[`slice3End${i}`]),
        },
      ]);
    }
  }

  console.log("Uploaded video paths:", videoPaths);

  if (videoPaths.length === 0) {
    console.log("No videos uploaded.");
    return res.status(400).send("No videos uploaded.");
  }

  let finalOutputPath = path.join(__dirname, `processed/final_output_${Date.now()}.mp4`);
  console.log("Final output path:", finalOutputPath);

  const processVideo = (videoPath, slices, outputPath, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
      let filterComplex = "";
      let inputs = [];
      let durations = [];

      slices.forEach((slice, index) => {
        const { start, end } = slice;
        if (!isNaN(start) && !isNaN(end) && end > start) {
          let duration = end - start;
          durations.push(duration);
          filterComplex += `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,crop=${targetWidth}:${targetHeight}:(in_w-out_w)/2:(in_h-out_h)/2[v${index}]; `;
          inputs.push(`[v${index}]`);
        }
      });

      if (inputs.length > 0) {
        filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv];`;
      } else {
        return reject("No valid video segments specified.");
      }

      console.log(`Processing video: ${videoPath}`);
      console.log("FFmpeg filter_complex:", filterComplex);

      const ffmpegCommand = `ffmpeg -y -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${outputPath}"`;
      console.log("Executing FFmpeg command:", ffmpegCommand);

      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.log("FFmpeg error during processVideo:", stderr);
          return reject("Failed to process video.");
        }
        console.log("FFmpeg processVideo stdout:", stdout);
        resolve(durations);
      });
    });
  };

  const concatenateVideosWithTransitions = (inputPaths, outputPath, transition, durations, transitionDuration = 0.5) => {
    return new Promise((resolve, reject) => {
      if (transition === "fade") {
        let filterComplex = "";
        let inputArgs = "";
        inputPaths.forEach((inputPath, index) => {
          inputArgs += `-i "${inputPath}" `;
          filterComplex += `[${index}:v]format=yuv420p,setsar=1[v${index}]; `;
        });

        let cumulativeOffset = 0;
        let transitionFilters = "";
        for (let i = 1; i < inputPaths.length; i++) {
          cumulativeOffset += durations[i - 1] - transitionDuration;
          if (i === 1) {
            transitionFilters += `[v${i - 1}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${cumulativeOffset}[vxf${i}]; `;
          } else {
            transitionFilters += `[vxf${i - 1}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${cumulativeOffset}[vxf${i}]; `;
          }
          console.log(`Transition ${i}: offset=${cumulativeOffset}`);
        }

        filterComplex += transitionFilters;
        const lastFilter = `[vxf${inputPaths.length - 1}]`;

        const ffmpegCommand = `ffmpeg -y ${inputArgs}-filter_complex "${filterComplex}" -map "${lastFilter}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
        console.log("Executing FFmpeg concatenateVideosWithTransitions command:", ffmpegCommand);

        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.log("FFmpeg error during concatenateVideosWithTransitions:", stderr);
            return reject("Failed to apply transitions.");
          }
          console.log("FFmpeg concatenateVideosWithTransitions stdout:", stdout);
          resolve();
        });
      } else {
        const concatFileContent = inputPaths.map((p) => `file '${p}'`).join("\n");
        const concatFilePath = path.join(__dirname, `processed/concat_${Date.now()}.txt`);
        fs.writeFileSync(concatFilePath, concatFileContent);
        console.log("Created concat file at:", concatFilePath);
        console.log("Concat file content:", concatFileContent);

        const ffmpegConcatCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;
        console.log("Executing FFmpeg concatenateVideosWithTransitions (no transition) command:", ffmpegConcatCommand);

        exec(ffmpegConcatCommand, (error, stdout, stderr) => {
          if (error) {
            console.log("FFmpeg error during concatenateVideosWithTransitions (no transition):", stderr);
            return reject("Failed to concatenate videos.");
          }
          console.log("FFmpeg concatenateVideosWithTransitions (no transition) stdout:", stdout);
          fs.unlinkSync(concatFilePath);
          resolve();
        });
      }
    });
  };

  const applyOverlay = (inputPath, outputPath, color, opacity) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        if (error) {
          console.log("FFprobe error during applyOverlay:", error);
          return reject("Failed to get video size.");
        }

        const [width, height] = stdout.trim().split(",");
        const overlayPath = path.join(__dirname, "overlay", `overlay_${Date.now()}.png`);
        console.log("Overlay path:", overlayPath);
        console.log("Overlay color and opacity:", color, opacity);

        exec(
          `convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0, 2), 16)},${parseInt(color.substring(2, 4), 16)},${parseInt(
            color.substring(4, 6),
            16
          )},${opacity})" "${overlayPath}"`,
          (overlayError, overlayStdout, overlayStderr) => {
            if (overlayError) {
              console.log("ImageMagick convert error during applyOverlay:", overlayStderr);
              return reject("Failed to create overlay.");
            }

            console.log("Created overlay image at:", overlayPath);

            exec(`ffmpeg -y -i "${inputPath}" -i "${overlayPath}" -filter_complex "[0:v][1:v] overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError, ffmpegStdout, ffmpegStderr) => {
              if (ffmpegError) {
                console.log("FFmpeg error during applyOverlay:", ffmpegStderr);
                return reject("Failed to apply overlay.");
              }

              console.log("Applied overlay. FFmpeg stdout:", ffmpegStdout);
              fs.unlinkSync(overlayPath);
              resolve();
            });
          }
        );
      });
    });
  };

  const applyGradientOverlay = (inputPath, outputPath, color, type) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        if (error) {
          console.log("FFprobe error during applyGradientOverlay:", error);
          return reject("Failed to get video size.");
        }

        const [width, height] = stdout.trim().split(",");
        const gradientPath = path.join(__dirname, "overlay", `gradient_${Date.now()}.png`);
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

        console.log("Gradient path:", gradientPath, "Gradient size and position:", gradientSize, overlayPosition);
        console.log("Gradient color:", color);

        exec(`convert -size ${gradientSize} gradient:#00000000-#${color} "${gradientPath}"`, (gradientError, gradientStdout, gradientStderr) => {
          if (gradientError) {
            console.log("ImageMagick convert error during applyGradientOverlay:", gradientStderr);
            return reject("Failed to create gradient.");
          }

          console.log("Created gradient image at:", gradientPath);

          exec(`ffmpeg -y -i "${inputPath}" -i "${gradientPath}" -filter_complex "[0:v][1:v] overlay=${overlayPosition}" -c:a copy "${outputPath}"`, (ffmpegError, ffmpegStdout, ffmpegStderr) => {
            if (ffmpegError) {
              console.log("FFmpeg error during applyGradientOverlay:", ffmpegStderr);
              return reject("Failed to apply gradient overlay.");
            }

            console.log("Applied gradient overlay. FFmpeg stdout:", ffmpegStdout);
            fs.unlinkSync(gradientPath);
            resolve();
          });
        });
      });
    });
  };

  const applySlowVideo = (inputPath, outputPath, factor) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        let ffmpegCommand;

        if (stdout.trim()) {
          ffmpegCommand = `ffmpeg -y -i "${inputPath}" -filter_complex "[0:v]setpts=${factor}*PTS[v];[0:a]atempo=${1 / factor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
        } else {
          ffmpegCommand = `ffmpeg -y -i "${inputPath}" -filter:v "setpts=${factor}*PTS" "${outputPath}"`;
        }

        console.log("Executing FFmpeg applySlowVideo command:", ffmpegCommand);

        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.log("FFmpeg error during applySlowVideo:", stderr);
            return reject("Failed to slow down video.");
          }

          console.log("Applied slow video. FFmpeg stdout:", stdout);
          resolve();
        });
      });
    });
  };

  const convertToGif = (videoPath, fps, quality) => {
    return new Promise((resolve, reject) => {
      const framesDir = path.join(__dirname, `frames_${Date.now()}`);
      const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.gif`);

      fs.mkdirSync(framesDir, { recursive: true });
      console.log("Created frames directory at:", framesDir);

      const extractFramesCommand = `ffmpeg -y -i "${videoPath}" -vf fps=${fps} "${path.join(framesDir, "frame_%04d.png")}"`;
      console.log("Executing FFmpeg extract frames command:", extractFramesCommand);

      exec(extractFramesCommand, (extractError, extractStdout, extractStderr) => {
        if (extractError) {
          console.log("FFmpeg error during convertToGif frame extraction:", extractStderr);
          return reject("Error extracting frames.");
        }

        console.log("Extracted frames successfully.");

        fs.readdir(framesDir, (err, files) => {
          if (err) {
            console.log("Error reading frames directory during convertToGif:", err);
            return reject("Could not read frames directory.");
          }

          files.sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );
          const frameFiles = files.map((file) => path.join(framesDir, file));

          console.log("Frame files for GIF:", frameFiles);

          execFile("gifski", ["-o", outputPath, "--fps", `${fps}`, "--quality", `${quality}`, ...frameFiles], (gifskiError, gifskiStdout, gifskiStderr) => {
            if (gifskiError) {
              console.log("gifski error during convertToGif:", gifskiStderr);
              return reject("Error creating GIF with gifski.");
            }

            console.log("Created GIF at:", outputPath);
            resolve(outputPath);
            cleanup(framesDir);
          });
        });
      });
    });
  };

  const cleanup = (framesDir) => {
    if (framesDir) {
      fs.rm(framesDir, { recursive: true, force: true }, (err) => {
        if (err) {
          console.log("Error during cleanup:", err);
        } else {
          console.log("Cleaned up frames directory:", framesDir);
        }
      });
    }
  };

  try {
    const allDurations = [];
    for (let i = 0; i < videoPaths.length; i++) {
      const durations = await processVideo(videoPaths[i], slices[i], tempOutputPaths[i], outputWidth, outputHeight);
      console.log(`Processed video ${i + 1}, durations:`, durations);
      allDurations.push(...durations);
    }

    let concatenatedOutputPath = finalOutputPath;
    console.log("Starting concatenation with transitions:", transitionOption);

    if (transitionOption === "fade") {
      await concatenateVideosWithTransitions(tempOutputPaths, concatenatedOutputPath, "fade", allDurations, 0.5);
      console.log("Applied fade transitions successfully.");
    } else {
      await concatenateVideosWithTransitions(tempOutputPaths, concatenatedOutputPath, "none", allDurations, 0.5);
      console.log("Concatenated videos without transitions.");
    }

    if (enableOverlay) {
      const overlayedOutputPath = path.join(__dirname, `processed/final_output_overlayed_${Date.now()}.mp4`);
      await applyOverlay(concatenatedOutputPath, overlayedOutputPath, overlayColor, overlayOpacity);
      console.log("Applied overlay successfully.");
      fs.unlinkSync(concatenatedOutputPath);
      concatenatedOutputPath = overlayedOutputPath;
    }

    if (enableGradientOverlay) {
      const gradientOverlayedOutputPath = path.join(__dirname, `processed/final_output_gradient_overlayed_${Date.now()}.mp4`);
      await applyGradientOverlay(concatenatedOutputPath, gradientOverlayedOutputPath, gradientColor, gradientDirection);
      console.log("Applied gradient overlay successfully.");
      fs.unlinkSync(concatenatedOutputPath);
      concatenatedOutputPath = gradientOverlayedOutputPath;
    }

    if (enableSlowVideo) {
      const slowedOutputPath = path.join(__dirname, `processed/final_output_slowed_${Date.now()}.mp4`);
      await applySlowVideo(concatenatedOutputPath, slowedOutputPath, slowFactor);
      console.log("Applied slow motion successfully.");
      fs.unlinkSync(concatenatedOutputPath);
      concatenatedOutputPath = slowedOutputPath;
    }

    if (enableGifConversion) {
      const gifOutputPath = await convertToGif(concatenatedOutputPath, gifFps, gifQuality);
      console.log("Converted video to GIF successfully.");
      fs.unlinkSync(concatenatedOutputPath);
      res.download(gifOutputPath, (downloadErr) => {
        if (downloadErr) {
          console.log("Error sending the converted GIF:", downloadErr);
        } else {
          console.log("Sent GIF successfully.");
        }
        videoPaths.forEach((path) => fs.unlinkSync(path));
        tempOutputPaths.forEach((path) => fs.unlinkSync(path));
        fs.unlinkSync(gifOutputPath);
      });
    } else {
      res.download(concatenatedOutputPath, (downloadErr) => {
        if (downloadErr) {
          console.log("Error sending the processed video:", downloadErr);
        } else {
          console.log("Sent video successfully.");
        }
        videoPaths.forEach((path) => fs.unlinkSync(path));
        tempOutputPaths.forEach((path) => fs.unlinkSync(path));
        fs.unlinkSync(concatenatedOutputPath);
      });
    }
  } catch (error) {
    console.log("Error during /slice-multi processing:", error);
    res.status(500).send(`Error processing videos: ${error}`);
  }
});

// app.post("/slice-multi", upload.fields([{ name: "video1" }, { name: "video2" }, { name: "video3" }]), async (req, res) => {
//   const numVideos = parseInt(req.body.numVideos, 10);
//   const outputWidth = parseInt(req.body.outputWidth, 10);
//   const outputHeight = parseInt(req.body.outputHeight, 10);
//   const enableOverlay = req.body.enableOverlay === "on";
//   const overlayColor = req.body.overlayColor || "";
//   const overlayOpacity = parseFloat(req.body.overlayOpacity || "0");
//   const enableGradientOverlay = req.body.enableGradientOverlay === "on";
//   const gradientColor = req.body.gradientColor ? req.body.gradientColor.replace("#", "") : "";
//   const gradientDirection = req.body.gradientDirection || "";
//   const enableSlowVideo = req.body.enableSlowVideo === "on";
//   const slowFactor = parseFloat(req.body.slowFactor || "1");
//   const enableGifConversion = req.body.enableGifConversion === "on";
//   const gifFps = parseInt(req.body.gifFps || "15", 10);
//   const gifQuality = parseInt(req.body.gifQuality || "80", 10);
//   let transitionOption = req.body.transitionOption || "none";

//   // Handle transitionOption if it's an array
//   if (Array.isArray(transitionOption)) {
//     transitionOption = transitionOption[0];
//   }

//   console.log("Received /slice-multi request with the following parameters:");
//   console.log({
//     numVideos,
//     outputWidth,
//     outputHeight,
//     enableOverlay,
//     overlayColor,
//     overlayOpacity,
//     enableGradientOverlay,
//     gradientColor,
//     gradientDirection,
//     enableSlowVideo,
//     slowFactor,
//     enableGifConversion,
//     gifFps,
//     gifQuality,
//     transitionOption,
//   });

//   const videoPaths = [];
//   const tempOutputPaths = [];
//   const slices = [];

//   for (let i = 1; i <= numVideos; i++) {
//     const videoKey = `video${i}`;
//     if (req.files[videoKey] && req.files[videoKey][0]) {
//       videoPaths.push(req.files[videoKey][0].path);
//       tempOutputPaths.push(path.join(__dirname, `processed/temp_output${i}_${Date.now()}.mp4`));
//       slices.push([
//         {
//           start: parseFloat(req.body[`slice1Start${i}`]),
//           end: parseFloat(req.body[`slice1End${i}`]),
//         },
//         {
//           start: parseFloat(req.body[`slice2Start${i}`]),
//           end: parseFloat(req.body[`slice2End${i}`]),
//         },
//         {
//           start: parseFloat(req.body[`slice3Start${i}`]),
//           end: parseFloat(req.body[`slice3End${i}`]),
//         },
//       ]);
//     }
//   }

//   console.log("Uploaded video paths:", videoPaths);

//   if (videoPaths.length === 0) {
//     console.log("No videos uploaded.");
//     return res.status(400).send("No videos uploaded.");
//   }

//   let finalOutputPath = path.join(__dirname, `processed/final_output_${Date.now()}.mp4`);
//   console.log("Final output path:", finalOutputPath);

//   const processVideo = (videoPath, slices, outputPath, targetWidth, targetHeight) => {
//     return new Promise((resolve, reject) => {
//       let filterComplex = "";
//       let inputs = [];
//       let durations = [];

//       slices.forEach((slice, index) => {
//         const { start, end } = slice;
//         if (!isNaN(start) && !isNaN(end) && end > start) {
//           let duration = end - start;
//           durations.push(duration);
//           filterComplex += `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,crop=${targetWidth}:${targetHeight}:(in_w-out_w)/2:(in_h-out_h)/2[v${index}]; `;
//           inputs.push(`[v${index}]`);
//         }
//       });

//       if (inputs.length > 0) {
//         filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv];`;
//       } else {
//         return reject("No valid video segments specified.");
//       }

//       console.log(`Processing video: ${videoPath}`);
//       console.log("FFmpeg filter_complex:", filterComplex);

//       const ffmpegCommand = `ffmpeg -y -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${outputPath}"`;
//       console.log("Executing FFmpeg command:", ffmpegCommand);

//       exec(ffmpegCommand, (error, stdout, stderr) => {
//         if (error) {
//           console.log("FFmpeg error during processVideo:", stderr);
//           return reject("Failed to process video.");
//         }
//         console.log("FFmpeg processVideo stdout:", stdout);
//         resolve(durations);
//       });
//     });
//   };

//   const concatenateVideosWithTransitions = (inputPaths, outputPath, transition, durations, transitionDuration = 0.5) => {
//     return new Promise((resolve, reject) => {
//       if (transition === "fade") {
//         let filterComplex = "";
//         let inputArgs = "";
//         inputPaths.forEach((inputPath, index) => {
//           inputArgs += `-i "${inputPath}" `;
//           filterComplex += `[${index}:v]format=yuv420p,setsar=1[v${index}]; `;
//         });

//         let cumulativeOffset = 0;
//         let transitionFilters = "";
//         for (let i = 1; i < inputPaths.length; i++) {
//           cumulativeOffset += durations[i - 1] - transitionDuration;
//           transitionFilters += `[v${i - 1}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${cumulativeOffset}[vxf${i}]; `;
//           console.log(`Transition ${i}: offset=${cumulativeOffset}`);
//         }

//         filterComplex += transitionFilters;
//         const lastFilter = `[vxf${inputPaths.length - 1}]`;

//         const ffmpegCommand = `ffmpeg -y ${inputArgs}-filter_complex "${filterComplex}" -map "${lastFilter}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
//         console.log("Executing FFmpeg concatenateVideosWithTransitions command:", ffmpegCommand);

//         exec(ffmpegCommand, (error, stdout, stderr) => {
//           if (error) {
//             console.log("FFmpeg error during concatenateVideosWithTransitions:", stderr);
//             return reject("Failed to apply transitions.");
//           }
//           console.log("FFmpeg concatenateVideosWithTransitions stdout:", stdout);
//           resolve();
//         });
//       } else {
//         const concatFileContent = inputPaths.map((p) => `file '${p}'`).join("\n");
//         const concatFilePath = path.join(__dirname, `processed/concat_${Date.now()}.txt`);
//         fs.writeFileSync(concatFilePath, concatFileContent);
//         console.log("Created concat file at:", concatFilePath);
//         console.log("Concat file content:", concatFileContent);

//         const ffmpegConcatCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;
//         console.log("Executing FFmpeg concatenateVideosWithTransitions (no transition) command:", ffmpegConcatCommand);

//         exec(ffmpegConcatCommand, (error, stdout, stderr) => {
//           if (error) {
//             console.log("FFmpeg error during concatenateVideosWithTransitions (no transition):", stderr);
//             return reject("Failed to concatenate videos.");
//           }
//           console.log("FFmpeg concatenateVideosWithTransitions (no transition) stdout:", stdout);
//           fs.unlinkSync(concatFilePath);
//           resolve();
//         });
//       }
//     });
//   };

//   const applyOverlay = (inputPath, outputPath, color, opacity) => {
//     return new Promise((resolve, reject) => {
//       exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
//         if (error) {
//           console.log("FFprobe error during applyOverlay:", error);
//           return reject("Failed to get video size.");
//         }

//         const [width, height] = stdout.trim().split(",");
//         const overlayPath = path.join(__dirname, "overlay", `overlay_${Date.now()}.png`);
//         console.log("Overlay path:", overlayPath);
//         console.log("Overlay color and opacity:", color, opacity);

//         exec(
//           `convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0, 2), 16)},${parseInt(color.substring(2, 4), 16)},${parseInt(
//             color.substring(4, 6),
//             16
//           )},${opacity})" "${overlayPath}"`,
//           (overlayError, overlayStdout, overlayStderr) => {
//             if (overlayError) {
//               console.log("ImageMagick convert error during applyOverlay:", overlayStderr);
//               return reject("Failed to create overlay.");
//             }

//             console.log("Created overlay image at:", overlayPath);

//             exec(`ffmpeg -y -i "${inputPath}" -i "${overlayPath}" -filter_complex "[0:v][1:v] overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError, ffmpegStdout, ffmpegStderr) => {
//               if (ffmpegError) {
//                 console.log("FFmpeg error during applyOverlay:", ffmpegStderr);
//                 return reject("Failed to apply overlay.");
//               }

//               console.log("Applied overlay. FFmpeg stdout:", ffmpegStdout);
//               fs.unlinkSync(overlayPath);
//               resolve();
//             });
//           }
//         );
//       });
//     });
//   };

//   const applyGradientOverlay = (inputPath, outputPath, color, type) => {
//     return new Promise((resolve, reject) => {
//       exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
//         if (error) {
//           console.log("FFprobe error during applyGradientOverlay:", error);
//           return reject("Failed to get video size.");
//         }

//         const [width, height] = stdout.trim().split(",");
//         const gradientPath = path.join(__dirname, "overlay", `gradient_${Date.now()}.png`);
//         let gradientSize, overlayPosition;

//         switch (type) {
//           case "full":
//             gradientSize = `${width}x${height}`;
//             overlayPosition = "0:0";
//             break;
//           case "half":
//             gradientSize = `${width}x${Math.floor(height / 2)}`;
//             overlayPosition = `0:${Math.floor(height / 2)}`;
//             break;
//           case "quarter":
//             gradientSize = `${width}x${Math.floor(height / 4)}`;
//             overlayPosition = `0:${Math.floor((3 * height) / 4)}`;
//             break;
//           default:
//             gradientSize = `${width}x${height}`;
//             overlayPosition = "0:0";
//         }

//         console.log("Gradient path:", gradientPath, "Gradient size and position:", gradientSize, overlayPosition);
//         console.log("Gradient color:", color);

//         exec(`convert -size ${gradientSize} gradient:#00000000-#${color} "${gradientPath}"`, (gradientError, gradientStdout, gradientStderr) => {
//           if (gradientError) {
//             console.log("ImageMagick convert error during applyGradientOverlay:", gradientStderr);
//             return reject("Failed to create gradient.");
//           }

//           console.log("Created gradient image at:", gradientPath);

//           exec(`ffmpeg -y -i "${inputPath}" -i "${gradientPath}" -filter_complex "[0:v][1:v] overlay=${overlayPosition}" -c:a copy "${outputPath}"`, (ffmpegError, ffmpegStdout, ffmpegStderr) => {
//             if (ffmpegError) {
//               console.log("FFmpeg error during applyGradientOverlay:", ffmpegStderr);
//               return reject("Failed to apply gradient overlay.");
//             }

//             console.log("Applied gradient overlay. FFmpeg stdout:", ffmpegStdout);
//             fs.unlinkSync(gradientPath);
//             resolve();
//           });
//         });
//       });
//     });
//   };

//   const applySlowVideo = (inputPath, outputPath, factor) => {
//     return new Promise((resolve, reject) => {
//       exec(`ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${inputPath}"`, (error, stdout) => {
//         let ffmpegCommand;

//         if (stdout.trim()) {
//           ffmpegCommand = `ffmpeg -y -i "${inputPath}" -filter_complex "[0:v]setpts=${factor}*PTS[v];[0:a]atempo=${1 / factor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
//         } else {
//           ffmpegCommand = `ffmpeg -y -i "${inputPath}" -filter:v "setpts=${factor}*PTS" "${outputPath}"`;
//         }

//         console.log("Executing FFmpeg applySlowVideo command:", ffmpegCommand);

//         exec(ffmpegCommand, (error, stdout, stderr) => {
//           if (error) {
//             console.log("FFmpeg error during applySlowVideo:", stderr);
//             return reject("Failed to slow down video.");
//           }

//           console.log("Applied slow video. FFmpeg stdout:", stdout);
//           resolve();
//         });
//       });
//     });
//   };

//   const convertToGif = (videoPath, fps, quality) => {
//     return new Promise((resolve, reject) => {
//       const framesDir = path.join(__dirname, `frames_${Date.now()}`);
//       const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.gif`);

//       fs.mkdirSync(framesDir, { recursive: true });
//       console.log("Created frames directory at:", framesDir);

//       const extractFramesCommand = `ffmpeg -y -i "${videoPath}" -vf fps=${fps} "${path.join(framesDir, "frame_%04d.png")}"`;
//       console.log("Executing FFmpeg extract frames command:", extractFramesCommand);

//       exec(extractFramesCommand, (extractError, extractStdout, extractStderr) => {
//         if (extractError) {
//           console.log("FFmpeg error during convertToGif frame extraction:", extractStderr);
//           return reject("Error extracting frames.");
//         }

//         console.log("Extracted frames successfully.");

//         fs.readdir(framesDir, (err, files) => {
//           if (err) {
//             console.log("Error reading frames directory during convertToGif:", err);
//             return reject("Could not read frames directory.");
//           }

//           files.sort((a, b) =>
//             a.localeCompare(b, undefined, {
//               numeric: true,
//               sensitivity: "base",
//             })
//           );
//           const frameFiles = files.map((file) => path.join(framesDir, file));

//           console.log("Frame files for GIF:", frameFiles);

//           execFile("gifski", ["-o", outputPath, "--fps", `${fps}`, "--quality", `${quality}`, ...frameFiles], (gifskiError, gifskiStdout, gifskiStderr) => {
//             if (gifskiError) {
//               console.log("gifski error during convertToGif:", gifskiStderr);
//               return reject("Error creating GIF with gifski.");
//             }

//             console.log("Created GIF at:", outputPath);
//             resolve(outputPath);
//             cleanup(framesDir);
//           });
//         });
//       });
//     });
//   };

//   const cleanup = (framesDir) => {
//     if (framesDir) {
//       fs.rm(framesDir, { recursive: true, force: true }, (err) => {
//         if (err) {
//           console.log("Error during cleanup:", err);
//         } else {
//           console.log("Cleaned up frames directory:", framesDir);
//         }
//       });
//     }
//   };

//   try {
//     const allDurations = [];
//     for (let i = 0; i < videoPaths.length; i++) {
//       const durations = await processVideo(videoPaths[i], slices[i], tempOutputPaths[i], outputWidth, outputHeight);
//       console.log(`Processed video ${i + 1}, durations:`, durations);
//       allDurations.push(...durations);
//     }

//     let concatenatedOutputPath = finalOutputPath;
//     console.log("Starting concatenation with transitions:", transitionOption);

//     if (transitionOption === "fade") {
//       await concatenateVideosWithTransitions(tempOutputPaths, concatenatedOutputPath, "fade", allDurations, 0.5);
//       console.log("Applied fade transitions successfully.");
//     } else {
//       await concatenateVideosWithTransitions(tempOutputPaths, concatenatedOutputPath, "none", allDurations, 0.5);
//       console.log("Concatenated videos without transitions.");
//     }

//     if (enableOverlay) {
//       const overlayedOutputPath = path.join(__dirname, `processed/final_output_overlayed_${Date.now()}.mp4`);
//       await applyOverlay(concatenatedOutputPath, overlayedOutputPath, overlayColor, overlayOpacity);
//       console.log("Applied overlay successfully.");
//       fs.unlinkSync(concatenatedOutputPath);
//       concatenatedOutputPath = overlayedOutputPath;
//     }

//     if (enableGradientOverlay) {
//       const gradientOverlayedOutputPath = path.join(__dirname, `processed/final_output_gradient_overlayed_${Date.now()}.mp4`);
//       await applyGradientOverlay(concatenatedOutputPath, gradientOverlayedOutputPath, gradientColor, gradientDirection);
//       console.log("Applied gradient overlay successfully.");
//       fs.unlinkSync(concatenatedOutputPath);
//       concatenatedOutputPath = gradientOverlayedOutputPath;
//     }

//     if (enableSlowVideo) {
//       const slowedOutputPath = path.join(__dirname, `processed/final_output_slowed_${Date.now()}.mp4`);
//       await applySlowVideo(concatenatedOutputPath, slowedOutputPath, slowFactor);
//       console.log("Applied slow motion successfully.");
//       fs.unlinkSync(concatenatedOutputPath);
//       concatenatedOutputPath = slowedOutputPath;
//     }

//     if (enableGifConversion) {
//       const gifOutputPath = await convertToGif(concatenatedOutputPath, gifFps, gifQuality);
//       console.log("Converted video to GIF successfully.");
//       fs.unlinkSync(concatenatedOutputPath);
//       res.download(gifOutputPath, (downloadErr) => {
//         if (downloadErr) {
//           console.log("Error sending the converted GIF:", downloadErr);
//         } else {
//           console.log("Sent GIF successfully.");
//         }
//         videoPaths.forEach((path) => fs.unlinkSync(path));
//         tempOutputPaths.forEach((path) => fs.unlinkSync(path));
//         fs.unlinkSync(gifOutputPath);
//       });
//     } else {
//       res.download(concatenatedOutputPath, (downloadErr) => {
//         if (downloadErr) {
//           console.log("Error sending the processed video:", downloadErr);
//         } else {
//           console.log("Sent video successfully.");
//         }
//         videoPaths.forEach((path) => fs.unlinkSync(path));
//         tempOutputPaths.forEach((path) => fs.unlinkSync(path));
//         fs.unlinkSync(concatenatedOutputPath);
//       });
//     }
//   } catch (error) {
//     console.log("Error during /slice-multi processing:", error);
//     res.status(500).send(`Error processing videos: ${error}`);
//   }
// });

// video-slice - old, single video version
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
  console.log("Request Body:", req.body); // Log form fields
  console.log("Uploaded Files:", req.file); // Log uploaded files

  if (!req.file) {
    return res.status(400).send("No video file uploaded.");
  }

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

// slow video
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

// ------- Compression ------- //

app.post("/compress-webp", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const compressionLevel = parseInt(req.body.compression_level, 10);
  const outputFileName = `compressed_${Date.now()}.webp`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  exec(compressCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) return res.status(500).send("Failed to compress WebP.");
    res.sendFile(outputFilePath, () => {
      fs.unlinkSync(outputFilePath);
    });
  });
});

app.post("/compress-jpeg", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const compressionLevel = parseInt(req.body.compression_level, 10);
  const outputFileName = `compressed_${Date.now()}.jpg`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  exec(compressCommand, (error, stdout, stderr) => {
    fs.unlinkSync(imagePath);

    if (error) {
      console.error("Error compressing JPEG:", stderr);
      return res.status(500).send("Failed to compress JPEG.");
    }

    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error("Error sending compressed JPEG:", err);
        return res.status(500).send("Error sending compressed JPEG.");
      }

      fs.unlinkSync(outputFilePath);
    });
  });
});

app.post("/compress-png", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputFileName = `compressed_${Date.now()}.png`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  const compressCommand = `convert "${imagePath}" -strip -quality 80 "${outputFilePath}"`;

  exec(compressCommand, (error, stdout, stderr) => {
    fs.unlinkSync(imagePath);

    if (error) {
      console.error("Error compressing PNG:", stderr);
      return res.status(500).send("Failed to compress PNG.");
    }

    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error("Error sending compressed PNG:", err);
        return res.status(500).send("Error sending compressed PNG.");
      }

      fs.unlinkSync(outputFilePath);
    });
  });
});

app.post("/compress-gif", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputFileName = `compressed_${Date.now()}.gif`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const lossy = req.body.lossy;
  const colors = req.body.colors;
  const optimize = req.body.optimize;

  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  const compressCommand = `gifsicle --optimize=${optimize} --lossy=${lossy} --colors=${colors} "${imagePath}" > "${outputFilePath}"`;

  exec(compressCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) {
      console.error("Error compressing GIF:", error);
      return res.status(500).send("Failed to compress GIF.");
    }

    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error("Error sending compressed GIF:", err);
        return res.status(500).send("Error sending compressed GIF.");
      }

      fs.unlinkSync(outputFilePath);
    });
  });
});

app.post("/compress-gif-gifsicle", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputFileName = `compressed_${Date.now()}.gif`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const lossy = req.body.lossy;
  const colors = req.body.colors;
  const optimize = req.body.optimize;

  if (!fs.existsSync("processed")) {
    fs.mkdirSync("processed");
  }

  const compressCommand = `gifsicle --optimize=${optimize} --lossy=${lossy} --colors=${colors} "${imagePath}" > "${outputFilePath}"`;

  exec(compressCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) {
      console.error("Error compressing GIF:", error);
      return res.status(500).send("Failed to compress GIF.");
    }

    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error("Error sending compressed GIF:", err);
        return res.status(500).send("Error sending compressed GIF.");
      }

      fs.unlinkSync(outputFilePath);
    });
  });
});

app.post("/compress-gif-gifski", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputFileName = `compressed_${Date.now()}.gif`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const fps = req.body.gifskiFps;
  const quality = req.body.gifskiQuality;

  const gifskiCommand = `gifski --fps ${fps} --quality ${quality} --output ${outputFilePath} ${imagePath}`;

  exec(gifskiCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) {
      console.error("Error compressing GIF with Gifski:", error);
      return res.status(500).send("Failed to compress GIF with Gifski.");
    }
    res.sendFile(outputFilePath, (err) => {
      if (err) {
        console.error("Error sending Gifski-compressed GIF:", err);
        return res.status(500).send("Error sending compressed GIF.");
      }
      fs.unlinkSync(outputFilePath);
    });
  });
});

// Callbacks for compression
function compressJpeg(imagePath, res) {
  const compressionLevel = 85;
  const outputFileName = `compressed_${Date.now()}.jpg`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  exec(compressCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) {
      return res.status(500).send("Failed to compress JPEG.");
    }
    res.sendFile(outputFilePath, (err) => {
      if (err) {
        return res.status(500).send("Error sending compressed JPEG.");
      }
      fs.unlinkSync(outputFilePath);
    });
  });
}

function compressPng(imagePath, res) {
  const outputFileName = `compressed_${Date.now()}.png`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const compressCommand = `convert "${imagePath}" -strip -quality 80 "${outputFilePath}"`;

  exec(compressCommand, (error, stdout, stderr) => {
    fs.unlinkSync(imagePath);
    if (error) {
      return res.status(500).send("Failed to compress PNG.");
    }
    res.sendFile(outputFilePath, (err) => {
      if (err) {
        return res.status(500).send("Error sending compressed PNG.");
      }
      fs.unlinkSync(outputFilePath);
    });
  });
}

function compressWebp(imagePath, res) {
  const compressionLevel = 80;
  const outputFileName = `compressed_${Date.now()}.webp`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const compressCommand = `convert "${imagePath}" -quality ${compressionLevel} "${outputFilePath}"`;

  exec(compressCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) {
      return res.status(500).send("Failed to compress WebP.");
    }
    res.sendFile(outputFilePath, () => {
      fs.unlinkSync(outputFilePath);
    });
  });
}

function compressGif(imagePath, res) {
  const outputFileName = `compressed_${Date.now()}.gif`;
  const outputFilePath = path.join(__dirname, "processed", outputFileName);

  const compressCommand = `gifsicle --optimize=3 --lossy=80 --colors 128 "${imagePath}" > "${outputFilePath}"`;

  exec(compressCommand, (error) => {
    fs.unlinkSync(imagePath);
    if (error) {
      return res.status(500).send("Failed to compress GIF.");
    }
    res.sendFile(outputFilePath, (err) => {
      if (err) {
        return res.status(500).send("Error sending compressed GIF.");
      }
      fs.unlinkSync(outputFilePath);
    });
  });
}

// ------- Convert to ------- //

app.post("/convertToPng", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const tempPngPath = path.join(convertedDir, `temp_${Date.now()}.png`);
  const outputPath = path.join(convertedDir, `compressed_${Date.now()}.png`);

  exec(`convert "${imagePath}" -strip -quality 80 "${tempPngPath}"`, (convertError) => {
    if (convertError) {
      console.error("Error converting image to PNG:", convertError);
      return res.status(500).send("Error converting image to PNG.");
    }

    const compressCommand = `pngquant --quality=65-80 "${tempPngPath}" --output "${outputPath}" --force`;

    exec(compressCommand, (compressError) => {
      if (compressError) {
        console.error("Error compressing PNG:", compressError);
        return res.status(500).send("Error compressing PNG.");
      }

      res.download(outputPath, () => {
        fs.unlinkSync(imagePath);
        fs.unlinkSync(tempPngPath);
        fs.unlinkSync(outputPath);
      });
    });
  });
});

app.post("/convertToJpeg", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.jpeg`);

  // Compress JPEG with a quality setting for smaller size
  const convertCommand = `convert "${imagePath}" -quality 85 "${outputPath}"`;

  exec(convertCommand, (error) => {
    if (error) {
      console.error("Error converting image to JPEG:", error);
      return res.status(500).send("Error converting image to JPEG.");
    }

    res.download(outputPath, () => {
      fs.unlinkSync(imagePath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.post("/convertToMp4", upload.single("video"), (req, res) => {
  if (!req.file) {
    console.error("No file uploaded.");
    return res.status(400).send("No file uploaded.");
  }

  const videoPath = req.file.path;
  const outputPath = path.join(__dirname, "converted", `converted_${Date.now()}.mp4`);

  const convertCommand = `ffmpeg -i "${videoPath}" -vcodec libx264 -preset ultrafast -crf 28 "${outputPath}"`;

  exec(convertCommand, (convertError) => {
    if (convertError) {
      console.error("Error converting video to MP4:", convertError);
      return res.status(500).send("Error converting video to MP4.");
    }

    res.download(outputPath, () => {
      fs.unlinkSync(videoPath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.post("/convertToWebP", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`);

  // Compress WEBP with a quality setting for smaller size
  const convertCommand = `convert "${imagePath}" -quality 80 "${outputPath}"`;

  exec(convertCommand, (error) => {
    if (error) {
      console.error("Error converting image to WEBP:", error);
      return res.status(500).send("Error converting image to WEBP.");
    }

    res.download(outputPath, () => {
      fs.unlinkSync(imagePath);
      fs.unlinkSync(outputPath);
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

app.post("/convertToAvif", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const outputPath = path.join(convertedDir, `converted_${Date.now()}.avif`);
  const trimStart = parseInt(req.body.trimStart) || 0;
  const trimEnd = parseInt(req.body.trimEnd) || 0;

  let inputOptions = "";
  if (trimEnd > trimStart) {
    inputOptions = `-ss ${trimStart} -to ${trimEnd}`;
  }

  const convertCommand = `ffmpeg -y ${inputOptions} -i "${videoPath}" -c:v libaom-av1 -crf 63 -b:v 0 -cpu-used 8 -row-mt 1 -an "${outputPath}"`;

  exec(convertCommand, { timeout: 600000 }, (convertError) => {
    fs.unlinkSync(videoPath);
    if (convertError) {
      if (convertError.killed) {
        console.error("Conversion timed out.");
        return res.status(500).send("Conversion timed out.");
      }
      console.error("Conversion Error:", convertError);
      return res.status(500).send("Error converting video to AVIF.");
    }

    res.download(outputPath, "video.avif", (downloadErr) => {
      if (downloadErr) {
        console.error("SendFile Error:", downloadErr.message);
        return res.status(500).send("Error sending the converted file.");
      }
      fs.unlinkSync(outputPath);
    });
  });
});

app.post("/trimVideo", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const trimStart = parseInt(req.body.trimStart) || 0;
  const trimEnd = parseInt(req.body.trimEnd) || 0;
  const outputPath = path.join(__dirname, "trimmed", `trimmed_${Date.now()}_${req.file.originalname}`);

  if (!fs.existsSync("trimmed")) {
    fs.mkdirSync("trimmed");
  }

  const duration = trimEnd - trimStart;
  const trimCommand = `ffmpeg -y -i "${videoPath}" -ss ${trimStart} -t ${duration} -c copy "${outputPath}"`;

  exec(trimCommand, (error, stdout, stderr) => {
    fs.unlinkSync(videoPath);

    if (error) {
      console.error("Error trimming video:", stderr);
      return res.status(500).send("Failed to trim video.");
    }

    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error("Error sending trimmed video:", err);
        return res.status(500).send("Error sending trimmed video.");
      }

      fs.unlinkSync(outputPath);
    });
  });
});

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

// cleanup GIF files

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

// ------ Clipdrop API Effects ------ //

// inpaint

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

// text to image
app.post("/text-to-image", async (req, res) => {
  console.log("Request body:", req.body);

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).send("No prompt provided.");
  }

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

    const imageType = response.headers["content-type"];
    res.setHeader("Content-Type", imageType);
    res.send(response.data);
  } catch (error) {
    console.error("Failed to generate image from text:", error.response ? error.response.data : error.message);
    res.status(500).send("Failed to generate image from text");
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

// upscale
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
    res.status(500).send("Failed to upscale image.");
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

// upload to Google Cloud Storage bucket
// async function uploadFileToGCS(filePath) {
//   const fileName = path.basename(filePath);
//   await bucket.upload(filePath, {
//     destination: fileName,
//   });
//   return `gs://${bucket.name}/${fileName}`;
// }

// // sends audio to speech-to-text api
// async function transcribeAudio(filePath) {
//   const gcsUri = await uploadFileToGCS(filePath);

//   const request = {
//     audio: {
//       uri: gcsUri,
//     },
//     config: {
//       encoding: "FLAC",
//       sampleRateHertz: 16000,
//       languageCode: "en-US",
//       enableAutomaticPunctuation: true,
//       enableWordTimeOffsets: true,
//     },
//   };

//   const [operation] = await speechClient.longRunningRecognize(request);
//   const [response] = await operation.promise();

//   const transcriptionResults = response.results.map((result) => {
//     const alternatives = result.alternatives[0];
//     const timestamps = alternatives.words.map((word) => ({
//       word: word.word,
//       startTime: parseFloat(word.startTime.seconds) + word.startTime.nanos * 1e-9,
//       endTime: parseFloat(word.endTime.seconds) + word.endTime.nanos * 1e-9,
//     }));
//     console.log("Raw Timestamps:", timestamps);
//     return {
//       transcript: alternatives.transcript,
//       timestamps: timestamps,
//     };
//   });

//   return transcriptionResults;
// }

// // creates SRT (SubRip Subtitle) file from the transcription results.
// function createSRT(transcriptionResults, srtPath) {
//   let srtContent = [];
//   let index = 1;
//   let sentence = "";
//   let startTime = 0;
//   let endTime = 0;
//   const maxWordsPerLine = 10;
//   const maxDurationPerLine = 5;
//   const bufferTime = 0.1;

//   transcriptionResults.forEach((result) => {
//     result.timestamps.forEach((word, idx) => {
//       if (sentence === "") {
//         startTime = word.startTime;
//       }
//       sentence += (sentence ? " " : "") + word.word;

//       const currentDuration = word.endTime - startTime;
//       const wordCount = sentence.split(" ").length;

//       // Create a new subtitle line if the word count or duration exceeds the limits
//       if (
//         wordCount >= maxWordsPerLine ||
//         currentDuration >= maxDurationPerLine ||
//         idx === result.timestamps.length - 1 ||
//         (result.timestamps[idx + 1] && result.timestamps[idx + 1].startTime - word.endTime > 1)
//       ) {
//         endTime = word.endTime;

//         // Ensure no overlap
//         if (srtContent.length > 0) {
//           const previousSubtitle = srtContent[srtContent.length - 1];
//           const previousEndTime = parseSRTTime(previousSubtitle.split(" --> ")[1].split("\n")[0]);
//           if (startTime < previousEndTime) {
//             startTime = previousEndTime + bufferTime;
//           }
//         }

//         const formattedStart = formatSRTTime(startTime);
//         const formattedEnd = formatSRTTime(endTime + bufferTime);
//         srtContent.push(`${index}\n${formattedStart} --> ${formattedEnd}\n${sentence}\n`);
//         index++;
//         sentence = "";

//         // Adjust the start time of the next subtitle to prevent overlap
//         if (result.timestamps[idx + 1]) {
//           startTime = Math.max(result.timestamps[idx + 1].startTime, endTime + bufferTime);
//         }
//       }
//     });
//   });

//   fs.writeFileSync(srtPath, srtContent.join("\n\n"), "utf8");
//   console.log(`SRT file created at: ${srtPath}`);
//   console.log(`SRT file content:\n${srtContent.join("\n\n")}`);
// }

// // converts time value to subtitle time format (HH:MM:SS,mmm)
// function formatSRTTime(rawTime) {
//   const time = parseFloat(rawTime);
//   let hours = Math.floor(time / 3600);
//   let minutes = Math.floor((time % 3600) / 60);
//   let seconds = Math.floor(time % 60);
//   let milliseconds = Math.round((time - Math.floor(time)) * 1000);

//   hours = hours.toString().padStart(2, "0");
//   minutes = minutes.toString().padStart(2, "0");
//   seconds = seconds.toString().padStart(2, "0");
//   milliseconds = milliseconds.toString().padStart(3, "0");

//   return `${hours}:${minutes}:${seconds},${milliseconds}`;
// }
// // converts SRT time back into seconds
// function parseSRTTime(srtTime) {
//   const [hours, minutes, seconds] = srtTime.split(":");
//   const [secs, millis] = seconds.split(",");
//   return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(secs) + parseFloat(millis) / 1000;
// }
// // Transcribes audio from a video file and returns the transcript with word timestamps
// app.post("/transcribe-video", upload.single("video"), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).send("No video file uploaded.");
//   }

//   const videoPath = req.file.path;
//   const audioPath = path.join(__dirname, "subtitles", `${req.file.filename}.flac`);
//   const srtPath = path.join(__dirname, "subtitles", `${req.file.filename}.srt`);
//   const outputPath = path.join(__dirname, "subtitles", `${req.file.filename}_subtitled.mp4`);
//   const fontSize = req.body.fontSize || 24;
//   const fontFamily = req.body.fontFamily || "Arial";
//   const fontColor = req.body.fontColor || "#FFFFFF";
//   const maxWordsPerLine = req.body.maxWordsPerLine || 10;
//   const maxDurationPerLine = req.body.maxDurationPerLine || 5;
//   const bufferTime = req.body.bufferTime || 0.1;
//   const borderStyle = req.body.borderStyle || 1;
//   const outlineColor = req.body.outlineColor || "#000000";
//   const subtitlePosition = req.body.subtitlePosition || "bottom";

//   const convertHexToSubtitleColor = (hex) => {
//     const alpha = "00";
//     const red = hex.substring(1, 3);
//     const green = hex.substring(3, 5);
//     const blue = hex.substring(5, 7);
//     return `&H${alpha}${blue}${green}${red}&`;
//   };

//   const primaryColor = convertHexToSubtitleColor(fontColor);
//   const outlineSubtitleColor = convertHexToSubtitleColor(outlineColor);
//   const alignment = subtitlePosition === "top" ? 6 : 2;

//   try {
//     const ffmpegExtractAudioCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -vn -y -f flac "${audioPath}"`;
//     exec(ffmpegExtractAudioCommand, async (error) => {
//       if (error) {
//         console.error("Error converting video to audio:", error);
//         return res.status(500).send("Failed to convert video.");
//       }

//       try {
//         const transcriptionResults = await transcribeAudio(audioPath);
//         if (transcriptionResults.length === 0 || !transcriptionResults[0].transcript.trim()) {
//           throw new Error("No transcribable audio found.");
//         }

//         createSRT(transcriptionResults, srtPath, maxWordsPerLine, maxDurationPerLine, bufferTime);

//         if (!fs.existsSync(srtPath)) {
//           console.error("SRT file does not exist:", srtPath);
//           return res.status(500).send("SRT file creation failed.");
//         }

//         const ffmpegAddSubtitlesCommand = `ffmpeg -i "${videoPath}" -vf "subtitles=${srtPath}:force_style='Fontsize=${fontSize},Fontname=${fontFamily},PrimaryColour=${primaryColor},BorderStyle=${borderStyle},OutlineColour=${outlineSubtitleColor},Outline=1,Shadow=0,Alignment=${alignment}'" -c:v libx264 -c:a copy "${outputPath}"`;
//         console.log(`Running FFmpeg command: ${ffmpegAddSubtitlesCommand}`);
//         exec(ffmpegAddSubtitlesCommand, (subError) => {
//           cleanupFiles(videoPath, audioPath, srtPath);

//           if (subError) {
//             console.error("Error adding subtitles:", subError);
//             return res.status(500).send("Failed to add subtitles to video.");
//           }

//           res.json({ message: "Video processed with subtitles", videoUrl: `/subtitles/${req.file.filename}_subtitled.mp4` });
//         });
//       } catch (transcriptionError) {
//         console.error("Transcription error:", transcriptionError);
//         cleanupFiles(videoPath, audioPath, srtPath);
//         res.status(500).send("Failed to transcribe audio.");
//       }
//     });
//   } catch (qualityError) {
//     console.error("Audio quality error:", qualityError);
//     cleanupFiles(videoPath, audioPath, srtPath);
//     res.status(400).send("This video cannot be transcribed, please try another video.");
//   }
// });

// function cleanupFiles(videoPath, audioPath, srtPath) {
//   fs.unlinkSync(videoPath);
//   fs.unlinkSync(audioPath);
//   fs.unlinkSync(srtPath);
// }

//----- Extra Features -------//

// cleans up folders (compressed, converted, grad,overlay, subtitles, uploads)

const clearFolders = () => {
  const folders = ["compressed", "converted", "gradient-background", "overlay", "subtitles", "uploads", "processed", "videos"];

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

//animation with Immersity.ai API -- desparity map creation is working, ERROR_UNKNOWN when creating animation

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "3d-animation.html"));
});

app.post("/generate-disparity", async (req, res) => {
  const { inputImageUrl } = req.body;

  if (!inputImageUrl) {
    return res.status(400).send("inputImageUrl is required.");
  }

  try {
    const disparityMapUrl = await getDisparityMap(inputImageUrl);
    res.json({
      message: "Disparity map generated successfully",
      disparityMapUrl: disparityMapUrl,
    });
  } catch (error) {
    console.error("Error generating disparity map:", error.message);
    res.status(500).send("Failed to generate disparity map");
  }
});

app.post("/generate-animation", async (req, res) => {
  const { inputImageUrl, inputDisparityUrl } = req.body;

  console.log("Request body:", req.body);

  try {
    const accessToken = await getAccessToken();
    const correlationId = uuidv4();

    const animationParams = {
      correlationId,
      inputImageUrl,
      inputDisparityUrl,
      animationLength: 4, // Minimal set
    };

    console.log("Animation Params:", animationParams);

    const response = await axios.post("https://api.immersity.ai/api/v1/animation", animationParams, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 3 * 60 * 1000,
    });

    console.log("API Response:", response.data);

    res.json({
      message: "3D animation generated successfully",
      downloadUrl: response.data.resultPresignedUrl,
    });
  } catch (error) {
    console.error("Error generating animation:", error.response ? error.response.data : error.message);
    res.status(500).send(error.response ? error.response.data : error.message);
  }
});

// gradient background creator

app.post("/preview-overlay", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const color = req.body.color.replace("#", "");
  const opacity = parseFloat(req.body.opacity);
  const outputPath = path.join(__dirname, "preview", `preview_overlay_video_${Date.now()}.mp4`);

  exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
    if (error) {
      console.error("Error getting video size:", error);
      return res.status(500).send("Failed to get video size.");
    }

    const [width, height] = stdout.trim().split(",");
    const overlayPath = path.join(__dirname, "overlay", `preview_overlay_${Date.now()}.png`);

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
    case "linear":
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

// youtube downloader

app.post("/get-formats", async (req, res) => {
  const { url } = req.body;

  if (!ytdl.validateURL(url)) {
    return res.status(400).send("Invalid YouTube URL.");
  }

  try {
    const info = await ytdl.getInfo(url);
    let formats = ytdl.filterFormats(info.formats, "video");
    formats = formats.filter((format) => {
      return format.qualityLabel && !["144p", "240p"].includes(format.qualityLabel);
    });

    // Remove duplicate formats
    const seen = new Set();
    formats = formats.filter((format) => {
      const key = `${format.qualityLabel}-${format.container}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

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
    const formatOptions = info.formats.find((f) => f.itag.toString() === format);
    if (!formatOptions) {
      return res.status(400).send("Invalid format selected.");
    }

    const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, "_");
    const videoPath = path.join(__dirname, "downloads", `${videoTitle}.mp4`);
    const audioPath = path.join(__dirname, "downloads", `${videoTitle}.mp3`);
    const outputPath = path.join(__dirname, "downloads", `${videoTitle}_final.mp4`);

    // Download video stream
    const videoStream = ytdl(url, { quality: formatOptions.itag });
    const videoWriteStream = fs.createWriteStream(videoPath);
    videoStream.pipe(videoWriteStream);

    videoWriteStream.on("finish", () => {
      // Download audio stream
      const audioStream = ytdl(url, { quality: "highestaudio" });
      const audioWriteStream = fs.createWriteStream(audioPath);
      audioStream.pipe(audioWriteStream);

      audioWriteStream.on("finish", () => {
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

            fs.unlinkSync(videoPath);
            fs.unlinkSync(audioPath);
            fs.unlinkSync(outputPath);
          });
        });
      });

      audioWriteStream.on("error", (err) => {
        console.error("Audio stream error:", err);
        res.status(500).send("Failed to download audio.");
      });
    });

    videoWriteStream.on("error", (err) => {
      console.error("Video stream error:", err);
      res.status(500).send("Failed to download video.");
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Failed to download video.");
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log(`Server running on port 3000`);
});

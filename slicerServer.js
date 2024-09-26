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
// const { Storage } = require("@google-cloud/storage");
const speech = require("@google-cloud/speech");

// remove-text

// Google Cloud
google.options({ auth: new google.auth.GoogleAuth({ logLevel: "debug" }) });
const speechClient = new speech.SpeechClient();
// const storage = new Storage({
//   keyFilename: process.env.GOOGLE_UPLOAD_CREDENTIALS || "/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/google-credentials.json",
// });
// const bucket = storage.bucket("image-2d-to-3d");

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

// Image-slideshow

app.post("/create-video", upload.array("images"), async (req, res) => {
  const files = req.files;
  const durations = JSON.parse(req.body.durations);
  const outputWidth = parseInt(req.body.outputWidth, 10);
  const outputHeight = parseInt(req.body.outputHeight, 10);
  const handlingOption = req.body.handlingOption;

  console.log("Received durations:", durations);
  console.log(`Output dimensions: ${outputWidth}x${outputHeight}`);
  console.log(`Handling option: ${handlingOption}`);

  if (!files || files.length === 0) {
    return res.status(400).send("No images provided or empty request.");
  }

  if (files.length !== durations.length) {
    console.error("Mismatch between images and durations.");
    return res.status(400).send("Mismatch between images and durations.");
  }

  const tempOutputPaths = [];
  const croppedImagePaths = [];

  try {
    if (handlingOption === "cropToSmallest") {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const croppedOutputPath = path.join(__dirname, "videos", `cropped_${i}.jpg`);
        croppedImagePaths.push(croppedOutputPath);

        const cropCommand = `ffmpeg -i "${file.path}" -vf "crop=${outputWidth}:${outputHeight}" -y "${croppedOutputPath}"`;

        await new Promise((resolve, reject) => {
          exec(cropCommand, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error cropping image ${file.path}:`, stderr);
              return reject(`Error cropping image ${file.path}: ${stderr}`);
            }
            console.log(`Image cropped: ${croppedOutputPath}`);
            resolve();
          });
        });
      }
    }

    // Create individual videos for each (cropped or original) image
    for (let i = 0; i < files.length; i++) {
      const duration = durations[i];
      const outputFile = `video_${i}.mp4`;
      const fullOutputFilePath = path.join(__dirname, "videos", outputFile);
      tempOutputPaths.push(fullOutputFilePath);

      console.log(`Creating video for image with duration: ${duration}s`);

      // Determine input image path based on handling option
      const inputImagePath = handlingOption === "cropToSmallest" ? croppedImagePaths[i] : files[i].path;

      // FFmpeg command for video creation
      const ffmpegCommand = `ffmpeg -loop 1 -t ${duration} -i "${inputImagePath}" -vf "scale=${outputWidth}:${outputHeight},fps=25" -pix_fmt yuv420p -c:v libx264 -y "${fullOutputFilePath}"`;

      await new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error creating video for ${inputImagePath}:`, stderr);
            return reject(`Error creating video for ${inputImagePath}: ${stderr}`);
          }
          console.log(`Video created for ${inputImagePath}`);
          resolve();
        });
      });
    }

    // Create a concat file for all the videos
    const concatFilePath = path.join(__dirname, "videos", `concat_${Date.now()}.txt`);
    let concatFileContent = tempOutputPaths.map((filePath) => `file '${filePath}'`).join("\n");
    fs.writeFileSync(concatFilePath, concatFileContent);
    console.log(`Concat file written at ${concatFilePath}`);

    // Concatenate all the videos into one
    const outputVideoPath = path.join(__dirname, "videos", `slideshow_${Date.now()}.mp4`);
    const ffmpegConcatCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c:v libx264 -pix_fmt yuv420p -y "${outputVideoPath}"`;

    console.log("Executing FFmpeg command for concatenation:", ffmpegConcatCommand);

    exec(ffmpegConcatCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error concatenating videos:", stderr);
        return res.status(500).send(`Error concatenating videos: ${stderr}`);
      }

      console.log("Videos concatenated successfully.");
      res.json({ videoPath: `/videos/${path.basename(outputVideoPath)}` });

      // Clean up: remove temp video files, cropped images, and concat file
      try {
        [...tempOutputPaths, ...croppedImagePaths, concatFilePath].forEach((tempPath) => {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        });
      } catch (cleanupErr) {
        console.error("Error cleaning up files:", cleanupErr);
      }
    });
  } catch (err) {
    console.error("Error processing videos:", err);
    res.status(500).send(`Error processing videos: ${err.message}`);
  }
});

// crop image for slideshow
app.post("/crop-image", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;
  const outputPath = path.join(__dirname, "videos", `cropped_${Date.now()}.jpg`);
  const { width, height, left, top } = req.body;

  const safeWidth = parseInt(width, 10);
  const safeHeight = parseInt(height, 10);
  const safeLeft = parseInt(left, 10);
  const safeTop = parseInt(top, 10);

  // Get the image's original dimensions
  exec(`ffprobe -v error -show_entries stream=width,height -of csv=p=0:s=x ${imagePath}`, (err, stdout) => {
    if (err) {
      console.error("Error getting image dimensions:", err);
      return res.status(500).send("Error processing image");
    }

    const [imageWidth, imageHeight] = stdout.split("x").map(Number);

    // Validate the crop dimensions
    if (safeWidth <= 0 || safeHeight <= 0 || safeLeft < 0 || safeTop < 0 || safeWidth + safeLeft > imageWidth || safeHeight + safeTop > imageHeight) {
      return res.status(400).send("Invalid crop dimensions");
    }

    // Perform the crop
    const cropCommand = `ffmpeg -i "${imagePath}" -vf "crop=${safeWidth}:${safeHeight}:${safeLeft}:${safeTop}" -y "${outputPath}"`;

    exec(cropCommand, (error) => {
      fs.unlinkSync(imagePath); // Cleanup the original file
      if (error) {
        console.error(`Error cropping image ${imagePath}:`, error);
        return res.status(500).send("Error processing image");
      }

      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error(`SendFile Error: ${err.message}`);
          return res.status(500).send("Error sending cropped image");
        }
        fs.unlinkSync(outputPath); // Cleanup cropped file after sending
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
app.post("/slice-multi", upload.fields([{ name: "video1" }, { name: "video2" }, { name: "video3" }]), (req, res) => {
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

  const videoPaths = [];
  const tempOutputPaths = [];
  const slices = [];

  if (numVideos >= 1) {
    videoPaths.push(req.files["video1"][0].path);
    tempOutputPaths.push(path.join(__dirname, `processed/temp_output1_${Date.now()}.mp4`));
    slices.push([
      { start: parseFloat(req.body["slice1Start1"]), end: parseFloat(req.body["slice1End1"]) },
      { start: parseFloat(req.body["slice2Start1"]), end: parseFloat(req.body["slice2End1"]) },
      { start: parseFloat(req.body["slice3Start1"]), end: parseFloat(req.body["slice3End1"]) },
    ]);
  }

  if (numVideos >= 2) {
    videoPaths.push(req.files["video2"][0].path);
    tempOutputPaths.push(path.join(__dirname, `processed/temp_output2_${Date.now()}.mp4`));
    slices.push([
      { start: parseFloat(req.body["slice1Start2"]), end: parseFloat(req.body["slice1End2"]) },
      { start: parseFloat(req.body["slice2Start2"]), end: parseFloat(req.body["slice2End2"]) },
      { start: parseFloat(req.body["slice3Start2"]), end: parseFloat(req.body["slice3End2"]) },
    ]);
  }

  if (numVideos === 3) {
    videoPaths.push(req.files["video3"][0].path);
    tempOutputPaths.push(path.join(__dirname, `processed/temp_output3_${Date.now()}.mp4`));
    slices.push([
      { start: parseFloat(req.body["slice1Start3"]), end: parseFloat(req.body["slice1End3"]) },
      { start: parseFloat(req.body["slice2Start3"]), end: parseFloat(req.body["slice2End3"]) },
      { start: parseFloat(req.body["slice3Start3"]), end: parseFloat(req.body["slice3End3"]) },
    ]);
  }

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
        filterComplex += `${inputs.join("")}concat=n=${inputs.length}:v=1:a=0[outv];`;
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
      const concatFilePath = path.join(__dirname, `processed/concat_${Date.now()}.txt`);

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

  const applyOverlay = (inputPath, outputPath, color, opacity) => {
    return new Promise((resolve, reject) => {
      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`, (error, stdout) => {
        if (error) {
          console.error("Error getting video size:", error);
          return reject("Failed to get video size.");
        }

        const [width, height] = stdout.trim().split(",");
        const overlayPath = path.join(__dirname, "overlay", `overlay_${Date.now()}.png`);

        exec(
          `convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(1, 3), 16)},${parseInt(color.substring(3, 5), 16)},${parseInt(
            color.substring(5, 7),
            16
          )},${opacity})" "${overlayPath}"`,
          (overlayError) => {
            if (overlayError) {
              console.error("Error creating overlay:", overlayError);
              return reject("Failed to create overlay.");
            }

            exec(`ffmpeg -i "${inputPath}" -i "${overlayPath}" -filter_complex "[0:v][1:v] overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError) => {
              if (ffmpegError) {
                console.error("Error applying overlay:", ffmpegError);
                return reject("Failed to apply overlay.");
              }

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
          console.error("Error getting video size:", error);
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
            gradientSize = `${width}x${parseInt(height / 2)}`;
            overlayPosition = `0:${parseInt(height / 2)}`;
            break;
          case "quarter":
            gradientSize = `${width}x${parseInt(height / 4)}`;
            overlayPosition = `0:${3 * parseInt(height / 4)}`;
            break;
        }

        const gradientCommand = `convert -size ${gradientSize} gradient:#00000000-#${color} "${gradientPath}"`;

        exec(gradientCommand, (gradientError) => {
          if (gradientError) {
            console.error("Error creating gradient:", gradientError);
            return reject("Failed to create gradient.");
          }

          exec(`ffmpeg -i "${inputPath}" -i "${gradientPath}" -filter_complex "[0:v][1:v] overlay=${overlayPosition}" -c:a copy "${outputPath}"`, (ffmpegError) => {
            if (ffmpegError) {
              console.error("Error applying gradient overlay:", ffmpegError);
              return reject("Failed to apply gradient overlay.");
            }

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

        if (stdout) {
          // has audio
          ffmpegCommand = `ffmpeg -i "${inputPath}" -filter_complex "[0:v]setpts=${factor}*PTS[v];[0:a]atempo=1/${factor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
        } else {
          // no audio
          ffmpegCommand = `ffmpeg -i "${inputPath}" -filter:v "setpts=${factor}*PTS" "${outputPath}"`;
        }

        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error("Error executing FFmpeg command:", stderr);
            return reject("Failed to slow down video.");
          }

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

      const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=${fps} "${path.join(framesDir, "frame_%04d.png")}"`;

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

          execFile("gifski", ["-o", outputPath, "--fps", `${fps}`, "--quality", `${quality}`, ...frameFiles], (gifskiError, stdout, stderr) => {
            if (gifskiError) {
              console.error("Error creating GIF with gifski:", gifskiError);
              console.error("stderr:", stderr);
              cleanup(framesDir);
              return reject("Error creating GIF with gifski.");
            }

            resolve(outputPath);
            cleanup(framesDir);
          });
        });
      });
    });
  };

  const cleanup = (framesDir) => {
    if (framesDir) {
      fs.rm(framesDir, { recursive: true }, (err) => {
        if (err) console.error(`Error deleting frames directory: ${framesDir}`, err);
      });
    }
  };

  (async () => {
    try {
      for (let i = 0; i < videoPaths.length; i++) {
        await processVideo(videoPaths[i], slices[i], tempOutputPaths[i], outputWidth, outputHeight);
      }

      await concatenateVideos(tempOutputPaths, finalOutputPath);

      if (enableOverlay) {
        const overlayedOutputPath = path.join(__dirname, `processed/final_output_overlayed_${Date.now()}.mp4`);
        await applyOverlay(finalOutputPath, overlayedOutputPath, overlayColor, overlayOpacity);
        fs.unlinkSync(finalOutputPath);
        finalOutputPath = overlayedOutputPath;
      }

      if (enableGradientOverlay) {
        const gradientOverlayedOutputPath = path.join(__dirname, `processed/final_output_gradient_overlayed_${Date.now()}.mp4`);
        await applyGradientOverlay(finalOutputPath, gradientOverlayedOutputPath, gradientColor, gradientDirection);
        fs.unlinkSync(finalOutputPath);
        finalOutputPath = gradientOverlayedOutputPath;
      }

      if (enableSlowVideo) {
        const slowedOutputPath = path.join(__dirname, `processed/final_output_slowed_${Date.now()}.mp4`);
        await applySlowVideo(finalOutputPath, slowedOutputPath, slowFactor);
        fs.unlinkSync(finalOutputPath);
        finalOutputPath = slowedOutputPath;
      }

      if (enableGifConversion) {
        const gifOutputPath = await convertToGif(finalOutputPath, gifFps, gifQuality);
        fs.unlinkSync(finalOutputPath);
        res.download(gifOutputPath, (downloadErr) => {
          if (downloadErr) {
            console.error("Error sending the converted GIF:", downloadErr);
          }
          videoPaths.forEach((path) => fs.unlinkSync(path));
          tempOutputPaths.forEach((path) => fs.unlinkSync(path));
        });
      } else {
        res.download(finalOutputPath, (downloadErr) => {
          if (downloadErr) {
            console.error("Error sending the processed video:", downloadErr);
          }
          videoPaths.forEach((path) => fs.unlinkSync(path));
          tempOutputPaths.forEach((path) => fs.unlinkSync(path));
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  })();
});

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

// ----- Video Subtitles with speech-to-text API ------ //

// upload to Google Cloud Storage bucket
async function uploadFileToGCS(filePath) {
  const fileName = path.basename(filePath);
  await bucket.upload(filePath, {
    destination: fileName,
  });
  return `gs://${bucket.name}/${fileName}`;
}

// sends audio to speech-to-text api
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

// creates SRT (SubRip Subtitle) file from the transcription results.
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

// converts time value to subtitle time format (HH:MM:SS,mmm)
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
// converts SRT time back into seconds
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
  const maxWordsPerLine = req.body.maxWordsPerLine || 10;
  const maxDurationPerLine = req.body.maxDurationPerLine || 5;
  const bufferTime = req.body.bufferTime || 0.1;
  const borderStyle = req.body.borderStyle || 1;
  const outlineColor = req.body.outlineColor || "#000000";
  const subtitlePosition = req.body.subtitlePosition || "bottom";

  const convertHexToSubtitleColor = (hex) => {
    const alpha = "00";
    const red = hex.substring(1, 3);
    const green = hex.substring(3, 5);
    const blue = hex.substring(5, 7);
    return `&H${alpha}${blue}${green}${red}&`;
  };

  const primaryColor = convertHexToSubtitleColor(fontColor);
  const outlineSubtitleColor = convertHexToSubtitleColor(outlineColor);
  const alignment = subtitlePosition === "top" ? 6 : 2;

  try {
    const ffmpegExtractAudioCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -vn -y -f flac "${audioPath}"`;
    exec(ffmpegExtractAudioCommand, async (error) => {
      if (error) {
        console.error("Error converting video to audio:", error);
        return res.status(500).send("Failed to convert video.");
      }

      try {
        const transcriptionResults = await transcribeAudio(audioPath);
        if (transcriptionResults.length === 0 || !transcriptionResults[0].transcript.trim()) {
          throw new Error("No transcribable audio found.");
        }

        createSRT(transcriptionResults, srtPath, maxWordsPerLine, maxDurationPerLine, bufferTime);

        if (!fs.existsSync(srtPath)) {
          console.error("SRT file does not exist:", srtPath);
          return res.status(500).send("SRT file creation failed.");
        }

        const ffmpegAddSubtitlesCommand = `ffmpeg -i "${videoPath}" -vf "subtitles=${srtPath}:force_style='Fontsize=${fontSize},Fontname=${fontFamily},PrimaryColour=${primaryColor},BorderStyle=${borderStyle},OutlineColour=${outlineSubtitleColor},Outline=1,Shadow=0,Alignment=${alignment}'" -c:v libx264 -c:a copy "${outputPath}"`;
        console.log(`Running FFmpeg command: ${ffmpegAddSubtitlesCommand}`);
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
  } catch (qualityError) {
    console.error("Audio quality error:", qualityError);
    cleanupFiles(videoPath, audioPath, srtPath);
    res.status(400).send("This video cannot be transcribed, please try another video.");
  }
});

function cleanupFiles(videoPath, audioPath, srtPath) {
  fs.unlinkSync(videoPath);
  fs.unlinkSync(audioPath);
  fs.unlinkSync(srtPath);
}

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
            // Clean up files
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

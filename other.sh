// image upscale with TensorFlow -- not working

// async function logTensorStats(tensor, name) {
//   const min = tensor.min().dataSync()[0];
//   const max = tensor.max().dataSync()[0];
//   const mean = tensor.mean().dataSync()[0];
//   const std = tensor.sub(mean).square().mean().sqrt().dataSync()[0];
//   console.log(`${name} - min: ${min}, max: ${max}, mean: ${mean}, std: ${std}`);
// }

// async function upscaleImage(inputPath, outputPath) {
//   try {
//     const image = await loadImage(inputPath);
//     const canvas = createCanvas(image.width, image.height);
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(image, 0, 0);

//     // Convert the canvas image to a tensor and pre-process
//     let inputTensor = tf.browser.fromPixels(canvas).toFloat().div(tf.scalar(255)).expandDims(0);
//     inputTensor = tf.cast(inputTensor, "float32"); // Ensure image is float32
//     console.log("Input Tensor Shape:", inputTensor.shape);
//     await logTensorStats(inputTensor, "Input Tensor");

//     const modelPath = "file://./model/model.json";
//     const model = await tf.loadGraphModel(modelPath);

//     // Perform the upscaling
//     const outputTensor = model.predict(inputTensor);
//     console.log("Output Tensor Shape:", outputTensor.shape);
//     await logTensorStats(outputTensor, "Output Tensor");

//     // Post-process the output tensor: Scale values from [-1, 1] to [0, 255]
//     const scaledTensor = outputTensor.squeeze().add(tf.scalar(1)).mul(tf.scalar(127.5)).cast("int32");
//     await logTensorStats(scaledTensor, "Scaled Tensor");

//     // Clip values to the range [0, 255]
//     const clippedTensor = tf.clipByValue(scaledTensor, 0, 255);
//     await logTensorStats(clippedTensor, "Clipped Tensor");

//     // Convert the tensor to a PNG image
//     const buffer = await tf.node.encodePng(clippedTensor);
//     fs.writeFileSync(outputPath, buffer);

//     inputTensor.dispose();
//     outputTensor.dispose();
//     scaledTensor.dispose();
//     clippedTensor.dispose();
//   } catch (error) {
//     console.error("Error during image upscaling:", error);
//   }
// }

package.json
{
  "name": "ffmpeg_gif_splicer",
  "version": "1.0.0",
  "description": "",
  "main": "slicerServer.js",
  "scripts": {
    "start": "node -r esm slicerServer.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@google-cloud/speech": "^6.6.0",
    "@google-cloud/storage": "^7.11.2",
    "@google-cloud/translate": "^8.3.0",
    "@tensorflow/tfjs-converter": "^4.20.0",
    "@tensorflow/tfjs-core": "^4.20.0",
    "axios": "^1.7.2",
    "axios-debug-log": "^1.0.0",
    "canvas": "^3.0.0-rc2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "esm": "^3.2.25",
    "express": "^4.18.3",
    "googleapis": "^137.1.0",
    "jimp": "^0.22.12",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.4",
    "tfjs-image-recognition-base": "^0.6.2",
    "uuid": "^9.0.1",
    "waifu2x": "^1.4.2",
    "ytdl-core": "^4.11.5"
  }
}







app.post("/upscale-image-new", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const imagePath = req.file.path;
  const upscaledImagePath = path.join(__dirname, "uploads", `upscaled_${Date.now()}.png`);

  try {
    await upscaleImage(imagePath, upscaledImagePath);

    res.download(upscaledImagePath, (err) => {
      if (err) {
        console.error("Error sending the upscaled image:", err);
      }
      fs.unlinkSync(imagePath);
      fs.unlinkSync(upscaledImagePath);
    });
  } catch (error) {
    console.error("Failed to upscale image:", error);
    res.status(500).send("Failed to upscale image");
  }
});



// // for recolor

// app.post('/recolorImage', upload.single('image'), (req, res) => {
//     const imagePath = req.file.path;
//     const targetColor = req.body.targetColor;
//     const outputPath = path.join(__dirname, 'converted', `recolor_${Date.now()}.png`);

//     // Convert target color hex to HSL
//     const { h, s, l } = hexToHSL(targetColor);

//     const recolorCommand = `convert "${imagePath}" -modulate 100,${s},${h} "${outputPath}"`;

//     exec(recolorCommand, (error, stdout, stderr) => {
//         if (error) {
//             console.error('Error recoloring image:', stderr);
//             fs.unlinkSync(imagePath);
//             return res.status(500).send('Failed to recolor image.');
//         }

//         res.sendFile(outputPath, (err) => {
//             fs.unlinkSync(imagePath);
//             fs.unlinkSync(outputPath);
//         });
//     });
// });

// function hexToHSL(hex) {
//     const { r, g, b } = hexToRgb(hex);
//     return rgbToHsl(r, g, b);
// }

// function hexToRgb(hex) {
//     const bigint = parseInt(hex.slice(1), 16);
//     return {
//         r: (bigint >> 16) & 255,
//         g: (bigint >> 8) & 255,
//         b: bigint & 255
//     };
// }

// function rgbToHsl(r, g, b) {
//     r /= 255;
//     g /= 255;
//     b /= 255;
//     const max = Math.max(r, g, b);
//     const min = Math.min(r, g, b);
//     let h, s, l = (max + min) / 2;

//     if (max === min) {
//         h = s = 0; // achromatic
//     } else {
//         const d = max - min;
//         s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//         switch (max) {
//             case r: h = (g - b) / d + (g < b ? 6 : 0); break;
//             case g: h = (b - r) / d + 2; break;
//             case b: h = (r - g) / d + 4; break;
//         }
//         h /= 6;
//     }

//     return {
//         h: Math.round(h * 360),
//         s: Math.round(s * 100),
//         l: Math.round(l * 100)
//     };
// }

// // for video crop

// app.post('/upload', upload.single('video'), (req, res) => {
//     if (!fs.existsSync('processed')) {
//         fs.mkdirSync('processed');
//     }

//     const videoPath = req.file.path;
//     const timestamp = Date.now();
//     const outputPath = path.join(__dirname, 'processed', `cropped_video_${timestamp}.mp4`);
//     const { width, height, left, top } = req.body;

//     const safeWidth = parseInt(width, 10);
//     const safeHeight = parseInt(height, 10);
//     const safeLeft = parseInt(left, 10);
//     const safeTop = parseInt(top, 10);

//     if (isNaN(safeWidth) || isNaN(safeHeight) || isNaN(safeLeft) || isNaN(safeTop)) {
//         return res.status(400).send('Invalid crop dimensions');
//     }

//     const cropCommand = `crop=${safeWidth}:${safeHeight}:${safeLeft}:${safeTop}`;
//     const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "${cropCommand}" -c:a copy "${outputPath}"`;

//     exec(ffmpegCommand, (error, stdout, stderr) => {
//         fs.unlinkSync(videoPath);
//         if (error) {
//             console.error(`Exec Error: ${error.message}`);
//             return res.status(500).send('Error processing video');
//         }

//         res.sendFile(outputPath, (err) => {
//             fs.unlinkSync(outputPath);
//         });
//     });
// });






transcribe

// app.post('/transcribe-video', upload.single('video'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No video file uploaded.');
//     }

//     const videoPath = req.file.path;
//     const audioPath = path.join(__dirname, 'subtitles', `${req.file.filename}.flac`);
//     const srtPath = path.join(__dirname, 'subtitles', `${req.file.filename}.srt`);
//     const outputPath = path.join(__dirname, 'subtitles', `${req.file.filename}_subtitled.mp4`);

    
//     const ffmpegExtractAudioCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -vn -y -f flac "${audioPath}"`;
//     exec(ffmpegExtractAudioCommand, async (error) => {
//         if (error) {
//             console.error('Error converting video to audio:', error);
//             return res.status(500).send('Failed to convert video.');
//         }

//         try {
//             const transcriptionResults = await transcribeAudio(audioPath);
//             createSRT(transcriptionResults, srtPath);

//             const ffmpegAddSubtitlesCommand = `ffmpeg -i "${videoPath}" -vf subtitles="${srtPath}" -c:v libx264 -c:a copy "${outputPath}"`;
//             exec(ffmpegAddSubtitlesCommand, (subError) => {
//                 cleanupFiles(videoPath, audioPath, srtPath); 

//                 if (subError) {
//                     console.error('Error adding subtitles:', subError);
//                     return res.status(500).send('Failed to add subtitles to video.');
//                 }

//                 res.json({ message: 'Video processed with subtitles', videoUrl: `/subtitles/${req.file.filename}_subtitled.mp4` });
//             });
//         } catch (transcriptionError) {
//             console.error('Transcription error:', transcriptionError);
//             cleanupFiles(videoPath, audioPath, srtPath);
//             res.status(500).send('Failed to transcribe audio.');
//         }
//     });
// });



old webp


    document.getElementById('convertToWebPButton').addEventListener('click', function() {
        const videoSource = document.getElementById('croppedVideo').getAttribute('src');
        if (!videoSource) {
            console.error('No video available to convert to WebP.');
            return;
        }
        notification.style.display = 'block';
    
        fetch(videoSource)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'final.mp4');
                return fetch('/convertToWebP', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const webPImage = document.getElementById('webpImage');
                webPImage.src = URL.createObjectURL(blob);
                webPImage.style.display = 'block';
    
                
                const downloadButtonContainer = document.getElementById('webpDownloadButtonContainer');
                downloadButtonContainer.innerHTML = ''; 
    
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download WebP';
                downloadButton.className = 'download-button';
    
                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2); // Convert to MB
                const fileSizeText = document.createTextNode(` (${fileSizeInMB} MB)`);
    
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = webPImage.src;
                    a.download = 'converted_image.webp'; 
                    document.body.appendChild(a); 
                    a.click(); 
                    document.body.removeChild(a); 
                });
    
                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeText); 
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to WebP:', error);
            });
    });




image crop with pre set sizes

app.post('/crop', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const cropRatio = req.body.cropRatio; 
    const outputPath = path.join(__dirname, 'processed', `cropped_video_${Date.now()}.mp4`);

    if (cropRatio === 'None') {
        
        fs.copyFile(videoPath, outputPath, (err) => {
            if (err) {
                console.error('Error copying file:', err);
                return res.status(500).send('Error processing video.');
            }
            res.download(outputPath, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error sending the video file:', downloadErr);
                }
                fs.unlinkSync(videoPath); 
            });
        });
    } else {
     
        let cropCommand;
        switch (cropRatio) {
            case '1:1':
                cropCommand = 'crop=min(iw\\,ih):min(iw\\,ih)';
                break;
            case 'Header':
                cropCommand = 'crop=in_w:in_h/2:0:in_h/4';
                break;    
            case 'Background':
                cropCommand = `crop='if(gt(iw/ih,ih/iw),ih*9/16,iw)':ih`;
                break;
            case 'Middle Third':
                cropCommand = 'crop=in_w:in_h/3:0:in_h/3';
                break;
            case 'Top Third':
                cropCommand = 'crop=in_w:in_h/3:0:0';
                break;
            case 'Bottom Third':
                cropCommand = 'crop=in_w:in_h/3:0:2*in_h/3';
                break;
            case 'Top Half':
                cropCommand = 'crop=in_w:ih/2:0:0';
                break;
            case 'Bottom Half':
                cropCommand = 'crop=in_w:ih/2:0:ih/2';
                break;
            default:
                cropCommand = '';
                break;
        }

        if (cropCommand !== '') {
            const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "${cropCommand}" -c:a copy "${outputPath}"`;

            exec(ffmpegCommand, (error) => {
                if (error) {
                    console.error('Error executing FFmpeg command:', error);
                  
                    return res.status(500).send('Error processing video.');
                }

                res.download(outputPath, (downloadErr) => {
                    if (downloadErr) {
                        console.error('Error sending the video file:', downloadErr);
                    }
                  
                });
            });
        } else {
            return res.status(400).send('Invalid crop ratio specified.');
        }
    }
});










/ //font-size: 14px; font-weight: normal;



/ remove background extra



// app.post('/remove-background', upload.single('image'), async (req, res) => {
//     console.log("Route hit: /remove-background");
//     if (!req.file) {
//         return res.status(400).send('No image file uploaded.');
//     }

//     const imagePath = req.file.path;
//     const formData = new FormData();
//     formData.append('image_file', fs.createReadStream(imagePath));
//     formData.append('get_file', 1);

//     try {
//         const response = await axios.post('https://api.removal.ai/3.0/remove', formData, {
//             headers: {
//                 ...formData.getHeaders(),
//                 'Rm-Token': '4D0203C1-63B7-75DF-304B-A217F9C7CC2B'
//             },
//             responseType: 'arraybuffer' 
//         });

//         fs.unlinkSync(imagePath); 
//         res.setHeader('Content-Type', 'image/png');
//         res.send(response.data);
//     } catch (error) {
//         console.error('Failed to remove background:', error);
//         res.status(500).send('Failed to remove background');
//     }
// });

// app.get('/test-imagemagick', (req, res) => {
//     console.log('Testing ImageMagick installation...');
//     exec('convert -size 1280x720 xc:"rgba(0,0,0,0.5)" "/home/kyle/quick-convert/overlay/overlay_test.png"', (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Convert command failed: ${error}`);
//             return res.status(500).send(`Error running convert: ${error.message}`);
//         }
//         console.log('Convert command stdout:', stdout);
//         console.error('Convert command stderr:', stderr);
//         res.send('ImageMagick command executed successfully.');
//     });
// });




overlay?
conversion buttons



            <div class="button-group">
            <label>Conversion Buttons</label>
           </div>
            
            <div class="button-group">
                <button type="button" id="convertToGifButton">Convert to GIF</button>
                <button type="button" id="convertToAvifButton">Convert to AVIF</button>
                <button type="button" id="convertToWebPButton">Convert to WebP</button>
                <button type="button" id="cropVideoButton">Convert to WebP</button>
                
                
                
            </div>

    // gradient overlay


    // document.getElementById('createGradientOverlayButton').addEventListener('click', function() {
    //     const croppedVideoElement = document.getElementById('croppedVideo');
    //     const gradientType = document.getElementById('gradientDirection').value;
    //     const gradientColor = document.getElementById('gradientColor').value.replace('#', ''); // Remove the '#' for server processing
        
    //     if (!croppedVideoElement.src) {
    //         console.log('No cropped video available.');
    //         return;
    //     }
    
    //     notification.style.display = 'block';
    
    //     fetch(croppedVideoElement.src)
    //         .then(response => response.blob())
    //         .then(blob => {
    //             const formData = new FormData();
    //             formData.append('video', blob, 'cropped.mp4');
    //             formData.append('gradientType', gradientType);
    //             formData.append('gradientColor', gradientColor);
    
    //             return fetch('/gradientOverlay', { method: 'POST', body: formData });
    //         })
    //         .then(response => response.blob())
    //         .then(blob => {
    //             notification.style.display = 'none';
    //             const gradientOverlayVideo = document.getElementById('gradientOverlayVideo');
    //             gradientOverlayVideo.src = URL.createObjectURL(blob);
    //             gradientOverlayVideo.style.display = 'block';
    //         })
    //         .catch(() => {
    //             notification.style.display = 'none';
    //             console.error('Failed to create gradient overlay.');
    //         });
    // });





crop

app.post('/crop', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const cropRatio = req.body.cropRatio; 
    const outputPath = path.join(__dirname, 'processed', `cropped_video_${Date.now()}.mp4`);

    if (cropRatio === 'None') {
        
        fs.copyFile(videoPath, outputPath, (err) => {
            if (err) {
                console.error('Error copying file:', err);
                return res.status(500).send('Error processing video.');
            }
            res.download(outputPath, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error sending the video file:', downloadErr);
                }
                fs.unlinkSync(videoPath); 
            });
        });
    } else {
     
        let cropCommand;
        switch (cropRatio) {
            case '1:1':
                cropCommand = 'crop=min(iw\\,ih):min(iw\\,ih)';
                break;
            case 'Header':
                cropCommand = 'crop=in_w:in_h/2:0:in_h/4';
                break;    
            case 'Background':
                cropCommand = `crop='if(gt(iw/ih,ih/iw),ih*9/16,iw)':ih`;
                break;
            case 'Middle Third':
                cropCommand = 'crop=in_w:in_h/3:0:in_h/3';
                break;
            case 'Top Third':
                cropCommand = 'crop=in_w:in_h/3:0:0';
                break;
            case 'Bottom Third':
                cropCommand = 'crop=in_w:in_h/3:0:2*in_h/3';
                break;
            case 'Top Half':
                cropCommand = 'crop=in_w:ih/2:0:0';
                break;
            case 'Bottom Half':
                cropCommand = 'crop=in_w:ih/2:0:ih/2';
                break;
            default:
                cropCommand = '';
                break;
        }

        if (cropCommand !== '') {
            const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "${cropCommand}" -c:a copy "${outputPath}"`;

            exec(ffmpegCommand, (error) => {
                if (error) {
                    console.error('Error executing FFmpeg command:', error);
                  
                    return res.status(500).send('Error processing video.');
                }

                res.download(outputPath, (downloadErr) => {
                    if (downloadErr) {
                        console.error('Error sending the video file:', downloadErr);
                    }
                  
                });
            });
        } else {
            return res.status(400).send('Invalid crop ratio specified.');
        }
    }
});


CROP 




    document.getElementById('cropVideoButton').addEventListener('click', function() {
        const uploadedVideoElement = document.getElementById('uploadedVideo'); // Change this line
        const cropRatioSelect = document.getElementById('cropRatio');
    
        if (!uploadedVideoElement.src) { // Change this line
            console.log('No video available to crop.');
            return;
        }
    
        notification.style.display = 'block';
    
        fetch(uploadedVideoElement.src) // Change this line
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'uploaded.mp4'); // Change this line
                formData.append('cropRatio', cropRatioSelect.value);
    
                return fetch('/crop', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const croppedVideo = document.getElementById('croppedVideo');
                croppedVideo.src = URL.createObjectURL(blob);
                croppedVideo.style.display = 'block';
            })
            .catch(() => {
                notification.style.display = 'none';
                console.log('Failed to crop video.');
            });
    });
    























app.post('/slice', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const finalOutputPath = path.join(__dirname, 'processed', `final_output_${Date.now()}.mp4`);
    const addTransitions = req.body.addTransitions === 'on';

    let segments = [];
    let transitions = [];
    let filterComplex = '';
    let inputs = [];

    for (let i = 1; i <= 3; i++) {
        const start = parseFloat(req.body[`slice${i}Start`]);
        const end = parseFloat(req.body[`slice${i}End`]);

        if (!isNaN(start) && !isNaN(end) && end > start) {
            segments.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[clip${i}];`);
            inputs.push(`[clip${i}]`);
        }
    }

    if (addTransitions && segments.length > 1) {
        for (let i = 0; i < segments.length - 1; i++) {
            let offset = i * 5 - 1; // Assuming each segment is 5 seconds and transition starts 1 second before the next clip
            transitions.push(`${inputs[i]}${inputs[i + 1]}xfade=transition=wiperight:duration=1:offset=${offset}[trans${i}];`);
            inputs[i + 1] = `[trans${i}]`; // The next input should be the result of the current transition
        }
    }

    filterComplex = segments.join(' ') + transitions.join(' ');

    // The last input in the array is the final output to be mapped
    filterComplex += ` ${inputs[inputs.length - 1]}format=yuv420p[outv]`;

    const ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" -c:v libx264 -crf 22 -preset veryfast "${finalOutputPath}"`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing FFmpeg command:', stderr);
            return res.status(500).send('Failed to process video. Ensure video slices are correctly specified.');
        }

        res.download(finalOutputPath, (downloadErr) => {
            if (downloadErr) {
                console.error('Error sending the processed video:', downloadErr);
                return res.status(500).send('Error sending the processed video.');
            }
        });
    });



});




#convert to webp

 app.post('/convertToWebP', upload.single('video'), (req, res) => {
        const videoPath = req.file.path;
        const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`);
    
        const convertCommand = `ffmpeg -i "${videoPath}" -vcodec libwebp -lossless 1 -q:v 80 -loop 0 -preset picture -an -vsync 0 "${outputPath}"`;
    
        exec(convertCommand, (convertError) => {
            if (convertError) {
                return res.status(500).send('Error converting video to WebP.');
            }
    
            console.log('Video conversion to WebP completed successfully.');
    
            res.download(outputPath, (downloadErr) => {
                if (downloadErr) {
                    console.error('SendFile Error:', downloadErr.message);
                }
                fs.unlinkSync(videoPath);
            });
        });
    });


    convert to web p button

    document.getElementById('convertToWebPButton').addEventListener('click', function() {
    const croppedVideoElement = document.getElementById('croppedVideo');
    if (!croppedVideoElement.src) {
        console.error('No cropped video available for conversion.');
        return;
    }

    notification.style.display = 'block';

    fetch(croppedVideoElement.src)
        .then(response => response.blob())
        .then(blob => {
            const formData = new FormData();
            formData.append('video', blob, 'cropped.mp4');
            return fetch('/convertToWebP', { method: 'POST', body: formData });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob();
        })
        .then(blob => {
            notification.style.display = 'none';
            const webPImage = document.getElementById('webpImage');
            webPImage.src = URL.createObjectURL(blob);
            webPImage.style.display = 'block';
        })
        .catch(error => {
            notification.style.display = 'none';
            console.error('Failed to convert to WebP:', error);
        });
});




// working gifsicle example

// app.post('/convertToGif', upload.single('video'), (req, res) => {
//     const videoPath = req.file.path;
//     const tempOutputPath = path.join(convertedDir, `temp_converted_${Date.now()}.gif`);
//     const finalOutputPath = path.join(convertedDir, `converted_${Date.now()}.gif`);
//     const palettePath = path.join(convertedDir, `palette_${Date.now()}.png`);

//     // Generate palette with a reduced number of colors (e.g., 128 colors)
//     const generatePaletteCommand = `ffmpeg -y -i "${videoPath}" -vf fps=12,palettegen=stats_mode=diff:max_colors=128 "${palettePath}"`;

//     exec(generatePaletteCommand, (paletteError) => {
//         if (paletteError) {
//             return res.status(500).send('Error generating palette.');
//         }

//         // Convert video to GIF using the generated palette
//         const convertCommand = `ffmpeg -i "${videoPath}" -i "${palettePath}" -filter_complex "fps=12[x];[x][1:v]paletteuse" -an -f gif "${tempOutputPath}"`;

//         exec(convertCommand, (convertError) => {
//             if (convertError) {
//                 return res.status(500).send('Error converting video to GIF.');
//             }

//             // Optimize the GIF with gifsicle
//             const optimizeCommand = `gifsicle -O3 --lossy=180 "${tempOutputPath}" -o "${finalOutputPath}"`;

//             exec(optimizeCommand, (optimizeError) => {
//                 if (optimizeError) {
//                     return res.status(500).send('Error optimizing GIF with gifsicle.');
//                 }

//                 res.download(finalOutputPath, (downloadErr) => {
//                     if (downloadErr) {
//                         console.error('SendFile Error:', downloadErr.message);
//                     }
//                     fs.unlinkSync(videoPath);
//                     fs.unlinkSync(tempOutputPath);
//                     fs.unlinkSync(palettePath);
//                 });
//             });
//         });
//     });
// });




app.post('/gradientOverlay', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const outputPath = path.join(__dirname, 'processed', `gradient_overlay_video_${Date.now()}.mp4`);

    // Calculate video size
    exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
        if (error) {
            console.error('Error getting video size:', error);
            return res.status(500).send('Failed to get video size.');
        }

        const [width, height] = stdout.trim().split(',');
        const gradientPath = path.join(__dirname, 'overlay', `gradient_${Date.now()}.png`);

        // Create a gradient image using ImageMagick with transparent to black
        exec(`convert -size ${width}x${height} gradient:none-black ${gradientPath}`, (gradientError) => {
            if (gradientError) {
                console.error('Error creating gradient:', gradientError);
                return res.status(500).send('Failed to create gradient.');
            }

            // Overlay the gradient on the cropped video
            const croppedVideoPath = req.body.croppedVideoPath; // Assuming the path to the cropped video is sent in the request body
            exec(`ffmpeg -i "${croppedVideoPath}" -i "${gradientPath}" -filter_complex "overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError) => {
                if (ffmpegError) {
                    console.error('Error applying gradient overlay:', ffmpegError);
                    return res.status(500).send('Failed to apply gradient overlay.');
                }

                res.download(outputPath, (downloadErr) => {
                    if (downloadErr) {
                        console.error('Error sending the gradient overlay video:', downloadErr);
                    }
                    // Clean up the files after sending the response
                    fs.unlinkSync(videoPath);
                    fs.unlinkSync(gradientPath);
                });
            });
        });
    });
});



 document.getElementById('createGradientOverlayButton').addEventListener('click', function() {
        const croppedVideoElement = document.getElementById('croppedVideo');
    
        if (!croppedVideoElement.src) {
            console.error('No cropped video available.');
            return;
        }
    
        notification.style.display = 'block';
    
        // The video is already on the client-side, just pass the blob
        fetch(croppedVideoElement.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob);
    
                // Here you should send the form data to your gradient overlay endpoint
                return fetch('/gradientOverlay', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                // This is where you would update the UI with the new video
                const gradientOverlayVideo = document.getElementById('gradientOverlayVideo');
                gradientOverlayVideo.src = URL.createObjectURL(blob);
                gradientOverlayVideo.style.display = 'block';
                notification.style.display = 'none';
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to create gradient overlay:', error);
            });
    });








    // These are some sample dimensions for cropping the video. I can create/add ffmpeg commands to crop in other sizes if needed. 

app.post('/crop', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const cropRatio = req.body.cropRatio; 
    const outputPath = path.join(__dirname, 'processed', `cropped_video_${Date.now()}.mp4`);

    if (cropRatio === 'None') {
        
        fs.copyFile(videoPath, outputPath, (err) => {
            if (err) {
                console.error('Error copying file:', err);
                return res.status(500).send('Error processing video.');
            }
            res.download(outputPath, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error sending the video file:', downloadErr);
                }
                fs.unlinkSync(videoPath); 
            });
        });
    } else {
     
        let cropCommand;
        switch (cropRatio) {
            case '1:1':
                cropCommand = 'crop=min(iw\\,ih):min(iw\\,ih)';
                break;
            case 'Header':
                cropCommand = 'crop=in_w:in_h/2:0:in_h/4';
                break;    
            case 'Background':
                cropCommand = `crop='if(gt(iw/ih,ih/iw),ih*9/16,iw)':ih`;
                break;
            case 'Middle Third':
                cropCommand = 'crop=in_w:in_h/3:0:in_h/3';
                break;
            case 'Top Third':
                cropCommand = 'crop=in_w:in_h/3:0:0';
                break;
            case 'Bottom Third':
                cropCommand = 'crop=in_w:in_h/3:0:2*in_h/3';
                break;
            case 'Top Half':
                cropCommand = 'crop=in_w:ih/2:0:0';
                break;
            case 'Bottom Half':
                cropCommand = 'crop=in_w:ih/2:0:ih/2';
                break;
            default:
                cropCommand = '';
                break;
        }

        if (cropCommand !== '') {
            const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "${cropCommand}" -c:a copy "${outputPath}"`;

            exec(ffmpegCommand, (error) => {
                if (error) {
                    console.error('Error executing FFmpeg command:', error);
                  
                    return res.status(500).send('Error processing video.');
                }

                res.download(outputPath, (downloadErr) => {
                    if (downloadErr) {
                        console.error('Error sending the video file:', downloadErr);
                    }
                  
                });
            });
        } else {
            return res.status(400).send('Invalid crop ratio specified.');
        }
    }
});





app.post('/processVideo', upload.single('video'), async (req, res) => {
    const videoPath = req.file.path;
    const finalOutputPath = path.join(__dirname, 'processed', `final_output_${Date.now()}.mp4`);
    
    // Construct the FFmpeg command for slicing
    let filterComplex = '';
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
        filterComplex += `${inputs.join('')}concat=n=${inputs.length}:v=1:a=0[outv]`;
    } else {
        return res.status(400).send('No valid video segments specified.');
    }

    // Execute the slicing
    const sliceOutputPath = path.join(__dirname, 'temp', `sliced_${Date.now()}.mp4`);
    const slicingCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${sliceOutputPath}"`;

    exec(slicingCommand, (sliceError, sliceStdout, sliceStderr) => {
        if (sliceError) {
            console.error('Error slicing video:', sliceStderr);
            return res.status(500).send('Failed to slice video.');
        }

        // Proceed with cropping using the sliced video
        const cropCommand = constructCropCommand(req.body.cropRatio, sliceOutputPath, finalOutputPath);
        exec(cropCommand, (cropError, cropStdout, cropStderr) => {
            if (cropError) {
                console.error('Error cropping video:', cropStderr);
                return res.status(500).send('Failed to crop video.');
            }

            // Send the processed video back to the client
            res.download(finalOutputPath, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error sending the processed video:', downloadErr);
                }
                // Clean up temporary files
                fs.unlinkSync(videoPath);
                fs.unlinkSync(sliceOutputPath);
            });
        });
    });
});



old gradient


    // document.getElementById('createGradientOverlayButton').addEventListener('click', function() {
    //     const croppedVideoElement = document.getElementById('croppedVideo');
    //     if (!croppedVideoElement.src) {
    //         console.log('No cropped video available.');
    //         return;
    //     }
    
    //     notification.style.display = 'block';
    
    //     fetch(croppedVideoElement.src)
    //         .then(response => response.blob())
    //         .then(blob => {
    //             const formData = new FormData();
    //             formData.append('video', blob, 'cropped.mp4');
    
    //             return fetch('/gradientOverlay', { method: 'POST', body: formData });
    //         })
    //         .then(response => response.blob())
    //         .then(blob => {
    //             notification.style.display = 'none';
    //             const gradientOverlayVideo = document.getElementById('gradientOverlayVideo');
    //             gradientOverlayVideo.src = URL.createObjectURL(blob);
    //             gradientOverlayVideo.style.display = 'block';
    //         })
    //         .catch(() => {
    //             notification.style.display = 'none';
    //             console.log('Failed to create gradient overlay.');
    //         });
    // });




    convert to gif with gifsicle


// original below

// //

// First ffmpeg command generates a color palette to enhance GIF quality:
// -vf fps=15,scale=640:-1:flags=lanczos,palettegen: Sets the frame rate to 15 FPS, scales the video to 640 pixels (with original aspect ratio), generates a palette.

// Second ffmpeg command uses the generated palette for high-quality GIF conversion:
// -filter_complex "fps=15,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse": Sets frame rate to 15 FPS, scales video to 640 pixels wide (with original aspect ratio), uses the palette for color information.
// -f gif: Specifies the output format is GIF.

// gifsicle command
// -O2: medium level of optimization. -- can be between 1-3
// --lossy=100: Applies lossy compression (range: 30-200).

// To adjust GIF size, change scale values in the ffmpeg commands.
// To alter compression, change the --lossy value in the gifsicle command.

// const execFile = require('child_process').execFile;

// app.post('/convertToGif', upload.single('video'), (req, res) => {
//     if (!req.file) {
//         console.error('No file uploaded.');
//         return res.status(400).send('No file uploaded.');
//     }

//     const videoPath = req.file.path;
//     const framesDir = path.join(__dirname, `frames_${Date.now()}`);
//     const outputPath = path.join(convertedDir, `converted_${Date.now()}.gif`);

//     // Create a directory for the extracted frames
//     fs.mkdirSync(framesDir, { recursive: true });

//     // Extract frames from the video at 12 fps
//     const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=12 "${path.join(framesDir, 'frame_%04d.png')}"`;

//     exec(extractFramesCommand, (extractError) => {
//         if (extractError) {
//             console.error('Error extracting frames:', extractError);
//             cleanup(videoPath, framesDir);
//             return res.status(500).send('Error extracting frames.');
//         }

//         fs.readdir(framesDir, (err, files) => {
//             if (err) {
//                 console.error('Error reading frames directory:', err);
//                 cleanup(videoPath, framesDir);
//                 return res.status(500).send('Could not read frames directory.');
//             }
//             const frameFiles = files.map(file => path.join(framesDir, file));
            
//             // Use gifski to create a GIF from the extracted frames
//             execFile('gifski', ['-o', outputPath, '--fps', '12', '--quality', '80', ...frameFiles], (gifskiError, stdout, stderr) => {
//                 if (gifskiError) {
//                     console.error('Error creating GIF with gifski:', gifskiError);
//                     console.error('stderr:', stderr);
//                     cleanup(videoPath, framesDir);
//                     return res.status(500).send('Error creating GIF with gifski.');
//                 }

//                 // Send the created GIF to the client
//                 res.download(outputPath, (downloadErr) => {
//                     if (downloadErr) {
//                         console.error('Error sending the GIF file:', downloadErr);
//                     }
//                     // cleanup(videoPath, framesDir); // We don't delete the output GIF as it's being sent to the client
//                 });
//             });
//         });
//     });
// });


//new
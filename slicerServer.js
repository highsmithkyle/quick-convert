const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const upload = multer({ dest: 'uploads/' });
const convertedDir = path.join(__dirname, 'converted');


app.use(express.static('public'));



app.post('/overlay', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const color = req.body.color.replace('#', ''); // Remove '#' from hex color for ImageMagick
    const opacity = parseFloat(req.body.opacity);
    const outputPath = path.join(__dirname, 'processed', `overlay_video_${Date.now()}.mp4`);

    // Calculate video size
    exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
        if (error) {
            console.error('Error getting video size:', error);
            return res.status(500).send('Failed to get video size.');
        }

        const [width, height] = stdout.trim().split(',');
        const overlayPath = path.join(__dirname, 'overlay', `overlay_${Date.now()}.png`);

        // Create an overlay image using ImageMagick with the specified color and opacity
        exec(`convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0,2), 16)},${parseInt(color.substring(2,4), 16)},${parseInt(color.substring(4,6), 16)},${opacity})" "${overlayPath}"`, (overlayError) => {
            if (overlayError) {
                console.error('Error creating overlay:', overlayError);
                return res.status(500).send('Failed to create overlay.');
            }

            // Apply the overlay to the video using FFmpeg
            exec(`ffmpeg -i "${videoPath}" -i "${overlayPath}" -filter_complex "[0:v][1:v] overlay=0:0" -c:a copy "${outputPath}"`, (ffmpegError) => {
                if (ffmpegError) {
                    console.error('Error applying overlay:', ffmpegError);
                    return res.status(500).send('Failed to apply overlay.');
                }

                res.download(outputPath, (downloadErr) => {
                    if (downloadErr) {
                        console.error('Error sending the overlay video:', downloadErr);
                    }
                    fs.unlinkSync(videoPath);
                    fs.unlinkSync(overlayPath);
                });
            });
        });
    });
});


app.post('/slice', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const finalOutputPath = path.join(__dirname, 'processed', `final_output_${Date.now()}.mp4`);
    
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

    const ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplex}" -map "[outv]" "${finalOutputPath}"`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing FFmpeg command:', stderr);
            return res.status(500).send('Failed to process video.');
        }

        res.download(finalOutputPath, (downloadErr) => {
            if (downloadErr) {
                console.error('Error sending the processed video:', downloadErr);
            }
            fs.unlinkSync(videoPath);
        });
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



app.post('/convertToWebP', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`);

    // Convert the video to a WebP image sequence
    const convertCommand = `ffmpeg -i "${videoPath}" -vcodec libwebp -lossless 1 -q:v 80 -loop 0 -preset picture -an -vsync 0 "${outputPath}"`;

    exec(convertCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error converting video to WebP:', stderr);
            return res.status(500).send('Error converting video to WebP.');
        }

        // Set the correct MIME type for WebP
        res.setHeader('Content-Type', 'image/webp');
        res.download(outputPath, 'video.webp', (downloadErr) => {
            if (downloadErr) {
                console.error('Error sending the WebP file:', downloadErr);
            }
            // Clean up the original video file after conversion
            fs.unlinkSync(videoPath);
            // Optionally, delete the WebP file after sending it to the client
            // fs.unlinkSync(outputPath);
        });
    });
});








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

const { execFile } = require('child_process');


app.post('/convertToGif', upload.single('video'), (req, res) => {
    if (!req.file) {
        console.error('No file uploaded.');
        return res.status(400).send('No file uploaded.');
    }

    const videoPath = req.file.path;
    const framesDir = path.join(__dirname, `frames_${Date.now()}`);
    const outputPath = path.join(__dirname, 'converted', `converted_${Date.now()}.gif`);

    // Create a directory for the extracted frames
    fs.mkdirSync(framesDir, { recursive: true });

    // Extract frames from the video at 12 fps
    const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=12 "${path.join(framesDir, 'frame_%04d.png')}"`;

    exec(extractFramesCommand, (extractError) => {
        if (extractError) {
            console.error('Error extracting frames:', extractError);
            cleanup(videoPath, framesDir);
            return res.status(500).send('Error extracting frames.');
        }

        // Read the directory of frames
        fs.readdir(framesDir, (err, files) => {
            if (err) {
                console.error('Error reading frames directory:', err);
                cleanup(videoPath, framesDir);
                return res.status(500).send('Could not read frames directory.');
            }
            
            // Ensure files are sorted correctly
            files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            const frameFiles = files.map(file => path.join(framesDir, file));
            
            // Use gifski to create a GIF from the extracted frames
            execFile('gifski', ['-o', outputPath, '--fps', '12', '--quality', '80', ...frameFiles], (gifskiError, stdout, stderr) => {
                if (gifskiError) {
                    console.error('Error creating GIF with gifski:', gifskiError);
                    console.error('stderr:', stderr);
                    cleanup(videoPath, framesDir);
                    return res.status(500).send('Error creating GIF with gifski.');
                }

                // Send the created GIF to the client
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

    if(outputPath) {
        fs.unlink(outputPath, (err) => {
            if (err) console.error(`Error deleting output GIF: ${outputPath}`, err);
        });
    }
};



// Convert to avif

// -c:v libaom-av1: Use the AV1 codec for AVIF format.
// -crf 40: Set the quality to 40. Lower = better quality/larger file size
// -b:v 0: uses -crf value for quality, NOT bitrate
// -cpu-used 8: For faster encoding
// -row-mt 1: row-based multithreading for faster encoding.
// To adjust output size, add -vf "scale=width:height" - now it's same as .mp4
// To adjust quality, change the -crf value. Lower values result in higher quality.


app.post('/convertToAvif', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const outputPath = path.join(convertedDir, `converted_${Date.now()}.avif`);

    console.log(`Starting conversion for ${videoPath}`);
    const convertCommand = `ffmpeg -y -i "${videoPath}" -c:v libaom-av1 -crf 40 -b:v 0 -cpu-used 8 -row-mt 1 -an "${outputPath}"`;


    exec(convertCommand, (convertError) => {
        if (convertError) {
            return res.status(500).send('Error converting video to AVIF.');
        }

        console.log('Video conversion to AVIF completed successfully.');

        fs.access(outputPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error('Converted file does not exist:', err);
                return res.status(404).send('Converted file not found.');
            }

            res.download(outputPath, 'video.avif', (downloadErr) => {
                if (downloadErr) {
                    console.error('SendFile Error:', downloadErr.message);
                    return res.status(500).send('Error sending the converted file.');
                }
                console.log(`File sent: ${outputPath}`);
              
            });
        });
    });



    // -vcodec libwebp: Use the WebP codec.
    // -lossless 1: Enable lossless compression
    // -q:v 80: Set quality to 80. Lower for smaller file size, higher for better quality.
    // -loop 0: Do not loop the image.
    // -preset picture: Optimize for still picture quality.
    // -an: Strip audio from the video.
    // -vsync 0: Do not adjust frame sync.
    // To adjust output size, add -vf "scale=width:height". - now it's same as .mp4
    // To adjust quality, modify the -q:v value.


   




    



    

});

const port = 80;
app.listen(port, () => console.log(`Server running on port ${port}`));
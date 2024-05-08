
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
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');  
const app = express();
const upload = multer({ dest: 'uploads/' });
const cors = require('cors');  

app.use(cors()); 
app.use(express.static('public'));


process.env.PATH += ':/usr/bin';


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'background-remover.html'));
});



const overlayDir = path.join(__dirname, 'overlay');
if (!fs.existsSync(overlayDir)) {
    fs.mkdirSync(overlayDir, { recursive: true });
}



// for recolor

app.post('/recolorImage', upload.single('image'), (req, res) => {
    const imagePath = req.file.path;
    const sourceColor = req.body.sourceColor;
    const targetColor = req.body.targetColor;
    const outputPath = path.join(__dirname, 'converted', `recolor_${Date.now()}.png`);

    const recolorCommand = `convert "${imagePath}" -fuzz 30% -fill "#${targetColor}" -opaque "#${sourceColor}" "${outputPath}"`;

    exec(recolorCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error recoloring image:', stderr);
            fs.unlinkSync(imagePath);
            return res.status(500).send('Failed to recolor image.');
        }

        res.sendFile(outputPath, (err) => {
            fs.unlinkSync(imagePath);
            fs.unlinkSync(outputPath);
        });
    });
});



// for video crop

app.post('/upload', upload.single('video'), (req, res) => {
    if (!fs.existsSync('processed')) {
        fs.mkdirSync('processed');
    }

    const videoPath = req.file.path;
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, 'processed', `cropped_video_${timestamp}.mp4`);
    const { width, height, left, top } = req.body;

    const safeWidth = parseInt(width, 10);
    const safeHeight = parseInt(height, 10);
    const safeLeft = parseInt(left, 10);
    const safeTop = parseInt(top, 10);

   
    if (isNaN(safeWidth) || isNaN(safeHeight) || isNaN(safeLeft) || isNaN(safeTop)) {
        return res.status(400).send('Invalid crop dimensions');
    }

    const cropCommand = `crop=${safeWidth}:${safeHeight}:${safeLeft}:${safeTop}`;
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "${cropCommand}" -c:a copy "${outputPath}"`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
        fs.unlinkSync(videoPath); 
        if (error) {
            console.error(`Exec Error: ${error.message}`);
            return res.status(500).send('Error processing video');
        }

        res.sendFile(outputPath, (err) => {
            fs.unlinkSync(outputPath); 
        });
    });
});


// uncrop fix

app.post('/uncrop-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const imagePath = req.file.path;
    const { extend_left, extend_right, extend_up, extend_down, seed } = req.body;

    console.log('Received parameters:', { extend_left, extend_right, extend_up, extend_down, seed });

    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(imagePath));
    if (extend_left) formData.append('extend_left', extend_left);
    if (extend_right) formData.append('extend_right', extend_right);
    if (extend_up) formData.append('extend_up', extend_up);
    if (extend_down) formData.append('extend_down', extend_down);
    if (seed) formData.append('seed', seed);

    try {
        const response = await axios.post('https://clipdrop-api.co/uncrop/v1', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': '2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e'
            },
            responseType: 'arraybuffer' 
        });

        fs.unlinkSync(imagePath); // Clean up the uploaded file
        const imageType = response.headers['content-type'] === 'image/webp' ? 'webp' : 'jpeg';
        res.setHeader('Content-Type', `image/${imageType}`);
        res.send(response.data);
    } catch (error) {
        console.error('Failed to uncrop image:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to uncrop image');
    }
});


// app.post('/uncrop-image', upload.single('image'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No image file uploaded.');
//     }

//     const imagePath = req.file.path;
//     const { extend_left, extend_right, extend_up, extend_down, seed } = req.body;

//     const formData = new FormData();
//     formData.append('image_file', fs.createReadStream(imagePath));
//     if (extend_left) formData.append('extend_left', extend_left);
//     if (extend_right) formData.append('extend_right', extend_right);
//     if (extend_up) formData.append('extend_up', extend_up);
//     if (extend_down) formData.append('extend_down', extend_down);
//     if (seed) formData.append('seed', seed);

//     try {
//         const response = await axios.post('https://clipdrop-api.co/uncrop/v1', formData, {
//             headers: {
//                 ...formData.getHeaders(),
//                 'x-api-key': '2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e'
//             },
//             responseType: 'arraybuffer' 
//         });

//         fs.unlinkSync(imagePath); // Clean up the uploaded file
//         const imageType = response.headers['content-type'] === 'image/webp' ? 'webp' : 'jpeg';
//         res.setHeader('Content-Type', `image/${imageType}`);
//         res.send(response.data);
//     } catch (error) {
//         console.error('Failed to uncrop image:', error);
//         res.status(500).send('Failed to uncrop image');
//     }
// });



//upscale image

app.post('/upscale-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const imagePath = req.file.path;
    const { target_width, target_height } = req.body;

    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(imagePath));
    formData.append('target_width', target_width);
    formData.append('target_height', target_height);

    try {
        const response = await axios.post('https://clipdrop-api.co/image-upscaling/v1/upscale', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': '2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e'
            },
            responseType: 'arraybuffer' 
        });

        fs.unlinkSync(imagePath); // Clean up the uploaded file
        const imageType = response.headers['content-type'] === 'image/webp' ? 'webp' : 'jpeg';
        res.setHeader('Content-Type', `image/${imageType}`);
        res.send(response.data);
    } catch (error) {
        console.error('Failed to upscale image:', error);
        res.status(500).send('Failed to upscale image');
    }
});





app.post('/remove-background', upload.single('image'), async (req, res) => {
    console.log("Route hit: /remove-background");
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const imagePath = req.file.path;
    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(imagePath));
    formData.append('get_file', 1);

    try {
        const response = await axios.post('https://api.removal.ai/3.0/remove', formData, {
            headers: {
                ...formData.getHeaders(),
                'Rm-Token': '4D0203C1-63B7-75DF-304B-A217F9C7CC2B'
            },
            responseType: 'arraybuffer' 
        });

        fs.unlinkSync(imagePath); 
        res.setHeader('Content-Type', 'image/png');
        res.send(response.data);
    } catch (error) {
        console.error('Failed to remove background:', error);
        res.status(500).send('Failed to remove background');
    }
});

app.get('/test-imagemagick', (req, res) => {
    console.log('Testing ImageMagick installation...');
    exec('convert -size 1280x720 xc:"rgba(0,0,0,0.5)" "/home/kyle/quick-convert/overlay/overlay_test.png"', (error, stdout, stderr) => {
        if (error) {
            console.error(`Convert command failed: ${error}`);
            return res.status(500).send(`Error running convert: ${error.message}`);
        }
        console.log('Convert command stdout:', stdout);
        console.error('Convert command stderr:', stderr);
        res.send('ImageMagick command executed successfully.');
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

//colored overlay

app.post('/overlay', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const color = req.body.color.replace('#', '');
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

        // Create overlay
        exec(`convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0,2), 16)},${parseInt(color.substring(2,4), 16)},${parseInt(color.substring(4,6), 16)},${opacity})" "${overlayPath}"`, (overlayError) => {
            if (overlayError) {
                console.error('Error creating overlay:', overlayError);
                return res.status(500).send('Failed to create overlay.');
            }

            // Apply the overlay
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

// gradient overlay


app.post('/gradientOverlay', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const gradientType = req.body.gradientType;
    const gradientColor = req.body.gradientColor.replace('#', ''); // Ensure '#' is removed for consistency
    const outputPath = path.join(__dirname, 'processed', `gradient_overlay_video_${Date.now()}.mp4`);

    exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
        if (error) {
            console.error('Error getting video size:', error);
            return res.status(500).send('Failed to get video size.');
        }

        const [width, height] = stdout.trim().split(',');
        const gradientPath = path.join(__dirname, 'overlay', `gradient_${Date.now()}.png`);
        let gradientSize, overlayPosition;

        switch (gradientType) {
            case 'full':
                gradientSize = `${width}x${height}`;
                overlayPosition = '0:0';
                break;
            case 'half':
                gradientSize = `${width}x${parseInt(height / 2)}`;
                overlayPosition = `0:${parseInt(height / 2)}`;
                break;
            case 'quarter':
                gradientSize = `${width}x${parseInt(height / 4)}`;
                overlayPosition = `0:${3 * parseInt(height / 4)}`;
                break;
        }

        const gradientCommand = `convert -size ${gradientSize} gradient:#00000000-#${gradientColor} "${gradientPath}"`;

        exec(gradientCommand, (gradientError) => {
            if (gradientError) {
                console.error('Error creating gradient:', gradientError);
                return res.status(500).send('Failed to create gradient.');
            }

            // Apply the gradient
            const ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${gradientPath}" -filter_complex "[0:v][1:v] overlay=${overlayPosition} [outv]" -map "[outv]" -map 0:a? -c:a copy "${outputPath}"`;

            exec(ffmpegCommand, (ffmpegError) => {
                if (ffmpegError) {
                    console.error('Error applying gradient overlay:', ffmpegError);
                    return res.status(500).send('Failed to apply gradient overlay.');
                }

                res.download(outputPath, (downloadErr) => {
                    if (downloadErr) {
                        console.error('Error sending the gradient overlay video:', downloadErr);
                    }
                    fs.unlinkSync(videoPath);
                    fs.unlinkSync(gradientPath);
                });
            });
        });
    });
});




app.post('/slowVideo', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const slowFactor = parseFloat(req.body.slowFactor); 
    const outputPath = path.join(__dirname, 'processed', `slowed_video_${Date.now()}.mp4`);

    
    exec(`ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${videoPath}"`, (error, stdout) => {
        let ffmpegCommand;

        if (stdout) { // Audio stream
            ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "[0:v]setpts=${slowFactor}*PTS[v];[0:a]atempo=1/${slowFactor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
        } else { // No audio stream
            ffmpegCommand = `ffmpeg -i "${videoPath}" -filter:v "setpts=${slowFactor}*PTS" "${outputPath}"`;
        }

        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing FFmpeg command:', stderr);
                return res.status(500).send('Failed to slow down video.');
            }

            res.download(outputPath, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error sending the slowed video:', downloadErr);
                }
            
                fs.unlinkSync(videoPath);
            });
        });
    });
});







app.post('/convertToWebP', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const outputPath = path.join(convertedDir, `converted_${Date.now()}.webp`);

    const convertCommand = `ffmpeg -i "${videoPath}" -vcodec libwebp -lossless 1 -q:v 80 -loop 0 -preset picture -an -vsync 0 "${outputPath}"`;

    exec(convertCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error converting video to WebP:', stderr);
            return res.status(500).send('Error converting video to WebP.');
        }

        
        res.setHeader('Content-Type', 'image/webp');
        res.download(outputPath, 'video.webp', (downloadErr) => {
            if (downloadErr) {
                console.error('Error sending the WebP file:', downloadErr);
            }
            
            fs.unlinkSync(videoPath);
            
            // fs.unlinkSync(outputPath);
        });
    });
});


    






const { execFile } = require('child_process');


app.post('/convertToGif', upload.single('video'), (req, res) => {
    if (!req.file) {
        console.error('No file uploaded.');
        return res.status(400).send('No file uploaded.');
    }

    const videoPath = req.file.path;
    const framesDir = path.join(__dirname, `frames_${Date.now()}`);
    const outputPath = path.join(__dirname, 'converted', `converted_${Date.now()}.gif`);

   
    fs.mkdirSync(framesDir, { recursive: true });

   
    const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=12 "${path.join(framesDir, 'frame_%04d.png')}"`;

    exec(extractFramesCommand, (extractError) => {
        if (extractError) {
            console.error('Error extracting frames:', extractError);
            cleanup(videoPath, framesDir);
            return res.status(500).send('Error extracting frames.');
        }

        
        fs.readdir(framesDir, (err, files) => {
            if (err) {
                console.error('Error reading frames directory:', err);
                cleanup(videoPath, framesDir);
                return res.status(500).send('Could not read frames directory.');
            }
            
            
            files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            const frameFiles = files.map(file => path.join(framesDir, file));
            
            
            execFile('gifski', ['-o', outputPath, '--fps', '12', '--quality', '80', ...frameFiles], (gifskiError, stdout, stderr) => {
                if (gifskiError) {
                    console.error('Error creating GIF with gifski:', gifskiError);
                    console.error('stderr:', stderr);
                    cleanup(videoPath, framesDir);
                    return res.status(500).send('Error creating GIF with gifski.');
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

    if(outputPath) {
        fs.unlink(outputPath, (err) => {
            if (err) console.error(`Error deleting output GIF: ${outputPath}`, err);
        });
    }
};




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





    

});

app.listen(3000, '0.0.0.0', () => {
    console.log(`Server running on port 3000`);
});
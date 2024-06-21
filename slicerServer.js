
console.log('Google Upload Credentials Path:', process.env.GOOGLE_UPLOAD_CREDENTIALS);
console.log('Google Application Credentials Path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log('Api access token:', process.env.API_ACCESS_TOKEN);



require('dotenv').config();

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
const { Translate } = require('@google-cloud/translate').v2;
const translate = new Translate();
const { v4: uuidv4 } = require('uuid');

const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();

const {google} = require('googleapis');
google.options({auth: new google.auth.GoogleAuth({logLevel: 'debug'})});

const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
    keyFilename: process.env.GOOGLE_UPLOAD_CREDENTIALS
});
const bucket = storage.bucket('image-2d-to-3d')


const getApiAccessToken = () => {
    try {
        const tokenPath = '/Users/kyle/Desktop/FFMPEG_GIF_Slicer/secure/api-access-token.txt';
        const token = fs.readFileSync(tokenPath, 'utf8').trim();
        console.log('Retrieved API access token:', token); 
        return token;
    } catch (error) {
        console.error('Error reading API access token:', error);
        return null;
    }
};

app.use(cors()); 
app.use(express.static('public'));
app.use(express.json());
app.use('/subtitles', express.static(path.join(__dirname, 'subtitles')));



process.env.PATH += ':/usr/bin';
const convertedDir = path.join(__dirname, 'converted');
const compressedDir = path.join(__dirname, 'compressed');

if (!fs.existsSync(compressedDir)) {
    fs.mkdirSync(compressedDir, { recursive: true });
}






app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'background-remover.html'));
});

app.post('/compressGif', upload.single('gif'), (req, res) => {
    if (!req.file) {
        console.error('No file uploaded.');
        return res.status(400).send('No file uploaded.');
    }

    const gifPath = req.file.path;
    const outputPath = path.join(compressedDir, `compressed_${Date.now()}.gif`);
    const quality = req.body.quality || '80';
    const fps = req.body.fps || '15';

    const gifskiArgs = ['-o', outputPath, '--quality', quality, '--fps', fps, gifPath];

    execFile('gifski', gifskiArgs, (error, stdout, stderr) => {
        if (error) {
            console.error('Error compressing GIF with gifski:', error);
            fs.unlink(gifPath, (err) => {
                if (err) console.error(`Error deleting gif file: ${gifPath}`, err);
            });
            return res.status(500).send('Error compressing GIF with gifski.');
        }

        res.download(outputPath, () => {
            fs.unlink(gifPath, (err) => {
                if (err) console.error(`Error deleting gif file: ${gifPath}`, err);
            });
            fs.unlink(outputPath, (err) => {
                if (err) console.error(`Error deleting output GIF: ${outputPath}`, err);
            });
        });
    });
});
// app.post('/compressGif', upload.single('gif'), (req, res) => {
//     if (!req.file) {
//         console.error('No file uploaded.');
//         return res.status(400).send('No file uploaded.');
//     }

//     const gifPath = req.file.path;
//     const outputPath = path.join(__dirname, 'compressed', `compressed_${Date.now()}.gif`);
//     const quality = req.body.quality || '80';
//     const fps = req.body.fps || '15';
//     const width = req.body.width || null;
//     const height = req.body.height || null;

//     const gifskiArgs = ['-o', outputPath, '--quality', quality, '--fps', fps];
    
//     if (width && height) {
//         gifskiArgs.push('--width', width, '--height', height);
//     }

//     gifskiArgs.push(gifPath);

//     execFile('gifski', gifskiArgs, (error, stdout, stderr) => {
//         if (error) {
//             console.error('Error compressing GIF with gifski:', error);
//             fs.unlink(gifPath, (err) => {
//                 if (err) console.error(`Error deleting gif file: ${gifPath}`, err);
//             });
//             return res.status(500).send('Error compressing GIF with gifski.');
//         }

//         res.download(outputPath, () => {
//             fs.unlink(gifPath, (err) => {
//                 if (err) console.error(`Error deleting gif file: ${gifPath}`, err);
//             });
//             fs.unlink(outputPath, (err) => {
//                 if (err) console.error(`Error deleting output GIF: ${outputPath}`, err);
//             });
//         });
//     });
// });


app.post('/upload-to-gc', upload.single('file'), (req, res) => {
    console.log('Received file:', req.file);

    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
            contentType: req.file.mimetype
        }
    });

    blobStream.on('error', err => {
        console.error('Error during upload:', err);
        res.status(500).send({ message: 'Could not upload the file.' });
    });

    blobStream.on('finish', () => {
        blob.makePublic().then(() => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            console.log('Generated Public URL:', publicUrl); // Log the generated URL
            res.status(200).send({ message: `File uploaded successfully: ${publicUrl}`, url: publicUrl });
        }).catch(err => {
            console.error('Failed to make the file public:', err);
            res.status(500).send({ message: 'Uploaded but failed to make the file public.' });
        });
    });

    fs.createReadStream(filePath).pipe(blobStream);
});


app.post('/2d-to-3d', async (req, res) => {
    const accessToken = getApiAccessToken();
    const correlationId = uuidv4();

    // Use the hardcoded input image URL
    const inputImageUrl = 'https://storage.googleapis.com/image-2d-to-3d/2.jpeg';

    // Provide or generate the result presigned URL
    const resultPresignedUrl = 'https://storage.googleapis.com/image-2d-to-3d/result-file-name.png';

    if (!accessToken) {
        return res.status(500).send({ message: 'Failed to retrieve API access token.' });
    }

    console.log('Sending request to API with data:', {
        correlationId,
        inputImageUrl,
        resultPresignedUrl
    });

    try {
        new URL(inputImageUrl);
        new URL(resultPresignedUrl);
    } catch (e) {
        console.error('Invalid URL:', e.message);
        return res.status(400).send({ message: 'Invalid URL format.' });
    }

    const authorizationHeader = `Bearer ${accessToken}`;
    console.log('Authorization header:', authorizationHeader);

    const apiUrl = 'https://api.immersity.ai/api/v1/disparity';
    console.log('API URL:', apiUrl);

    try {
        const response = await axios.post(
            apiUrl,
            {
                correlationId,
                inputImageUrl,
                resultPresignedUrl
            },
            {
                headers: {
                    Authorization: authorizationHeader,
                },
                timeout: 180000
            }
        );
        res.send(response.data);
    } catch (error) {
        console.error('API Call Failed:', error.response ? error.response.data : error.message);

        if (error.response) {
            console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
        } else {
            console.error('Error message:', error.message);
        }

        res.status(500).send({ message: 'API call failed', error: error.response ? error.response.data : error.message });
    }
});



app.post('/transcribe-video', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }

    const videoPath = req.file.path;
    const audioPath = path.join(__dirname, 'subtitles', `${req.file.filename}.flac`);
    const srtPath = path.join(__dirname, 'subtitles', `${req.file.filename}.srt`);
    const outputPath = path.join(__dirname, 'subtitles', `${req.file.filename}_subtitled.mp4`);
    const fontSize = req.body.fontSize || 24;
    const fontFamily = req.body.fontFamily || 'Arial';
    const fontColor = req.body.fontColor || '#FFFFFF';

    // Convert the hex color to ASS format
    const hexToAssColor = (hex) => {
        const alpha = '00'; // No transparency
        const red = hex.substring(1, 3);
        const green = hex.substring(3, 5);
        const blue = hex.substring(5, 7);
        return `&H${alpha}${blue}${green}${red}&`;
    };

    const primaryColor = hexToAssColor(fontColor);

    const ffmpegExtractAudioCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -vn -y -f flac "${audioPath}"`;
    exec(ffmpegExtractAudioCommand, async (error) => {
        if (error) {
            console.error('Error converting video to audio:', error);
            return res.status(500).send('Failed to convert video.');
        }

        try {
            const transcriptionResults = await transcribeAudio(audioPath);
            createSRT(transcriptionResults, srtPath);

            const ffmpegAddSubtitlesCommand = `ffmpeg -i "${videoPath}" -vf "subtitles=${srtPath}:force_style='Fontsize=${fontSize},Fontname=${fontFamily},PrimaryColour=${primaryColor}'" -c:v libx264 -c:a copy "${outputPath}"`;
            exec(ffmpegAddSubtitlesCommand, (subError) => {
                cleanupFiles(videoPath, audioPath, srtPath);

                if (subError) {
                    console.error('Error adding subtitles:', subError);
                    return res.status(500).send('Failed to add subtitles to video.');
                }

                res.json({ message: 'Video processed with subtitles', videoUrl: `/subtitles/${req.file.filename}_subtitled.mp4` });
            });
        } catch (transcriptionError) {
            console.error('Transcription error:', transcriptionError);
            cleanupFiles(videoPath, audioPath, srtPath);
            res.status(500).send('Failed to transcribe audio.');
        }
    });
});



function transcribeAudio(filePath) {
    const file = fs.readFileSync(filePath);
    const audioBytes = file.toString('base64');

    const request = {
        audio: { content: audioBytes },
        config: {
            encoding: 'FLAC',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true
        },
    };

    return speechClient.recognize(request).then(data => {
        const [response] = data;
        const transcriptionResults = response.results.map(result => {
            const alternatives = result.alternatives[0];
            const timestamps = alternatives.words.map(word => ({
                word: word.word,
                startTime: parseFloat(word.startTime.seconds) + word.startTime.nanos * 1e-9,
                endTime: parseFloat(word.endTime.seconds) + word.endTime.nanos * 1e-9
            }));
            console.log("Raw Timestamps:", timestamps); 
            return {
                transcript: alternatives.transcript,
                timestamps: timestamps
            };
        });
        return transcriptionResults;
    });
}


// new


function createSRT(transcriptionResults, srtPath) {
    let srtContent = [];
    let index = 1;
    let sentence = "";
    let startTime = 0;
    let endTime = 0;

    transcriptionResults.forEach((result, resultIdx) => {
        result.timestamps.forEach((word, idx) => {
            if (sentence === "") {
                startTime = word.startTime;
            }
            sentence += (sentence ? " " : "") + word.word;

            if (idx === result.timestamps.length - 1 || (result.timestamps[idx + 1] && result.timestamps[idx + 1].startTime - word.endTime > 1)) {
                
                endTime = word.endTime; 

              
                const formattedStart = formatSRTTime(startTime);
                const formattedEnd = formatSRTTime(endTime + 0.5);
                srtContent.push(`${index}\n${formattedStart} --> ${formattedEnd}\n${sentence}\n`);
                index++;
                sentence = "";
            }
        });
    });

    fs.writeFileSync(srtPath, srtContent.join('\n\n'));
}



function formatSRTTime(rawTime) {
    console.log("Raw time received:", rawTime); // Debug log

    const time = parseFloat(rawTime);
    if (isNaN(time)) {
        console.error("Invalid time data:", rawTime);
        return "00:00:00,000";
    }

    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time % 3600) / 60);
    let seconds = Math.floor(time % 60);
    let milliseconds = Math.round((time - Math.floor(time)) * 1000);

    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
    milliseconds = milliseconds.toString().padStart(3, '0');

    const formattedTime = `${hours}:${minutes}:${seconds},${milliseconds}`;
    console.log("Formatted time:", formattedTime); // Debug log 

    return formattedTime;
}



function cleanupFiles(videoPath, audioPath, srtPath) {
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    // fs.unlinkSync(srtPath);
}




// for recolor

app.post('/recolorImage', upload.single('image'), (req, res) => {
    const imagePath = req.file.path;
    const targetColor = req.body.targetColor;
    const outputPath = path.join(__dirname, 'converted', `recolor_${Date.now()}.png`);

    // Convert target color hex to HSL
    const { h, s, l } = hexToHSL(targetColor);

    const recolorCommand = `convert "${imagePath}" -modulate 100,${s},${h} "${outputPath}"`;

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

function hexToHSL(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}



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




//cleanup
app.post('/cleanup-image', upload.fields([{ name: 'image_file' }, { name: 'mask_file' }]), async (req, res) => {
    const imagePath = req.files['image_file'][0].path;
    const maskPath = req.files['mask_file'][0].path;

    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(imagePath));
    formData.append('mask_file', fs.createReadStream(maskPath));
    formData.append('mode', 'quality');

    try {
        const response = await axios.post('https://clipdrop-api.co/cleanup/v1', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': '2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e'
            },
            responseType: 'arraybuffer'
        });

        // console.log('API Call Success:', response.data);

        fs.unlinkSync(imagePath);
        fs.unlinkSync(maskPath);
        const imageType = 'image/png';
        res.setHeader('Content-Type', imageType);
        res.send(response.data);
    } catch (error) {
        console.error('API Call Failed:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to cleanup image');
    }
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

        fs.unlinkSync(imagePath);
        const imageType = response.headers['content-type'] === 'image/webp' ? 'webp' : 'jpeg';
        res.setHeader('Content-Type', `image/${imageType}`);
        res.send(response.data);
    } catch (error) {
        console.error('Failed to uncrop image:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to uncrop image');
    }
});

app.post('/reimagine-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const imagePath = req.file.path;
    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(imagePath));

    try {
        const response = await axios.post('https://clipdrop-api.co/reimagine/v1/reimagine', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': '2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e'
            },
            responseType: 'arraybuffer'
        });

        fs.unlinkSync(imagePath);
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        console.error('API Call Failed:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to reimagine image');
    }
});



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

        fs.unlinkSync(imagePath); 
        const imageType = response.headers['content-type'] === 'image/webp' ? 'webp' : 'jpeg';
        res.setHeader('Content-Type', `image/${imageType}`);
        res.send(response.data);
    } catch (error) {
        console.error('Failed to upscale image:', error);
        res.status(500).send('Failed to upscale image');
    }
});


app.post('/remove-background', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const imagePath = req.file.path;
    const formData = new FormData();
    formData.append('image_file', fs.createReadStream(imagePath));

    try {
        const response = await axios.post('https://clipdrop-api.co/remove-background/v1', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': '2ebd9993354e21cafafc8daa3f70f514072021319522961c0397c4d2ed7e4228bec2fb0386425febecf0de652aae734e'
            },
            responseType: 'arraybuffer'
        });

        fs.unlinkSync(imagePath);
        const imageType = response.headers['content-type'];
        res.setHeader('Content-Type', imageType);
        res.send(response.data);
    } catch (error) {
        console.error('Failed to remove background:', error);
        res.status(500).send('Failed to remove background');
    }
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



//colored overlay

app.post('/overlay', upload.single('video'), (req, res) => {
    const videoPath = req.file.path;
    const color = req.body.color.replace('#', '');
    const opacity = parseFloat(req.body.opacity);
    const outputPath = path.join(__dirname, 'processed', `overlay_video_${Date.now()}.mp4`);

  
    exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, (error, stdout) => {
        if (error) {
            console.error('Error getting video size:', error);
            return res.status(500).send('Failed to get video size.');
        }

        const [width, height] = stdout.trim().split(',');
        const overlayPath = path.join(__dirname, 'overlay', `overlay_${Date.now()}.png`);
     
        exec(`convert -size ${width}x${height} xc:"rgba(${parseInt(color.substring(0,2), 16)},${parseInt(color.substring(2,4), 16)},${parseInt(color.substring(4,6), 16)},${opacity})" "${overlayPath}"`, (overlayError) => {
            if (overlayError) {
                console.error('Error creating overlay:', overlayError);
                return res.status(500).send('Failed to create overlay.');
            }

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
    const gradientColor = req.body.gradientColor.replace('#', '');
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

        if (stdout) { // has audio
            ffmpegCommand = `ffmpeg -i "${videoPath}" -filter_complex "[0:v]setpts=${slowFactor}*PTS[v];[0:a]atempo=1/${slowFactor}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
        } else { // no audio
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

    const convertCommand = `ffmpeg -i "${videoPath}" -vf scale=iw:ih -vcodec libwebp -compression_level 6 -q:v 30 -preset picture -an -loop 0 -vsync 0 "${outputPath}"`;


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
            fs.unlinkSync(outputPath);
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

   
    const extractFramesCommand = `ffmpeg -i "${videoPath}" -vf fps=15 "${path.join(framesDir, 'frame_%04d.png')}"`;

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
            
            
            execFile('gifski', ['-o', outputPath, '--fps', '15', '--quality', '80', ...frameFiles], (gifskiError, stdout, stderr) => {
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
            console.error('Conversion Error:', convertError);
            return res.status(500).send('Error converting video to AVIF.');
        }

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

                fs.unlink(outputPath, unlinkErr => {
                    if (unlinkErr) {
                        console.error(`Error deleting output file: ${outputPath}`, unlinkErr);
                    }
                });
            });
        });
    });
});



app.listen(3000, '0.0.0.0', () => {
    console.log(`Server running on port 3000`);
});

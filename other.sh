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
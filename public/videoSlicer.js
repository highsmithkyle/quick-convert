document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('slicerForm');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const processedVideo = document.getElementById('processedVideo');
    const videoInput = document.querySelector('input[type="file"]');
    const notification = document.getElementById('processingNotification');
    const createOverlayButton = document.getElementById('createOverlayButton'); 
    const createGradientOverlayButton = document.getElementById('createGradientOverlayButton');

    console.log(createOverlayButton);  // Check if the button exists




    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        notification.style.display = 'block';
        const formData = new FormData(this);

        fetch('/slice', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                processedVideo.src = URL.createObjectURL(blob);
                processedVideo.parentElement.style.display = 'block';
            })
            .catch(() => {
                notification.style.display = 'none';
                console.error('Failed to process video.');
            });
    });


    document.getElementById('convertToGifButton').addEventListener('click', function() {
        const videoSource = document.getElementById('uploadedVideo').getAttribute('src');
        if (!videoSource) {
            console.log('No video available to convert to GIF.');
            return;
        }
        notification.style.display = 'block';
        
        fetch(videoSource)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'final.mp4');
                return fetch('/convertToGif', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const gifImage = document.getElementById('gifImage');
                gifImage.src = URL.createObjectURL(blob);
                gifImage.style.display = 'block';
    
                
                const downloadButtonContainer = document.getElementById('gifDownloadButtonContainer');
                downloadButtonContainer.innerHTML = ''; 
    
                
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download GIF';
                downloadButton.className = 'download-button';
    
                
                const fileSizeSpan = document.createElement('span');
                fileSizeSpan.className = 'file-size';
                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
                fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;
    
                
                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeSpan);
    
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = gifImage.src;
                    a.download = 'converted_image.gif';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to GIF:', error);
            });
    });
    


    // colored overlay

    document.getElementById('createOverlayButton').addEventListener('click', function() {
        const uploadedVideoElement = document.getElementById('uploadedVideo');
        const color = document.getElementById('overlayColor').value;
        const opacity = document.getElementById('overlayOpacity').value;
    
        if (!uploadedVideoElement.src) {
            console.log('No uploaded video available.');
            return;
        }
    
        notification.style.display = 'block';
    
        fetch(uploadedVideoElement.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob);
                formData.append('color', color);
                formData.append('opacity', opacity);
    
                return fetch('/overlay', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const overlayVideo = document.getElementById('overlayVideo');
                overlayVideo.src = URL.createObjectURL(blob);
                overlayVideo.style.display = 'block';
            })
            .catch(() => {
                notification.style.display = 'none';
                console.log('Failed to create overlay.');
            });
    });
    
    

    
    document.getElementById('createGradientOverlayButton').addEventListener('click', function() {
        const uploadedVideoElement = document.getElementById('uploadedVideo');
        const gradientType = document.getElementById('gradientDirection').value;
        const gradientColor = document.getElementById('gradientColor').value.replace('#', ''); // Remove the '#' for server processing
        
        if (!uploadedVideoElement.src) {
            console.log('No uploaded video available.');
            return;
        }

        notification.style.display = 'block';

        fetch(uploadedVideoElement.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'uploaded.mp4');
                formData.append('gradientType', gradientType);
                formData.append('gradientColor', gradientColor);

                return fetch('/gradientOverlay', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const gradientOverlayVideo = document.getElementById('gradientOverlayVideo');
                gradientOverlayVideo.src = URL.createObjectURL(blob);
                gradientOverlayVideo.style.display = 'block';
            })
            .catch(() => {
                notification.style.display = 'none';
                console.error('Failed to create gradient overlay.');
            });
    });




    


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
    

   

    
    
    

    document.getElementById('convertToAvifButton').addEventListener('click', function() {
        const videoSource = document.getElementById('croppedVideo').getAttribute('src');
        if (!videoSource) {
            console.error('No video available to convert to AVIF.');
            return;
        }
        notification.style.display = 'block';
    
        fetch(videoSource)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'final.mp4');
                return fetch('/convertToAvif', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const avifImage = document.getElementById('avifImage');
                avifImage.src = URL.createObjectURL(blob);
                avifImage.style.display = 'block';
    
                
                const downloadButtonContainer = document.getElementById('avifDownloadButtonContainer');
                downloadButtonContainer.innerHTML = ''; 
    
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download AVIF';
                downloadButton.className = 'download-button';
    
                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
                const fileSizeText = document.createTextNode(` (${fileSizeInMB} MB)`);
    
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = avifImage.src;
                    a.download = 'converted_image.avif'; 
                    document.body.appendChild(a); 
                    a.click(); 
                    document.body.removeChild(a);
                });
    
                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeText);
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to AVIF:', error);
            });
    });
    


    document.addEventListener('DOMContentLoaded', function() {
        // Handles the overlay color picker
        var colorPicker = document.getElementById('overlayColor');
        var colorValueDisplay = document.getElementById('colorValue');
        
        colorPicker.addEventListener('input', function() {
            colorValueDisplay.textContent = colorPicker.value;
        });
    
        // Handles the opacity slider for overlays
        var opacitySlider = document.getElementById('overlayOpacity');
        var opacityValueDisplay = document.getElementById('opacityValue');
        
        opacitySlider.addEventListener('input', function() {
            opacityValueDisplay.textContent = opacitySlider.value;
        });
    
        // Handles the gradient color picker
        var gradientColorPicker = document.getElementById('gradientColor');
        var gradientColorValueDisplay = document.getElementById('gradientColorValue');
        
        gradientColorPicker.addEventListener('input', function() {
            gradientColorValueDisplay.textContent = gradientColorPicker.value.toUpperCase(); // Display the gradient color value
        });
    });

    
});



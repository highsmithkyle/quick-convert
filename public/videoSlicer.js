document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('slicerForm');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const processedVideo = document.getElementById('processedVideo');
    const videoInput = document.querySelector('input[type="file"]');
    const notification = document.getElementById('processingNotification');
    const createOverlayButton = document.getElementById('createOverlayButton'); // Added button for overlay creation

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


    document.getElementById('createOverlayButton').addEventListener('click', function() {
        const croppedVideoElement = document.getElementById('croppedVideo');
        const color = document.getElementById('overlayColor').value;
        const opacity = document.getElementById('overlayOpacity').value;
    
        if (!croppedVideoElement.src) {
            console.log('No cropped video available.');
            return;
        }
    
        notification.style.display = 'block';
    
        fetch(croppedVideoElement.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'cropped.mp4');
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
    
                // Create and display the download button with file size in MB
                const downloadButtonContainer = document.getElementById('webpDownloadButtonContainer');
                downloadButtonContainer.innerHTML = ''; // Clear any existing content
    
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download WebP';
                downloadButton.className = 'download-button';
    
                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2); // Convert to MB
                const fileSizeText = document.createTextNode(` (${fileSizeInMB} MB)`); // Display size in MB
    
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = webPImage.src;
                    a.download = 'converted_image.webp'; // Set the default filename for the download
                    document.body.appendChild(a); // Append the link to the body
                    a.click(); // Programmatically click the link to trigger the download
                    document.body.removeChild(a); // Remove the link from the body
                });
    
                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeText); // Append the file size text next to the button
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to WebP:', error);
            });
    });
    
    

    
    



    document.getElementById('cropVideoButton').addEventListener('click', function() {
        const processedVideoElement = document.getElementById('processedVideo');
        const cropRatioSelect = document.getElementById('cropRatio');

        if (!processedVideoElement.src) {
            console.log('No video available to crop.');
            return;
        }

        notification.style.display = 'block';

        fetch(processedVideoElement.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'processed.mp4');
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

   

    document.getElementById('convertToGifButton').addEventListener('click', function() {
        const videoSource = document.getElementById('croppedVideo').getAttribute('src');
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
    
                // Display the download button with file size
                const downloadButtonContainer = document.getElementById('gifDownloadButtonContainer');
                downloadButtonContainer.innerHTML = ''; // Clear existing content
    
                // Create and style the download button
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download GIF';
                downloadButton.className = 'download-button';
    
                // Create a span for the file size
                const fileSizeSpan = document.createElement('span');
                fileSizeSpan.className = 'file-size';
                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
                fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;
    
                // Append the file size element and the download button
                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeSpan);
    
                // Set download functionality
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
    
                // Create and display the download button with file size
                const downloadButtonContainer = document.getElementById('avifDownloadButtonContainer');
                downloadButtonContainer.innerHTML = ''; // Clear any existing content
    
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download AVIF';
                downloadButton.className = 'download-button';
    
                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
                const fileSizeText = document.createTextNode(` (${fileSizeInMB} MB)`);
    
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = avifImage.src;
                    a.download = 'converted_image.avif'; // Set the default filename for the download
                    document.body.appendChild(a); // Append the link to the body
                    a.click(); // Programmatically click the link to trigger the download
                    document.body.removeChild(a); // Remove the link from the body
                });
    
                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeText); // Append the file size text next to the button
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to AVIF:', error);
            });
    });
    


    
});
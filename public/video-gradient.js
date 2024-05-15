document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('video');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const gradientOverlayButton = document.getElementById('createGradientOverlayButton');
    const notification = document.getElementById('processingNotification');
    const overlayVideo = document.getElementById('overlayVideo');
    const gradientColorInput = document.getElementById('gradientColor');
    const gradientColorValueDisplay = document.getElementById('colorValue');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

    gradientColorInput.addEventListener('input', function() {
        gradientColorValueDisplay.textContent = gradientColorInput.value.toUpperCase();
    });

    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    gradientOverlayButton.addEventListener('click', function() {
        if (!uploadedVideo.src || videoInput.files.length === 0) {
            console.log('No video has been uploaded.');
            return;
        }
        notification.style.display = 'block';
        const gradientColor = gradientColorInput.value.replace('#', ''); 
        const gradientDirection = document.getElementById('gradientDirection').value;
        const originalFileName = videoInput.files[0].name.split('.')[0];
        
        const formData = new FormData();
        formData.append('video', videoInput.files[0]);
        formData.append('gradientColor', gradientColor);
        formData.append('gradientType', gradientDirection);

        fetch('/gradientOverlay', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onload = function() {
                    const dataUrl = reader.result;
                    notification.style.display = 'none';
                    overlayVideo.src = dataUrl;
                    overlayVideo.style.display = 'block';

                    const downloadButton = document.createElement('button');
                    downloadButton.textContent = 'Download Video';
                    downloadButton.className = 'download-button';
                    downloadButton.addEventListener('click', function() {
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = originalFileName + '_gradient-overlay.mp4';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    });
                    downloadButtonContainer.innerHTML = '';
                    downloadButtonContainer.appendChild(downloadButton);
                };
                reader.readAsDataURL(blob);
            })
            .catch((error) => {
                notification.style.display = 'none';
                console.error('Failed to create gradient overlay:', error);
            });
    });
});

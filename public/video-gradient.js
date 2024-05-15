document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('video');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const gradientOverlayButton = document.getElementById('createGradientOverlayButton');
    const notification = document.getElementById('processingNotification');
    const overlayVideo = document.getElementById('overlayVideo');
    const gradientColorInput = document.getElementById('gradientColor');
    const gradientColorValueDisplay = document.getElementById('colorValue'); // Assuming there's an element to display the color value

    // Update color text display as the user picks a color
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

        const gradientColor = gradientColorInput.value.replace('#', ''); // Ensure the '#' is removed for processing
        const gradientDirection = document.getElementById('gradientDirection').value;
        
        const formData = new FormData();
        formData.append('video', videoInput.files[0]);
        formData.append('gradientColor', gradientColor);
        formData.append('gradientType', gradientDirection);

        fetch('/gradientOverlay', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                overlayVideo.src = URL.createObjectURL(blob);
                overlayVideo.style.display = 'block';
            })
            .catch((error) => {
                notification.style.display = 'none';
                console.error('Failed to create gradient overlay:', error);
            });
    });
});

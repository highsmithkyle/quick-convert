document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('slicerForm');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const videoInput = document.querySelector('input[type="file"]');
    const notification = document.getElementById('processingNotification');
    const createOverlayButton = document.getElementById('createOverlayButton'); 

    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    if (createOverlayButton) {
        createOverlayButton.addEventListener('click', function() {
            if (!uploadedVideo.src || !videoInput.files.length) {
                console.log('No uploaded video available.');
                return;
            }
            notification.style.display = 'block';
            const color = document.getElementById('overlayColor').value;
            const opacity = document.getElementById('overlayOpacity').value;
            const formData = new FormData();
            formData.append('video', videoInput.files[0]); // Use the input directly
            formData.append('color', color);
            formData.append('opacity', opacity);
    
            fetch('/overlay', { method: 'POST', body: formData })
                .then(response => response.blob())
                .then(blob => {
                    notification.style.display = 'none';
                    const overlayVideo = document.getElementById('overlayVideo');
                    overlayVideo.src = URL.createObjectURL(blob);
                    overlayVideo.style.display = 'block';
                })
                .catch((error) => {
                    notification.style.display = 'none';
                    console.log('Failed to create overlay.', error);
                });
        });
    }
});

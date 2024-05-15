document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('slicerForm');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const processedVideo = document.getElementById('processedVideo');
    const videoInput = document.querySelector('input[type="file"]');
    const notification = document.getElementById('processingNotification');

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
});
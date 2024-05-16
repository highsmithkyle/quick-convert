document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('video');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const slowedVideoElement = document.getElementById('slowedVideo');
    const slowVideoButton = document.getElementById('slowVideoButton');
    const slowFactorSlider = document.getElementById('slowFactor');
    const slowFactorValueDisplay = document.getElementById('slowFactorValue');
    const notification = document.getElementById('processingNotification');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

    slowFactorSlider.addEventListener('input', function() {
        slowFactorValueDisplay.textContent = this.value + 'x';
    });

    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    slowVideoButton.addEventListener('click', function() {
        if (!uploadedVideo.src || videoInput.files.length === 0) {
            console.log('No video has been uploaded.');
            return;
        }

        notification.style.display = 'block';
        const slowFactor = slowFactorSlider.value;
        const originalFileName = videoInput.files[0].name.split('.')[0];

        const formData = new FormData();
        formData.append('video', videoInput.files[0]);
        formData.append('slowFactor', slowFactor);

        fetch('/slowVideo', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const objectURL = URL.createObjectURL(blob);
                slowedVideoElement.src = objectURL;
                slowedVideoElement.style.display = 'block';

                
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download Slowed Video';
                downloadButton.className = 'download-button';
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = objectURL;
                    a.download = `${originalFileName}_slowed.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
                downloadButtonContainer.innerHTML = '';
                downloadButtonContainer.appendChild(downloadButton);
            })
            .catch((error) => {
                notification.style.display = 'none';
                console.error('Failed to slow down video:', error);
            });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('video');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const avifImage = document.getElementById('avifImage');
    const convertButton = document.getElementById('convertToAvifButton');
    const notification = document.getElementById('processingNotification');
    const downloadButtonContainer = document.getElementById('avifDownloadButtonContainer');

    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    convertButton.addEventListener('click', function() {
        if (!uploadedVideo.src || videoInput.files.length === 0) {
            console.error('No video has been uploaded.');
            return;
        }

        notification.style.display = 'block';
        const formData = new FormData();
        formData.append('video', videoInput.files[0]);

        fetch('/convertToAvif', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                notification.style.display = 'none';
                avifImage.src = URL.createObjectURL(blob);
                avifImage.style.display = 'block';

                downloadButtonContainer.innerHTML = ''; // Clear previous buttons if any
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download AVIF';
                downloadButton.className = 'download-button';

                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2); // Convert to MB
                const fileSizeSpan = document.createElement('span');
                fileSizeSpan.className = 'file-size';
                fileSizeSpan.textContent = ` (${fileSizeInMB} MB)`;

                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = avifImage.src;
                    a.download = 'converted_image.avif';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });

                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeSpan);
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to AVIF:', error);
            });
    });
});

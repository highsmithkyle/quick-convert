document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('videoInput');
    const uploadButton = document.getElementById('uploadButton');
    const convertToGifButton = document.getElementById('convertToGifButton');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const gifImage = document.getElementById('gifImage');
    const gifDownloadButtonContainer = document.getElementById('gifDownloadButtonContainer');
    const processingNotification = document.getElementById('processingNotification');

    uploadButton.addEventListener('click', function() {
        if (videoInput.files.length > 0) {
            const videoFile = videoInput.files[0];
            uploadedVideo.src = URL.createObjectURL(videoFile);
            uploadedVideo.style.display = 'block';
            convertToGifButton.style.display = 'block';
        }
    });

    convertToGifButton.addEventListener('click', function() {
        processingNotification.style.display = 'block';
        const formData = new FormData();
        formData.append('video', videoInput.files[0]);

        fetch('/convertToGif', {
            method: 'POST',
            body: formData
        }).then(response => response.blob())
          .then(blob => {
              gifImage.src = URL.createObjectURL(blob);
              gifImage.style.display = 'block';
              processingNotification.style.display = 'none';

              // Create and append the download button
              const downloadButton = document.createElement('button');
              downloadButton.textContent = 'Download GIF';
              downloadButton.className = 'download-button';
              downloadButton.addEventListener('click', function() {
                  const a = document.createElement('a');
                  a.href = gifImage.src;
                  a.download = 'converted_image.gif';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
              });

              gifDownloadButtonContainer.innerHTML = ''; // Clear previous
              gifDownloadButtonContainer.appendChild(downloadButton);
          })
          .catch(error => {
              console.error('Failed to convert to GIF:', error);
              processingNotification.style.display = 'none';
          });
    });
});

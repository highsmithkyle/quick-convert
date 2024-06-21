document.addEventListener('DOMContentLoaded', function() {
    const gifInput = document.getElementById('gifInput');
    const uploadedGif = document.getElementById('uploadedGif');
    const uploadedGifSize = document.getElementById('uploadedGifSize');
    const compressedGifImage = document.getElementById('compressedGifImage');
    const notification = document.getElementById('processingNotification');
    const compressGifButton = document.getElementById('compressGifButton');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

    gifInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedGif.src = URL.createObjectURL(file);
            uploadedGif.style.display = 'block';
            uploadedGifSize.textContent = `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        }
    });

    compressGifButton.addEventListener('click', function() {
        if (!uploadedGif.src) {
            console.log('No GIF available to compress.');
            return;
        }
        notification.style.display = 'block';

        const quality = document.getElementById('quality').value;
        const fps = document.getElementById('fps').value;

        fetch(uploadedGif.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('gif', blob, 'original.gif');
                formData.append('quality', quality);
                formData.append('fps', fps);
                return fetch('/compressGif', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                compressedGifImage.src = URL.createObjectURL(blob);
                compressedGifImage.style.display = 'block';

                downloadButtonContainer.innerHTML = '';
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download GIF';
                downloadButton.className = 'download-button';

                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
                const fileSizeSpan = document.createElement('span');
                fileSizeSpan.className = 'file-size';
                fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;
                fileSizeSpan.style="margin-left:10px;";

                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeSpan);

                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = compressedGifImage.src;
                    a.download = 'compressed_image.gif';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to compress GIF:', error);
            });
    });
});

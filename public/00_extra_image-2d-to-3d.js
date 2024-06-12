document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const uploadedImage = document.getElementById('uploadedImage');
    const converted3DImageElement = document.getElementById('converted3DImage');
    const convertImageButton = document.getElementById('convertImageButton');
    const notification = document.getElementById('processingNotification');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedImage.src = URL.createObjectURL(file);
            uploadedImage.parentElement.style.display = 'block';
        }
    });

    convertImageButton.addEventListener('click', function() {
        if (!uploadedImage.src || imageInput.files.length === 0) {
            console.log('No image has been uploaded.');
            return;
        }

        notification.style.display = 'block';
        const originalFileName = imageInput.files[0].name.split('.')[0];

        const formData = new FormData();
        formData.append('image', imageInput.files[0]);

        fetch('/create-disparity-map', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const objectURL = URL.createObjectURL(blob);
                converted3DImageElement.src = objectURL;
                converted3DImageElement.style.display = 'block';

                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download Converted 3D Image';
                downloadButton.className = 'download-button';
                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = objectURL;
                    a.download = `${originalFileName}_3D.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
                downloadButtonContainer.innerHTML = '';
                downloadButtonContainer.appendChild(downloadButton);
            })
            .catch((error) => {
                notification.style.display = 'none';
                console.error('Failed to convert image:', error);
            });
    });
});

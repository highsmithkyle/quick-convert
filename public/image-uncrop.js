document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const uploadFormUncrop = document.getElementById('uploadFormUncrop');
    const notification = document.getElementById('processingNotification');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('uploadedImage').src = e.target.result;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    uploadFormUncrop.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        notification.style.display = 'block';
        fetch('/uncrop-image', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server responded with ' + response.status);
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            document.getElementById('processedImage').src = url;
            notification.style.display = 'none';

            downloadButtonContainer.innerHTML = ''; 

            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download Image';
            downloadButton.className = 'download-button';
            downloadButton.addEventListener('click', function() {
                const a = document.createElement('a');
                a.href = url;
                a.download = 'uncropped_image';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            downloadButtonContainer.appendChild(downloadButton);
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Failed to uncrop the image. ' + err.message);
            notification.style.display = 'none';
        });
    });
});

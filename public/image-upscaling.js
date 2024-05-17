document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const uploadFormUpscale = document.getElementById('uploadFormUpscale');
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

    uploadFormUpscale.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        notification.style.display = 'block'; // Show processing notification
        fetch('/upscale-image', {
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
            notification.style.display = 'none'; // Hide processing notification

            // Clear existing download button if any
            downloadButtonContainer.innerHTML = ''; 

            // Create and append the download button
            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download Image';
            downloadButton.className = 'download-button';
            downloadButton.addEventListener('click', function() {
                const a = document.createElement('a');
                a.href = url;
                a.download = 'upscaled_image'; // Modify as needed
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            downloadButtonContainer.appendChild(downloadButton);
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Failed to upscale the image. ' + err.message);
            notification.style.display = 'none'; // Hide processing notification
        });
    });
});




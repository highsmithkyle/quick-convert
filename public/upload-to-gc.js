document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadFormGC');
    const statusDiv = document.getElementById('uploadStatus');

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(form);
        statusDiv.innerHTML = 'Uploading...';

        fetch('/upload-to-gc', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            statusDiv.innerHTML = `Upload successful: ${data.message}`;
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            statusDiv.innerHTML = 'Upload failed. Please try again.';
        });
    });
});

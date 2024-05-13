document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const imageInput = document.getElementById('image');

    // Display uploaded image immediately if a file is selected
    if (imageInput.files && imageInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('uploadedImage').src = event.target.result;
        };
        reader.readAsDataURL(imageInput.files[0]);
    }

    // Send the image to the server for background removal
    fetch('/remove-background', {
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
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Failed to process the image. ' + err.message);
    });
});

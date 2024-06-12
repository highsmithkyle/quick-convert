document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('disparityForm');
    const processingNotification = document.getElementById('processingNotification');
    const resultImage = document.getElementById('resultImage');
    const errorContainer = document.createElement('p');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        processingNotification.style.display = 'block';
        resultImage.style.display = 'none';
        errorContainer.textContent = ''; // Clear previous errors

        fetch('/create-disparity-map', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => throw new Error(err.message));
            }
            return response.blob();
        })
        .then(blob => {
            processingNotification.style.display = 'none';
            const url = URL.createObjectURL(blob);
            resultImage.onload = function() {
                URL.revokeObjectURL(url);
            };
            resultImage.src = url;
            resultImage.style.display = 'block';
        })
        .catch(err => {
            processingNotification.style.display = 'none';
            console.error('Error:', err);
            errorContainer.textContent = `Failed to create the disparity map: ${err.message}`;
            form.appendChild(errorContainer);
        });
    });
});

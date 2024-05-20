// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const uploadForm = document.getElementById('uploadForm');
//     const notification = document.getElementById('processingNotification');
//     const downloadButtonContainer = document.getElementById('downloadButtonContainer');

//     imageInput.addEventListener('change', function() {
//         if (this.files && this.files[0]) {
//             var reader = new FileReader();
//             reader.onload = function(e) {
//                 const uploadedImage = document.getElementById('uploadedImage');
//                 uploadedImage.src = e.target.result;
//                 uploadedImage.style.width = 'auto'; // Ensure width is set to auto
//                 uploadedImage.style.height = 'auto'; // Ensure height is set to auto
//             };
//             reader.readAsDataURL(this.files[0]);
//         }
//     });

//     uploadForm.addEventListener('submit', function(e) {
//         e.preventDefault();
//         const formData = new FormData(this);

//         notification.style.display = 'block'; // Show processing notification
//         fetch('/remove-background', {
//             method: 'POST',
//             body: formData,
//         })
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Server responded with ' + response.status);
//             }
//             return response.blob();
//         })
//         .then(blob => {
//             const url = window.URL.createObjectURL(blob);
//             const processedImage = document.getElementById('processedImage');
//             processedImage.src = url;
//             processedImage.style.width = 'auto'; // Ensure width is set to auto
//             processedImage.style.height = 'auto'; // Ensure height is set to auto
//             notification.style.display = 'none'; // Hide processing notification

//             // Clear existing download button if any
//             downloadButtonContainer.innerHTML = ''; 

//             // Create and append the download button
//             const downloadButton = document.createElement('button');
//             downloadButton.textContent = 'Download Image';
//             downloadButton.className = 'download-button';
//             downloadButton.addEventListener('click', function() {
//                 const a = document.createElement('a');
//                 a.href = url;
//                 a.download = 'background_removed.png'; // Assuming PNG format
//                 document.body.appendChild(a);
//                 a.click();
//                 document.body.removeChild(a);
//             });

//             downloadButtonContainer.appendChild(downloadButton);
//         })
//         .catch(err => {
//             console.error('Error:', err);
//             alert('Failed to process the image. ' + err.message);
//             notification.style.display = 'none'; // Hide processing notification
//         });
//     });
// });


document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const uploadForm = document.getElementById('uploadForm');
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

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        notification.style.display = 'block'; // Show processing notification
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
                a.download = 'background_removed.png'; // Assuming PNG format
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            downloadButtonContainer.appendChild(downloadButton);
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Failed to process the image. ' + err.message);
            notification.style.display = 'none'; // Hide processing notification
        });
    });
});


// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const uploadForm = document.getElementById('uploadForm');

//     // Event listener to handle image uploads
//     imageInput.addEventListener('change', function() {
//         if (this.files && this.files[0]) {
//             var reader = new FileReader();
//             reader.onload = function(e) {
//                 document.getElementById('uploadedImage').src = e.target.result;
//             };
//             reader.readAsDataURL(this.files[0]);
//         }
//     });

//     // Event listener to handle form submission
//     uploadForm.addEventListener('submit', function(e) {
//         e.preventDefault();
//         const formData = new FormData(this);

//         // Send the image to the server for background removal
//         fetch('/remove-background', {
//             method: 'POST',
//             body: formData,
//         })
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Server responded with ' + response.status);
//             }
//             return response.blob();
//         })
//         .then(blob => {
//             const url = window.URL.createObjectURL(blob);
//             document.getElementById('processedImage').src = url;
//         })
//         .catch(err => {
//             console.error('Error:', err);
//             alert('Failed to process the image. ' + err.message);
//         });
//     });
// });


//new
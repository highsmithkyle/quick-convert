document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('video');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const webPImage = document.getElementById('webpImage');
    const convertButton = document.getElementById('convertToWebPButton');
    const notification = document.getElementById('processingNotification');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

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

        fetch('/convertToWebP', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                notification.style.display = 'none';
                webPImage.src = URL.createObjectURL(blob);
                webPImage.style.display = 'block';

                downloadButtonContainer.innerHTML = '';  // Clear previous buttons if any

                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download WebP';
                downloadButton.className = 'download-button';

                const fileSizeInBytes = blob.size;
                const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2); // Convert to MB
                const fileSizeText = document.createTextNode(` (${fileSizeInMB} MB)`);

                downloadButton.addEventListener('click', function() {
                    const a = document.createElement('a');
                    a.href = webPImage.src;
                    a.download = 'converted_image.webp';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });

                downloadButtonContainer.appendChild(downloadButton);
                downloadButtonContainer.appendChild(fileSizeText);
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to convert to WebP:', error);
            });
    });
});


// document.addEventListener('DOMContentLoaded', function() {
//     const videoInput = document.getElementById('video');
//     const uploadedVideo = document.getElementById('uploadedVideo');
//     const webPImage = document.getElementById('webpImage');
//     const convertButton = document.getElementById('convertToWebPButton');
//     const notification = document.getElementById('processingNotification');
//     const downloadButtonContainer = document.getElementById('webpDownloadButtonContainer');

//     videoInput.addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (file) {
//             uploadedVideo.src = URL.createObjectURL(file);
//             uploadedVideo.parentElement.style.display = 'block';
//         }
//     });

//     convertButton.addEventListener('click', function() {
//         if (!uploadedVideo.src || videoInput.files.length === 0) {
//             console.log('No video has been uploaded.');
//             return;
//         }

//         notification.style.display = 'block';
//         const formData = new FormData();
//         formData.append('video', videoInput.files[0]);

//         fetch('/convertToWebP', { method: 'POST', body: formData })
//             .then(response => response.blob())
//             .then(blob => {
//                 notification.style.display = 'none';
//                 const objectURL = URL.createObjectURL(blob);
//                 webPImage.src = objectURL;
//                 webPImage.style.display = 'block';

//                 downloadButtonContainer.innerHTML = ''; // Clear previous buttons if any
//                 const downloadButton = document.createElement('button');
//                 downloadButton.textContent = 'Download WebP';
//                 downloadButton.className = 'download-button';
//                 downloadButton.addEventListener('click', function() {
//                     const a = document.createElement('a');
//                     a.href = objectURL;
//                     a.download = 'converted_image.webp';
//                     document.body.appendChild(a);
//                     a.click();
//                     document.body.removeChild(a);
//                 });

//                 const fileSizeInBytes = blob.size;
//                 const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//                 const fileSizeSpan = document.createElement('span');
//                 fileSizeSpan.className = 'file-size';
//                 fileSizeSpan.textContent = ` (${fileSizeInMB} MB)`;

//                 downloadButtonContainer.appendChild(downloadButton);
//                 downloadButtonContainer.appendChild(fileSizeSpan);
//             })
//             .catch((error) => {
//                 notification.style.display = 'none';
//                 console.error('Failed to convert to WebP:', error);
//             });
//     });
// });

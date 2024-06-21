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
        const formData = new FormData();
        formData.append('file', imageInput.files[0]);

        fetch('/upload-to-gc', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.url) {
                    // Assuming the result presigned URL is also required from the server or preset
                    const resultPresignedUrl = '<RESULT_PRESIGNED_URL>'; // You need to provide or generate this
                    return fetch('/2d-to-3d', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            inputImageUrl: data.url,
                            resultPresignedUrl
                        })
                    });
                } else {
                    throw new Error('Failed to upload image to Google Cloud.');
                }
            })
            .then(response => response.json())
            .then(data => {
                notification.style.display = 'none';
                if (data.resultUrl) {
                    const objectURL = data.resultUrl;
                    converted3DImageElement.src = objectURL;
                    converted3DImageElement.style.display = 'block';

                    const downloadButton = document.createElement('button');
                    downloadButton.textContent = 'Download Converted 3D Image';
                    downloadButton.className = 'download-button';
                    downloadButton.addEventListener('click', function() {
                        const a = document.createElement('a');
                        a.href = objectURL;
                        a.download = `converted_3D_image.mp4`; // Assuming the result is a video
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    });
                    downloadButtonContainer.innerHTML = '';
                    downloadButtonContainer.appendChild(downloadButton);
                }
            })
            .catch((error) => {
                notification.style.display = 'none';
                console.error('Failed to convert image:', error);
            });
    });
});



// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const uploadedImage = document.getElementById('uploadedImage');
//     const converted3DImageElement = document.getElementById('converted3DImage');
//     const convertImageButton = document.getElementById('convertImageButton');
//     const notification = document.getElementById('processingNotification');
//     const downloadButtonContainer = document.getElementById('downloadButtonContainer');

//     imageInput.addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (file) {
//             uploadedImage.src = URL.createObjectURL(file);
//             uploadedImage.parentElement.style.display = 'block';
//         }
//     });

//     convertImageButton.addEventListener('click', function() {
//         if (!uploadedImage.src || imageInput.files.length === 0) {
//             console.log('No image has been uploaded.');
//             return;
//         }

//         notification.style.display = 'block';
//         const originalFileName = imageInput.files[0].name.split('.')[0];

//         const formData = new FormData();
//         formData.append('image', imageInput.files[0]);

//         fetch('/create-disparity-map', { method: 'POST', body: formData })
//             .then(response => response.blob())
//             .then(blob => {
//                 notification.style.display = 'none';
//                 const objectURL = URL.createObjectURL(blob);
//                 converted3DImageElement.src = objectURL;
//                 converted3DImageElement.style.display = 'block';

//                 const downloadButton = document.createElement('button');
//                 downloadButton.textContent = 'Download Converted 3D Image';
//                 downloadButton.className = 'download-button';
//                 downloadButton.addEventListener('click', function() {
//                     const a = document.createElement('a');
//                     a.href = objectURL;
//                     a.download = `${originalFileName}_3D.png`;
//                     document.body.appendChild(a);
//                     a.click();
//                     document.body.removeChild(a);
//                 });
//                 downloadButtonContainer.innerHTML = '';
//                 downloadButtonContainer.appendChild(downloadButton);
//             })
//             .catch((error) => {
//                 notification.style.display = 'none';
//                 console.error('Failed to convert image:', error);
//             });
//     });
// });

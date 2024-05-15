// document.addEventListener('DOMContentLoaded', function() {
//     const form = document.getElementById('slicerForm');
//     const uploadedVideo = document.getElementById('uploadedVideo');
//     const videoInput = document.querySelector('input[type="file"]');
//     const notification = document.getElementById('processingNotification');
//     const createOverlayButton = document.getElementById('createOverlayButton'); 

//     videoInput.addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (file) {
//             uploadedVideo.src = URL.createObjectURL(file);
//             uploadedVideo.parentElement.style.display = 'block';
//         }
//     });

//     if (createOverlayButton) {
//         createOverlayButton.addEventListener('click', function() {
//             if (!uploadedVideo.src || !videoInput.files.length) {
//                 console.log('No uploaded video available.');
//                 return;
//             }
//             notification.style.display = 'block';
//             const color = document.getElementById('overlayColor').value;
//             const opacity = document.getElementById('overlayOpacity').value;
//             const formData = new FormData();
//             formData.append('video', videoInput.files[0]); // Use the input directly
//             formData.append('color', color);
//             formData.append('opacity', opacity);
    
//             fetch('/overlay', { method: 'POST', body: formData })
//                 .then(response => response.blob())
//                 .then(blob => {
//                     notification.style.display = 'none';
//                     const overlayVideo = document.getElementById('overlayVideo');
//                     overlayVideo.src = URL.createObjectURL(blob);
//                     overlayVideo.style.display = 'block';
//                 })
//                 .catch((error) => {
//                     notification.style.display = 'none';
//                     console.log('Failed to create overlay.', error);
//                 });
//         });
//     }
// });


document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('video');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const overlayVideo = document.getElementById('colorOverlayVideo');
    const createOverlayButton = document.getElementById('createOverlayButton');
    const notification = document.getElementById('processingNotification');
    const downloadButtonContainer = document.getElementById('downloadButtonContainer');

    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    createOverlayButton.addEventListener('click', function() {
        if (!uploadedVideo.src || videoInput.files.length === 0) {
            console.log('No video has been uploaded.');
            return;
        }
        notification.style.display = 'block';
        const color = document.getElementById('overlayColor').value;
        const opacity = document.getElementById('overlayOpacity').value;
        const originalFileName = videoInput.files[0].name.split('.')[0]; 
        
        const formData = new FormData();
        formData.append('video', videoInput.files[0]);
        formData.append('color', color);
        formData.append('opacity', opacity);

        fetch('/overlay', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onload = function() {
                    const dataUrl = reader.result;
                    notification.style.display = 'none';
                    overlayVideo.src = dataUrl;
                    overlayVideo.style.display = 'block';

                    const downloadButton = document.createElement('button');
                    downloadButton.textContent = 'Download Video';
                    downloadButton.className = 'download-button';
                    downloadButton.addEventListener('click', function() {
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = originalFileName + '_colored-overlay.mp4';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    });
                    downloadButtonContainer.innerHTML = '';
                    downloadButtonContainer.appendChild(downloadButton);
                };
                reader.readAsDataURL(blob);
            })
            .catch((error) => {
                notification.style.display = 'none';
                console.error('Failed to create color overlay:', error);
            });
    });
});

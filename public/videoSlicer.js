// document.addEventListener('DOMContentLoaded', function() {
//     const uploadFormVideo = document.getElementById('uploadFormVideo');
//     const videoInput = document.getElementById('video');
//     const uploadedVideo = document.getElementById('uploadedVideo');
//     const subtitledVideo = document.getElementById('subtitledVideo');
//     const transcript = document.getElementById('transcript');
//     const processingNotification = document.getElementById('processingNotification');
//     const videoContainer = document.getElementById('videoContainer');

//     videoInput.addEventListener('change', function() {
//         const file = videoInput.files[0];
//         if (file) {
//             uploadedVideo.src = URL.createObjectURL(file);
//             uploadedVideo.load();
//             uploadedVideo.onloadeddata = function() {
//                 uploadedVideo.parentElement.style.display = 'block';
//             };
//         }
//     });

//     uploadFormVideo.addEventListener('submit', function(event) {
//         event.preventDefault();
//         if (!videoInput.files[0]) {
//             alert('Please select a video file to upload.');
//             return;
//         }

//         processingNotification.style.display = 'block';
//         const formData = new FormData();
//         formData.append('video', videoInput.files[0]);

//         fetch('/transcribe-video', {
//             method: 'POST',
//             body: formData,
//         }).then(response => response.json())
//         .then(data => {
//             processingNotification.style.display = 'none';
//             console.log('Server response:', data);
//             if (data.message === 'Video processed with subtitles' && data.videoUrl) {
//                 subtitledVideo.src = data.videoUrl;
//                 subtitledVideo.load();
//                 subtitledVideo.onloadeddata = function() {
//                     subtitledVideo.style.display = 'block';
//                     transcript.textContent = 'Transcription and subtitles should be visible in the video player.';
//                 };
//             } else {
//                 transcript.textContent = 'No transcription available or video not processed.';
//             }
//         }).catch(error => {
//             processingNotification.style.display = 'none';
//             console.error('Fetch error:', error);
//             transcript.textContent = 'Failed to transcribe video.';
//         });
//     });
// });

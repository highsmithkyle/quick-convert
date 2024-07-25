document.addEventListener("DOMContentLoaded", function () {
  const videoInput = document.getElementById("video");
  const uploadedVideo = document.getElementById("uploadedVideo");
  const overlayVideo = document.getElementById("colorOverlayVideo");
  const createOverlayButton = document.getElementById("createOverlayButton");
  const notification = document.getElementById("processingNotification");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");

  const colorPicker = document.getElementById("overlayColor");
  const opacitySlider = document.getElementById("overlayOpacity");

  let uploadedFile = null;

  videoInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedFile = file;
      uploadedVideo.src = URL.createObjectURL(file);
      uploadedVideo.parentElement.style.display = "block";
      updatePreview();
    }
  });

  colorPicker.addEventListener("input", updatePreview);
  opacitySlider.addEventListener("input", updatePreview);

  function updatePreview() {
    if (!uploadedFile) {
      return;
    }

    const color = colorPicker.value;
    const opacity = opacitySlider.value;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const video = uploadedVideo;
    video.addEventListener("loadedmetadata", function () {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    video.addEventListener("play", function () {
      const draw = () => {
        if (!video.paused && !video.ended) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          context.fillStyle = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${opacity})`;
          context.fillRect(0, 0, canvas.width, canvas.height);
          overlayVideo.src = canvas.toDataURL("image/png");
          requestAnimationFrame(draw);
        }
      };
      draw();
    });
  }

  createOverlayButton.addEventListener("click", function () {
    if (!uploadedVideo.src || !uploadedFile) {
      console.log("No video has been uploaded.");
      return;
    }
    notification.style.display = "block";
    const color = colorPicker.value;
    const opacity = opacitySlider.value;
    const originalFileName = uploadedFile.name.split(".")[0];

    const formData = new FormData();
    formData.append("video", uploadedFile);
    formData.append("color", color);
    formData.append("opacity", opacity);

    fetch("/overlay", { method: "POST", body: formData })
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = function () {
          const dataUrl = reader.result;
          notification.style.display = "none";
          overlayVideo.src = dataUrl;
          overlayVideo.style.display = "block";

          const downloadButton = document.createElement("button");
          downloadButton.textContent = "Download Video";
          downloadButton.className = "download-button";
          downloadButton.addEventListener("click", function () {
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = originalFileName + "_colored-overlay.mp4";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
          downloadButtonContainer.innerHTML = "";
          downloadButtonContainer.appendChild(downloadButton);
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error("Failed to create color overlay:", error);
      });
  });
});

// document.addEventListener('DOMContentLoaded', function() {
//     const videoInput = document.getElementById('video');
//     const uploadedVideo = document.getElementById('uploadedVideo');
//     const overlayVideo = document.getElementById('colorOverlayVideo');
//     const createOverlayButton = document.getElementById('createOverlayButton');
//     const notification = document.getElementById('processingNotification');
//     const downloadButtonContainer = document.getElementById('downloadButtonContainer');

//     videoInput.addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (file) {
//             uploadedVideo.src = URL.createObjectURL(file);
//             uploadedVideo.parentElement.style.display = 'block';
//         }
//     });

//     createOverlayButton.addEventListener('click', function() {
//         if (!uploadedVideo.src || videoInput.files.length === 0) {
//             console.log('No video has been uploaded.');
//             return;
//         }
//         notification.style.display = 'block';
//         const color = document.getElementById('overlayColor').value;
//         const opacity = document.getElementById('overlayOpacity').value;
//         const originalFileName = videoInput.files[0].name.split('.')[0];

//         const formData = new FormData();
//         formData.append('video', videoInput.files[0]);
//         formData.append('color', color);
//         formData.append('opacity', opacity);

//         fetch('/overlay', { method: 'POST', body: formData })
//             .then(response => response.blob())
//             .then(blob => {
//                 const reader = new FileReader();
//                 reader.onload = function() {
//                     const dataUrl = reader.result;
//                     notification.style.display = 'none';
//                     overlayVideo.src = dataUrl;
//                     overlayVideo.style.display = 'block';

//                     const downloadButton = document.createElement('button');
//                     downloadButton.textContent = 'Download Video';
//                     downloadButton.className = 'download-button';
//                     downloadButton.addEventListener('click', function() {
//                         const a = document.createElement('a');
//                         a.href = dataUrl;
//                         a.download = originalFileName + '_colored-overlay.mp4';
//                         document.body.appendChild(a);
//                         a.click();
//                         document.body.removeChild(a);
//                     });
//                     downloadButtonContainer.innerHTML = '';
//                     downloadButtonContainer.appendChild(downloadButton);
//                 };
//                 reader.readAsDataURL(blob);
//             })
//             .catch((error) => {
//                 notification.style.display = 'none';
//                 console.error('Failed to create color overlay:', error);
//             });
//     });
// });

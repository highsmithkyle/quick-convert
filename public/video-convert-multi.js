document.addEventListener("DOMContentLoaded", function () {
  const videoInput = document.getElementById("videoInput");
  const uploadedVideo = document.getElementById("uploadedVideo");
  const convertedMedia = document.getElementById("convertedMedia");
  const notification = document.getElementById("processingNotification");
  const convertButton = document.getElementById("convertButton");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");
  const formatSelect = document.getElementById("formatSelect");
  const trimModal = document.getElementById("trimModal");
  const trimStartInput = document.getElementById("trimStart");
  const trimEndInput = document.getElementById("trimEnd");
  const trimConfirmButton = document.getElementById("trimConfirmButton");
  const trimCancelButton = document.getElementById("trimCancelButton");

  let isLargeFile = false;
  let selectedFile = null;
  let trimmedFile = null;
  let trimStart = 0;
  let trimEnd = 0;

  videoInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      selectedFile = file;
      const fileSizeMB = file.size / (1024 * 1024);
      const maxSizeMB = 20; // Set your desired max size in MB

      uploadedVideo.src = URL.createObjectURL(file);
      uploadedVideo.parentElement.style.display = "block";

      uploadedVideo.addEventListener(
        "loadedmetadata",
        function () {
          trimEnd = Math.floor(uploadedVideo.duration);
          trimEndInput.value = trimEnd;
          trimEndInput.max = trimEnd;
          trimStartInput.max = trimEnd;

          if (fileSizeMB > maxSizeMB) {
            isLargeFile = true;
            trimModal.classList.add("show");
          } else {
            isLargeFile = false;
          }
        },
        { once: true }
      );
    }
  });

  trimConfirmButton.addEventListener("click", function () {
    trimStart = parseInt(trimStartInput.value) || 0;
    trimEnd = parseInt(trimEndInput.value) || Math.floor(uploadedVideo.duration);

    if (trimEnd <= trimStart) {
      alert("End time must be greater than start time.");
      return;
    }

    // Send the video and trimming parameters to the server to get the trimmed video
    const formData = new FormData();
    formData.append("video", selectedFile, selectedFile.name);
    formData.append("trimStart", trimStart);
    formData.append("trimEnd", trimEnd);

    fetch("/trimVideo", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.blob())
      .then((trimmedBlob) => {
        trimmedFile = new File([trimmedBlob], "trimmed_" + selectedFile.name, {
          type: selectedFile.type,
        });
        uploadedVideo.src = URL.createObjectURL(trimmedFile);
        selectedFile = trimmedFile; // Update selectedFile to the trimmed version
        trimModal.classList.remove("show");
      })
      .catch((error) => {
        console.error("Error trimming video:", error);
        alert("An error occurred while trimming the video.");
        trimModal.classList.remove("show");
      });
  });

  trimCancelButton.addEventListener("click", function () {
    videoInput.value = "";
    selectedFile = null;
    uploadedVideo.src = "";
    uploadedVideo.parentElement.style.display = "none";
    trimModal.classList.remove("show");
  });

  convertButton.addEventListener("click", function () {
    if (!uploadedVideo.src) {
      console.log("No video available to convert.");
      return;
    }

    const selectedFormat = formatSelect.value;
    notification.style.display = "block";

    const formData = new FormData();
    formData.append("video", selectedFile, selectedFile.name);

    let endpoint = "";
    switch (selectedFormat) {
      case "mp4":
        endpoint = "/convertToMp4";
        break;
      case "gif":
        endpoint = "/convertToGif";
        break;
      case "avif":
        endpoint = "/convertToAvif";
        break;
      case "webm":
        endpoint = "/convertToWebm";
        break;
    }

    fetch(endpoint, { method: "POST", body: formData })
      .then((response) => {
        const contentType = response.headers.get("content-type");
        return response.blob().then((blob) => ({ blob, contentType }));
      })
      .then(({ blob, contentType }) => {
        notification.style.display = "none";

        convertedMedia.innerHTML = "";

        if (contentType === "image/gif") {
          const gifImage = new Image();
          gifImage.src = URL.createObjectURL(blob);
          gifImage.style.width = "100%";
          convertedMedia.appendChild(gifImage);
        } else {
          const videoElement = document.createElement("video");
          videoElement.src = URL.createObjectURL(blob);
          videoElement.controls = true;
          videoElement.style.width = "100%";
          convertedMedia.appendChild(videoElement);
        }

        downloadButtonContainer.innerHTML = "";
        const downloadButton = document.createElement("button");
        downloadButton.textContent = `Download ${formatSelect.options[formatSelect.selectedIndex].text.toUpperCase()}`;
        downloadButton.className = "download-button";

        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        const fileSizeSpan = document.createElement("span");
        fileSizeSpan.className = "file-size";
        fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;

        downloadButtonContainer.appendChild(downloadButton);
        downloadButtonContainer.appendChild(fileSizeSpan);

        downloadButton.addEventListener("click", function () {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `converted_video.${selectedFormat}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error(`Failed to convert to ${selectedFormat.toUpperCase()}:`, error);
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const videoInput = document.getElementById("videoInput");
//   const uploadedVideo = document.getElementById("uploadedVideo");
//   const convertedMedia = document.getElementById("convertedMedia");
//   const notification = document.getElementById("processingNotification");
//   const convertButton = document.getElementById("convertButton");
//   const downloadButtonContainer = document.getElementById("downloadButtonContainer");
//   const formatSelect = document.getElementById("formatSelect");

//   videoInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       uploadedVideo.src = URL.createObjectURL(file);
//       uploadedVideo.parentElement.style.display = "block";
//     }
//   });

//   convertButton.addEventListener("click", function () {
//     if (!uploadedVideo.src) {
//       console.log("No video available to convert.");
//       return;
//     }

//     const selectedFormat = formatSelect.value;
//     notification.style.display = "block";

//     fetch(uploadedVideo.src)
//       .then((response) => response.blob())
//       .then((blob) => {
//         const formData = new FormData();
//         formData.append("video", blob, "final.mp4");

//         let endpoint = "";
//         switch (selectedFormat) {
//           case "mp4":
//             endpoint = "/convertToMp4";
//             break;
//           case "gif":
//             endpoint = "/convertToGif";
//             break;
//           case "avif":
//             endpoint = "/convertToAvif";
//             break;
//           case "webm":
//             endpoint = "/convertToWebm";
//             break;
//         }

//         return fetch(endpoint, { method: "POST", body: formData });
//       })
//       .then((response) => {
//         const contentType = response.headers.get("content-type");
//         return response.blob().then((blob) => ({ blob, contentType }));
//       })
//       .then(({ blob, contentType }) => {
//         notification.style.display = "none";

//         // Clear previous content
//         convertedMedia.innerHTML = "";

//         if (contentType === "image/gif") {
//           // Handle GIF
//           const gifImage = new Image();
//           gifImage.src = URL.createObjectURL(blob);
//           gifImage.style.width = "100%"; // Match the video element's width
//           convertedMedia.appendChild(gifImage);
//         } else {
//           // Handle video formats
//           const videoElement = document.createElement("video");
//           videoElement.src = URL.createObjectURL(blob);
//           videoElement.controls = true;
//           videoElement.style.width = "100%"; // Match the existing container width
//           convertedMedia.appendChild(videoElement);
//         }

//         // Create and append the download button
//         downloadButtonContainer.innerHTML = ""; // Clear any previous buttons
//         const downloadButton = document.createElement("button");
//         downloadButton.textContent = `Download ${formatSelect.options[formatSelect.selectedIndex].text.toUpperCase()}`;
//         downloadButton.className = "download-button";

//         const fileSizeInBytes = blob.size;
//         const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2); // convert to megabytes
//         const fileSizeSpan = document.createElement("span");
//         fileSizeSpan.className = "file-size";
//         fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;

//         downloadButtonContainer.appendChild(downloadButton);
//         downloadButtonContainer.appendChild(fileSizeSpan);

//         downloadButton.addEventListener("click", function () {
//           const a = document.createElement("a");
//           a.href = URL.createObjectURL(blob);
//           a.download = `converted_video.${selectedFormat}`;
//           document.body.appendChild(a);
//           a.click();
//           document.body.removeChild(a);
//         });
//       })
//       .catch((error) => {
//         notification.style.display = "none";
//         console.error(`Failed to convert to ${selectedFormat.toUpperCase()}:`, error);
//       });
//   });
// });

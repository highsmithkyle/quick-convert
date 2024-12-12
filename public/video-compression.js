document.addEventListener("DOMContentLoaded", function () {
  const videoInput = document.getElementById("video");
  const uploadFormVideoCompression = document.getElementById("uploadFormVideoCompression");
  const crf = document.getElementById("crf");
  const crfDisplay = document.getElementById("crf_display");
  const compressionOptionsSection = document.getElementById("compressionOptionsSection");

  const preset = document.getElementById("preset");
  const scaleWidth = document.getElementById("scaleWidth");

  const processingNotification = document.getElementById("processingNotification");

  const uploadedVideoDimensions = document.getElementById("uploadedVideoDimensions");
  const uploadedVideoSize = document.getElementById("uploadedVideoSize");
  const compressedVideoDimensions = document.getElementById("compressedVideoDimensions");
  const compressedVideoSize = document.getElementById("compressedVideoSize");

  const uploadedVideo = document.getElementById("uploadedVideo");
  const processedVideo = document.getElementById("processedVideo");

  const inlineDownloadButton = document.getElementById("inlineDownloadButton");
  const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");

  const progressSection = document.getElementById("progressSection");
  const progressBar = document.getElementById("progressBar");
  const progressMessage = document.getElementById("progressMessage"); // New element for messages
  const errorMessage = document.getElementById("errorMessage");

  let originalFileName = "";

  // Initialize Socket.io
  const socket = io();

  // Store the socket ID
  let socketId = "";

  socket.on("connect", () => {
    socketId = socket.id;
    console.log("Connected to server with socket ID:", socketId);
  });

  socket.on("compressionProgress", (data) => {
    const { percentage, message } = data;
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage}%`;
    progressMessage.textContent = message;

    if (percentage >= 100) {
      progressBar.style.width = `100%`;
      progressBar.textContent = `100%`;
      progressMessage.textContent = "Compression completed successfully.";
    }
  });

  socket.on("compressionComplete", (data) => {
    const { message } = data;
    console.log(message);
    progressSection.style.display = "none";
    processingNotification.style.display = "none";
    // The server already sends the file via HTTP response
    // Additional actions can be handled here if needed
  });

  socket.on("compressionError", (data) => {
    const { message } = data;
    console.error("Compression Error:", message);
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    processingNotification.style.display = "none";
    progressSection.style.display = "none";
  });

  function updateCRFDisplay(value) {
    crfDisplay.textContent = value;
  }

  // Update CRF display as the slider moves
  crf.addEventListener("input", function () {
    updateCRFDisplay(this.value);
  });

  videoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();

      originalFileName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      processedVideo.src = "";
      compressedVideoSize.textContent = "";
      compressedVideoDimensions.textContent = "";
      inlineDownloadButtonContainer.style.display = "none";

      errorMessage.style.display = "none";
      progressBar.style.width = `0%`;
      progressBar.textContent = `0%`;
      progressMessage.textContent = "";

      reader.onload = function (e) {
        const video = document.getElementById("uploadedVideo");
        video.src = e.target.result;
        video.load();
        video.onloadedmetadata = function () {
          const originalWidth = video.videoWidth;
          const originalHeight = video.videoHeight;

          const fileSizeInBytes = file.size;
          const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

          uploadedVideoDimensions.textContent = `${originalWidth}x${originalHeight}px`;
          uploadedVideoSize.textContent = `(${fileSizeInMB} MB)`;

          compressionOptionsSection.style.display = "block";

          // Reset compression options
          crf.value = 20;
          updateCRFDisplay(20);
          preset.value = "slow"; // Match server default
          scaleWidth.value = originalWidth >= 1280 ? 1280 : originalWidth;
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormVideoCompression.addEventListener("submit", function (e) {
    e.preventDefault();
    const file = videoInput.files[0];
    if (!file) {
      alert("Please select a video file to compress.");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);
    formData.append("crf", crf.value);
    formData.append("preset", preset.value);
    formData.append("scaleWidth", scaleWidth.value);
    formData.append("socketId", socketId); // Include socket ID

    processingNotification.style.display = "block";
    progressSection.style.display = "block";
    progressBar.style.width = `0%`;
    progressBar.textContent = `0%`;
    progressMessage.textContent = "Starting compression...";
    errorMessage.style.display = "none";

    fetch("/compress-video", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Server responded with " + response.status);
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        processedVideo.src = url;
        processedVideo.load();
        processedVideo.onloadedmetadata = function () {
          const compressedWidth = processedVideo.videoWidth;
          const compressedHeight = processedVideo.videoHeight;
          const compressedSizeInBytes = blob.size;
          const compressedSizeInMB = (compressedSizeInBytes / (1024 * 1024)).toFixed(2);

          compressedVideoDimensions.textContent = `${compressedWidth}x${compressedHeight}px`;
          compressedVideoSize.textContent = `(${compressedSizeInMB} MB)`;

          inlineDownloadButtonContainer.style.display = "inline";
          inlineDownloadButton.href = url;
          inlineDownloadButton.download = `${originalFileName}_compressed.mp4`;
        };
        processingNotification.style.display = "none";
      })
      .catch((err) => {
        console.error("Compression Error:", err);
        alert("Failed to compress the video. Please ensure the video format is correct and try again.");
        processingNotification.style.display = "none";
        progressSection.style.display = "none";
      });
  });
});

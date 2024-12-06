document.addEventListener("DOMContentLoaded", function () {
  const videoInput = document.getElementById("video");
  const uploadFormVideoCompression = document.getElementById("uploadFormVideoCompression");
  const crf = document.getElementById("crf");
  const crfDisplay = document.getElementById("crf_display");
  const compressionOptionsSection = document.getElementById("compressionOptionsSection");

  const preset = document.getElementById("preset");
  const scaleWidth = document.getElementById("scaleWidth");
  // Removed: const scaleHeight = document.getElementById("scaleHeight");

  const processingNotification = document.getElementById("processingNotification");

  const uploadedVideoDimensions = document.getElementById("uploadedVideoDimensions");
  const uploadedVideoSize = document.getElementById("uploadedVideoSize");
  const compressedVideoDimensions = document.getElementById("compressedVideoDimensions");
  const compressedVideoSize = document.getElementById("compressedVideoSize");

  const uploadedVideo = document.getElementById("uploadedVideo");
  const processedVideo = document.getElementById("processedVideo");

  const inlineDownloadButton = document.getElementById("inlineDownloadButton");
  const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");

  let originalFileName = "";

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
          crf.value = 28;
          updateCRFDisplay(28);
          preset.value = "medium"; // Match server default
          scaleWidth.value = originalWidth >= 1280 ? 1280 : originalWidth;
          // Removed: scaleHeight.value = originalHeight >= 720 ? 720 : originalHeight;
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormVideoCompression.addEventListener("submit", function (e) {
    e.preventDefault();
    const file = videoInput.files[0];
    const formData = new FormData();
    formData.append("video", file);
    formData.append("crf", crf.value);
    formData.append("preset", preset.value);
    formData.append("scaleWidth", scaleWidth.value);
    // Removed: formData.append("scaleHeight", scaleHeight.value);

    processingNotification.style.display = "block";

    fetch("/compress-video", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        processingNotification.style.display = "none";
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
      })
      .catch((err) => {
        console.error("Compression Error:", err);
        alert("Failed to compress the video. Please ensure the video format is correct and try again.");
        processingNotification.style.display = "none";
      });
  });
});

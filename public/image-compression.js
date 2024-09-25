document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormCompression = document.getElementById("uploadFormCompression");
  const compressionLevel = document.getElementById("compressionLevel");
  const compressionDisplay = document.getElementById("compression_display");
  const qualitySection = document.getElementById("qualitySection");
  const notification = document.getElementById("processingNotification");

  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const compressedImageDimensions = document.getElementById("compressedImageDimensions");
  const compressedImageSize = document.getElementById("compressedImageSize");
  const processedImage = document.getElementById("processedImage");
  const inlineDownloadButton = document.getElementById("inlineDownloadButton");
  const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");

  let originalFileName = "";

  function updateCompressionDisplay(value) {
    compressionDisplay.textContent = `${value}% Compression`;
  }

  compressionLevel.addEventListener("input", function () {
    updateCompressionDisplay(compressionLevel.value);
  });

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();

      originalFileName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      processedImage.src = "";
      compressedImageSize.textContent = "";
      compressedImageDimensions.textContent = "";
      inlineDownloadButtonContainer.style.display = "none";

      reader.onload = function (e) {
        const img = document.getElementById("uploadedImage");
        img.src = e.target.result;
        img.onload = function () {
          const originalWidth = img.naturalWidth;
          const originalHeight = img.naturalHeight;

          const fileSizeInBytes = file.size;
          const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

          uploadedImageDimensions.textContent = `${originalWidth}x${originalHeight}px`;
          uploadedImageSize.textContent = `(${fileSizeInMB} MB)`;

          if (file.type === "image/jpeg" || file.type === "image/webp" || file.type === "image/gif") {
            qualitySection.style.display = "block";
          } else if (file.type === "image/png") {
            qualitySection.style.display = "none";
          }
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormCompression.addEventListener("submit", function (e) {
    e.preventDefault();
    const file = imageInput.files[0];
    const formData = new FormData();
    formData.append("image", file);

    notification.style.display = "block";

    let endpoint;
    if (file.type === "image/jpeg") {
      formData.append("compression_level", 100 - compressionLevel.value);
      endpoint = "/compress-jpeg";
    } else if (file.type === "image/png") {
      formData.append("compression_level", 20);
      endpoint = "/compress-png";
    } else if (file.type === "image/webp") {
      formData.append("compression_level", 100 - compressionLevel.value);
      endpoint = "/compress-webp";
    } else if (file.type === "image/gif") {
      formData.append("compression_level", 100 - compressionLevel.value);
      endpoint = "/compress-gif";
    } else {
      alert("Unsupported file type.");
      notification.style.display = "none";
      return;
    }

    fetch(endpoint, {
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
        processedImage.src = url;

        const compressedFileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
        const img = new Image();
        img.src = url;
        img.onload = function () {
          compressedImageDimensions.textContent = `${img.width}x${img.height}px`;
          compressedImageSize.textContent = `(${compressedFileSizeInMB} MB)`;

          notification.style.display = "none";

          const compressedFileName = `${originalFileName}_compressed.${file.type.split("/")[1]}`;

          inlineDownloadButtonContainer.style.display = "inline";
          inlineDownloadButton.href = url;
          inlineDownloadButton.download = compressedFileName;
        };
      })
      .catch((err) => {
        alert("Failed to compress the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormUpscale = document.getElementById("uploadFormUpscale");
  const notification = document.getElementById("processingNotification");
  const upscalePercentageSlider = document.getElementById("upscale_percentage");
  const percentageDisplay = document.getElementById("percentage_display");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");

  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const croppedImageSize = document.getElementById("croppedImageSize");
  const croppedImageDimensions = document.getElementById("croppedImageDimensions");

  function updatePercentageDisplay(value) {
    percentageDisplay.textContent = value + "%";
  }

  window.updatePercentageDisplay = updatePercentageDisplay;

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        const img = document.getElementById("uploadedImage");
        img.src = e.target.result;
        img.onload = function () {
          const originalWidth = img.naturalWidth;
          const originalHeight = img.naturalHeight;

          const fileSizeInBytes = file.size;
          const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
          uploadedImageSize.textContent = `(${fileSizeInMB} MB)`;
          uploadedImageDimensions.textContent = `${originalWidth}x${originalHeight}px`;

          upscalePercentageSlider.addEventListener("input", function () {
            updatePercentageDisplay(this.value);
          });
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormUpscale.addEventListener("submit", function (e) {
    e.preventDefault();
    const scale = upscalePercentageSlider.value / 100;
    const img = document.getElementById("uploadedImage");

    const scaledWidth = Math.round(img.naturalWidth * scale);
    const scaledHeight = Math.round(img.naturalHeight * scale);

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);
    formData.append("target_width", scaledWidth);
    formData.append("target_height", scaledHeight);

    notification.style.display = "block";

    fetch("/upscale-image", {
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
        const processedImage = document.getElementById("processedImage");
        processedImage.src = url;

        notification.style.display = "none";

        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        croppedImageSize.textContent = `(${fileSizeInMB} MB)`;
        croppedImageDimensions.textContent = `${scaledWidth}x${scaledHeight}px`;

        downloadButtonContainer.innerHTML = "";

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download Upscaled Image";
        downloadButton.classList.add("download-button-sidebar");

        const originalFilename = imageInput.files[0].name;
        const filenameWithoutExtension = originalFilename.replace(/\.[^/.]+$/, "");
        const fileExtension = originalFilename.split(".").pop();
        const newFileName = `${filenameWithoutExtension}_upscaled.${fileExtension}`;

        downloadButton.addEventListener("click", function () {
          const a = document.createElement("a");
          a.href = url;
          a.download = newFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });

        downloadButtonContainer.appendChild(downloadButton);
        downloadButtonContainer.style.display = "block";
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to upscale the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

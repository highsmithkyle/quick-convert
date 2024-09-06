document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormResize = document.getElementById("uploadFormResize");
  const notification = document.getElementById("processingNotification");

  const percentageResize = document.getElementById("percentageResize");
  const dimensionsResize = document.getElementById("dimensionsResize");
  const resizeModeSelect = document.getElementById("resizeMode");

  const resizePercentageSlider = document.getElementById("resize_percentage");
  const resizeWidthInput = document.getElementById("resize_width");
  const resizeHeightInput = document.getElementById("resize_height");
  const percentageDisplay = document.getElementById("percentage_display");

  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const resizedImageDimensions = document.getElementById("resizedImageDimensions");
  const resizedImageSize = document.getElementById("resizedImageSize");
  const processedImage = document.getElementById("processedImage");

  function updatePercentageDisplay(value) {
    percentageDisplay.textContent = value + "%";
  }

  function updateResizeMode() {
    const mode = resizeModeSelect.value;
    if (mode === "percentage") {
      percentageResize.style.display = "block";
      dimensionsResize.style.display = "none";
    } else {
      percentageResize.style.display = "none";
      dimensionsResize.style.display = "block";
    }
  }

  // Update resize mode when dropdown changes
  resizeModeSelect.addEventListener("change", updateResizeMode);

  window.updatePercentageDisplay = updatePercentageDisplay;

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();

      // Reset the resized image and its info
      processedImage.src = "";
      resizedImageDimensions.textContent = "";
      resizedImageSize.textContent = "";

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
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormResize.addEventListener("submit", function (e) {
    e.preventDefault();
    const img = document.getElementById("uploadedImage");
    const mode = resizeModeSelect.value;

    let targetWidth, targetHeight;

    if (mode === "percentage") {
      const scale = resizePercentageSlider.value / 100;
      targetWidth = Math.round(img.naturalWidth * scale);
      targetHeight = Math.round(img.naturalHeight * scale);
    } else if (mode === "dimensions") {
      targetWidth = resizeWidthInput.value || img.naturalWidth;
      targetHeight = resizeHeightInput.value || img.naturalHeight;
    }

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);
    formData.append("target_width", targetWidth);
    formData.append("target_height", targetHeight);

    notification.style.display = "block";

    fetch("/resize-image", {
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

        const resizedFileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
        resizedImageDimensions.textContent = `${targetWidth}x${targetHeight}px`;
        resizedImageSize.textContent = `(${resizedFileSizeInMB} MB)`;
        notification.style.display = "none";
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to resize the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

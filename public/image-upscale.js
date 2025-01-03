document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormUpscale = document.getElementById("uploadFormUpscale");
  const upscaleMethod = document.getElementById("upscaleMethod");
  const targetWidthInput = document.getElementById("targetWidthInput");
  const percentageInput = document.getElementById("percentageInput");
  const upscalePercentageSlider = document.getElementById("upscale_percentage");
  const percentageDisplay = document.getElementById("percentage_display");
  const notification = document.getElementById("processingNotification");

  // Update displayed percentage value
  upscalePercentageSlider.addEventListener("input", function () {
    percentageDisplay.textContent = this.value + "%";
  });

  // Toggle inputs based on the selected upscale method
  function toggleInputs() {
    if (upscaleMethod.value === "targetWidth") {
      targetWidthInput.style.display = "block";
      percentageInput.style.display = "none";
    } else {
      targetWidthInput.style.display = "none";
      percentageInput.style.display = "block";
    }
  }

  // Initialize default input visibility based on upscale method
  toggleInputs();

  // Event listener for selecting the upscale method
  upscaleMethod.addEventListener("change", toggleInputs);

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
          document.getElementById("uploadedImageSize").textContent = `(${fileSizeInMB} MB)`;
          document.getElementById("uploadedImageDimensions").textContent = `${originalWidth}x${originalHeight}px`;
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormUpscale.addEventListener("submit", function (e) {
    e.preventDefault();
    const img = document.getElementById("uploadedImage");

    let scaledWidth, scaledHeight;

    if (upscaleMethod.value === "targetWidth") {
      const targetWidth = document.getElementById("target_width").value;
      const scale = targetWidth / img.naturalWidth;
      scaledWidth = Math.round(img.naturalWidth * scale);
      scaledHeight = Math.round(img.naturalHeight * scale);
    } else {
      const scale = upscalePercentageSlider.value / 100;
      scaledWidth = Math.round(img.naturalWidth * scale);
      scaledHeight = Math.round(img.naturalHeight * scale);
    }

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
        document.getElementById("croppedImageSize").textContent = `(${fileSizeInMB} MB)`;
        document.getElementById("croppedImageDimensions").textContent = `${scaledWidth}x${scaledHeight}px`;
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to upscale the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

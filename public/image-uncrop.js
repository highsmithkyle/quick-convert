document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormUncrop = document.getElementById("uploadFormUncrop");
  const notification = document.getElementById("processingNotification");
  const uncropDownloadButtonContainer = document.getElementById("uncropDownloadButtonContainer");
  const uncropDownloadButton = document.getElementById("uncropDownloadButton");
  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const processedImageDimensions = document.getElementById("processedImageDimensions");
  const processedImageSize = document.getElementById("processedImageSize");
  let uploadedImage = null;
  let originalFileName = "";

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      originalFileName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function () {
          uploadedImage = img;

          const width = img.naturalWidth;
          const height = img.naturalHeight;
          const fileSize = (file.size / (1024 * 1024)).toFixed(2);

          document.getElementById("uploadedImage").src = e.target.result;
          uploadedImageDimensions.textContent = `${width}x${height}px`;
          uploadedImageSize.textContent = `(${fileSize} MB)`;
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormUncrop.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    notification.style.display = "block";

    fetch("/uncrop-image", {
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

        if (processedImage) {
          processedImage.src = url;
        }

        notification.style.display = "none";

        const fileExtension = imageInput.files[0].name.substring(imageInput.files[0].name.lastIndexOf("."));
        const savedFileName = `${originalFileName}_uncropped${fileExtension}`;

        if (uncropDownloadButton) {
          uncropDownloadButton.href = url;
          uncropDownloadButton.download = savedFileName;
        }

        if (uncropDownloadButtonContainer) {
          uncropDownloadButtonContainer.style.display = "inline";
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to uncrop the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

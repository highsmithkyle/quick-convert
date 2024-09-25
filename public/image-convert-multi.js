document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageInput");
  const uploadedImage = document.getElementById("uploadedImage");
  const convertedImage = document.getElementById("convertedImage");
  const notification = document.getElementById("processingNotification");
  const convertButton = document.getElementById("convertButton");
  const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");
  const inlineDownloadButton = document.getElementById("inlineDownloadButton");
  const formatSelect = document.getElementById("formatSelect");

  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const convertedImageDimensions = document.getElementById("convertedImageDimensions");
  const convertedImageSize = document.getElementById("convertedImageSize");

  let originalFileName = "";

  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      originalFileName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      reader.onload = function (e) {
        uploadedImage.src = e.target.result;
        uploadedImage.style.display = "block";

        uploadedImage.onload = function () {
          const originalWidth = uploadedImage.naturalWidth;
          const originalHeight = uploadedImage.naturalHeight;
          const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2); // convert bytes to MB

          uploadedImageDimensions.textContent = `${originalWidth}x${originalHeight}px`;
          uploadedImageSize.textContent = `(${fileSizeInMB} MB)`;
        };
      };
      reader.readAsDataURL(file);
    }
  });

  convertButton.addEventListener("click", function () {
    if (!uploadedImage.src) {
      console.log("No image available to convert.");
      return;
    }

    const selectedFormat = formatSelect.value;
    notification.style.display = "block";

    fetch(uploadedImage.src)
      .then((response) => response.blob())
      .then((blob) => {
        const formData = new FormData();
        formData.append("image", blob, "input_image");

        let endpoint = "";
        switch (selectedFormat) {
          case "png":
            endpoint = "/convertToPng";
            break;
          case "jpeg":
            endpoint = "/convertToJpeg";
            break;
          case "webp":
            endpoint = "/convertToWebP";
            break;
        }

        return fetch(endpoint, { method: "POST", body: formData });
      })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        convertedImage.src = url;
        convertedImage.style.display = "block";

        const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
        const img = new Image();
        img.src = url;
        img.onload = function () {
          convertedImageDimensions.textContent = `${img.width}x${img.height}px`;
          convertedImageSize.textContent = `(${fileSizeInMB} MB)`;
        };

        notification.style.display = "none";

        inlineDownloadButtonContainer.style.display = "inline";
        inlineDownloadButton.href = url;
        const convertedFileName = `${originalFileName}_converted.${selectedFormat}`;
        inlineDownloadButton.download = convertedFileName;

        inlineDownloadButton.textContent = `Download`;
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error(`Failed to convert to ${selectedFormat.toUpperCase()}:`, error);
      });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormResize = document.getElementById("uploadFormResize");
  const notification = document.getElementById("processingNotification");

  const resizeWidthInput = document.getElementById("resize_width");

  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const resizedImageDimensions = document.getElementById("resizedImageDimensions");
  const resizedImageSize = document.getElementById("resizedImageSize");
  const processedImage = document.getElementById("processedImage");
  const inlineDownloadButton = document.getElementById("inlineDownloadButton");
  const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");

  let originalFileName = "";

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();

      originalFileName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      const fileExtension = file.name.substring(file.name.lastIndexOf("."));

      processedImage.src = "";
      resizedImageDimensions.textContent = "";
      resizedImageSize.textContent = "";
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
        };
      };
      reader.readAsDataURL(file);
    }
  });

  uploadFormResize.addEventListener("submit", function (e) {
    e.preventDefault();
    const img = document.getElementById("uploadedImage");

    const targetWidth = resizeWidthInput.value || img.naturalWidth;
    const targetHeight = Math.round((targetWidth / img.naturalWidth) * img.naturalHeight);

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

        const resizedFileName = `${originalFileName}_resized_${targetWidth}${imageInput.files[0].name.substring(imageInput.files[0].name.lastIndexOf("."))}`;

        inlineDownloadButtonContainer.style.display = "inline";
        inlineDownloadButton.href = url;
        inlineDownloadButton.download = resizedFileName;
      })
      .catch((err) => {
        alert("Failed to resize the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

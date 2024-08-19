document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageInput");
  const uploadedImage = document.getElementById("uploadedImage");
  const convertedImage = document.getElementById("convertedImage");
  const notification = document.getElementById("processingNotification");
  const convertButton = document.getElementById("convertButton");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");
  const formatSelect = document.getElementById("formatSelect");

  imageInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedImage.src = URL.createObjectURL(file);
      uploadedImage.style.display = "block";
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
          case "gif":
            endpoint = "/convertToGif";
            break;
          case "webp":
            endpoint = "/convertToWebP";
            break;
        }

        return fetch(endpoint, { method: "POST", body: formData });
      })
      .then((response) => response.blob())
      .then((blob) => {
        notification.style.display = "none";
        convertedImage.src = URL.createObjectURL(blob);
        convertedImage.style.display = "block";

        downloadButtonContainer.innerHTML = "";
        const downloadButton = document.createElement("button");
        downloadButton.textContent = `Download ${formatSelect.options[formatSelect.selectedIndex].text.toUpperCase()}`;
        downloadButton.className = "download-button";

        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2); // convert to megabytes
        const fileSizeSpan = document.createElement("span");
        fileSizeSpan.className = "file-size";
        fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;

        downloadButtonContainer.appendChild(downloadButton);
        downloadButtonContainer.appendChild(fileSizeSpan);

        downloadButton.addEventListener("click", function () {
          const a = document.createElement("a");
          a.href = convertedImage.src;
          a.download = `converted_image.${selectedFormat}`;
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

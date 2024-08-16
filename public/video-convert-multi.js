document.addEventListener("DOMContentLoaded", function () {
  const videoInput = document.getElementById("videoInput");
  const uploadedVideo = document.getElementById("uploadedVideo");
  const convertedImage = document.getElementById("convertedImage");
  const notification = document.getElementById("processingNotification");
  const convertButton = document.getElementById("convertButton");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");
  const formatSelect = document.getElementById("formatSelect");

  videoInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo.src = URL.createObjectURL(file);
      uploadedVideo.parentElement.style.display = "block";
    }
  });

  convertButton.addEventListener("click", function () {
    if (!uploadedVideo.src) {
      console.log("No video available to convert.");
      return;
    }

    const selectedFormat = formatSelect.value;
    notification.style.display = "block";

    fetch(uploadedVideo.src)
      .then((response) => response.blob())
      .then((blob) => {
        const formData = new FormData();
        formData.append("video", blob, "final.mp4");

        let endpoint = "";
        switch (selectedFormat) {
          case "mp4":
            endpoint = "/convertToMp4";
            break;
          case "gif":
            endpoint = "/convertToGif";
            break;
          case "avif":
            endpoint = "/convertToAvif";
            break;
          case "webm":
            endpoint = "/convertToWebm";
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
          a.download = `converted_video.${selectedFormat}`;
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

document.addEventListener("DOMContentLoaded", function () {
  const videoInput = document.getElementById("videoInput");
  const uploadedVideo = document.getElementById("uploadedVideo");
  const gifImage = document.getElementById("gifImage");
  const notification = document.getElementById("processingNotification");
  const convertToGifButton = document.getElementById("convertToGifButton");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");
  videoInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo.src = URL.createObjectURL(file);
      uploadedVideo.parentElement.style.display = "block";
    }
  });

  convertToGifButton.addEventListener("click", function () {
    if (!uploadedVideo.src) {
      console.log("No video available to convert to GIF.");
      return;
    }
    notification.style.display = "block";

    fetch(uploadedVideo.src)
      .then((response) => response.blob())
      .then((blob) => {
        const formData = new FormData();
        formData.append("video", blob, "final.mp4");
        return fetch("/convertToGif", { method: "POST", body: formData });
      })
      .then((response) => response.blob())
      .then((blob) => {
        notification.style.display = "none";
        gifImage.src = URL.createObjectURL(blob);
        gifImage.style.display = "block";

        downloadButtonContainer.innerHTML = "";
        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download GIF";
        downloadButton.className = "download-button";

        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        const fileSizeSpan = document.createElement("span");
        fileSizeSpan.className = "file-size";
        fileSizeSpan.textContent = `(${fileSizeInMB} MB)`;

        downloadButtonContainer.appendChild(downloadButton);
        downloadButtonContainer.appendChild(fileSizeSpan);

        downloadButton.addEventListener("click", function () {
          const a = document.createElement("a");
          a.href = gifImage.src;
          a.download = "converted_image.gif";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error("Failed to convert to GIF:", error);
      });
  });
});

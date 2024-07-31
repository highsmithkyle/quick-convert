document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const aspectRatioSelect = document.getElementById("aspect_ratio");
  const uploadFormUncrop = document.getElementById("uploadFormUncrop");
  const notification = document.getElementById("processingNotification");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");
  let uploadedImage = null;

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("uploadedImage").src = e.target.result;
        const img = new Image();
        img.src = e.target.result;
        img.onload = function () {
          uploadedImage = img;
        };
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  aspectRatioSelect.addEventListener("change", function () {
    if (uploadedImage) {
      const [width, height] = [uploadedImage.naturalWidth, uploadedImage.naturalHeight];
      const ratio = this.value.split(":").map(Number);
      const targetWidth = ratio[0] * (height / ratio[1]);
      const targetHeight = ratio[1] * (width / ratio[0]);

      let extendLeft = 0,
        extendRight = 0,
        extendUp = 0,
        extendDown = 0;

      if (targetWidth > width) {
        extendLeft = Math.round((targetWidth - width) / 2);
        extendRight = extendLeft;
      } else if (targetHeight > height) {
        extendUp = Math.round((targetHeight - height) / 2);
        extendDown = extendUp;
      }

      document.getElementById("extend_left").value = extendLeft;
      document.getElementById("extend_right").value = extendRight;
      document.getElementById("extend_up").value = extendUp;
      document.getElementById("extend_down").value = extendDown;
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
        document.getElementById("processedImage").src = url;
        notification.style.display = "none";

        downloadButtonContainer.innerHTML = "";

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download Image";
        downloadButton.className = "download-button";
        downloadButton.addEventListener("click", function () {
          const a = document.createElement("a");
          a.href = url;
          a.download = "uncropped_image";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });

        downloadButtonContainer.appendChild(downloadButton);
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to uncrop the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

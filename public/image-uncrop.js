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

  const extendLeftInput = document.getElementById("extend_left");
  const extendRightInput = document.getElementById("extend_right");
  const extendUpInput = document.getElementById("extend_up");
  const extendDownInput = document.getElementById("extend_down");
  const aspectRatioSelect = document.getElementById("aspect_ratio");

  let uploadedImage = null;
  let originalFileName = "";
  let imageWidth = 0;
  let imageHeight = 0;

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
          imageWidth = img.naturalWidth;
          imageHeight = img.naturalHeight;

          const fileSize = (file.size / (1024 * 1024)).toFixed(2);
          document.getElementById("uploadedImage").src = e.target.result;
          uploadedImageDimensions.textContent = `${imageWidth}x${imageHeight}px`;
          uploadedImageSize.textContent = `(${fileSize} MB)`;
        };
      };
      reader.readAsDataURL(file);
    }
  });

  aspectRatioSelect.addEventListener("change", function () {
    if (!imageWidth || !imageHeight) return; // Ensure image is loaded first

    let targetRatioWidth, targetRatioHeight;
    switch (aspectRatioSelect.value) {
      case "4:3":
        targetRatioWidth = 4;
        targetRatioHeight = 3;
        break;
      case "16:9":
        targetRatioWidth = 16;
        targetRatioHeight = 9;
        break;
      case "9:16":
        targetRatioWidth = 9;
        targetRatioHeight = 16;
        break;
      case "1:1":
        targetRatioWidth = 1;
        targetRatioHeight = 1;
        break;
      default:
        extendLeftInput.value = 0;
        extendRightInput.value = 0;
        extendUpInput.value = 0;
        extendDownInput.value = 0;
        return;
    }

    // Calculate extensions needed to achieve the selected aspect ratio
    const targetHeight = (imageWidth / targetRatioWidth) * targetRatioHeight;
    const targetWidth = (imageHeight / targetRatioHeight) * targetRatioWidth;

    if (targetHeight > imageHeight) {
      const extendAmount = (targetHeight - imageHeight) / 2;
      extendUpInput.value = Math.round(extendAmount);
      extendDownInput.value = Math.round(extendAmount);
      extendLeftInput.value = 0;
      extendRightInput.value = 0;
    } else if (targetWidth > imageWidth) {
      const extendAmount = (targetWidth - imageWidth) / 2;
      extendLeftInput.value = Math.round(extendAmount);
      extendRightInput.value = Math.round(extendAmount);
      extendUpInput.value = 0;
      extendDownInput.value = 0;
    } else {
      extendLeftInput.value = 0;
      extendRightInput.value = 0;
      extendUpInput.value = 0;
      extendDownInput.value = 0;
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

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("image");
//   const uploadFormUncrop = document.getElementById("uploadFormUncrop");
//   const notification = document.getElementById("processingNotification");
//   const uncropDownloadButtonContainer = document.getElementById("uncropDownloadButtonContainer");
//   const uncropDownloadButton = document.getElementById("uncropDownloadButton");
//   const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
//   const uploadedImageSize = document.getElementById("uploadedImageSize");
//   const processedImageDimensions = document.getElementById("processedImageDimensions");
//   const processedImageSize = document.getElementById("processedImageSize");
//   let uploadedImage = null;
//   let originalFileName = "";

//   imageInput.addEventListener("change", function () {
//     if (this.files && this.files[0]) {
//       const file = this.files[0];
//       originalFileName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

//       const reader = new FileReader();
//       reader.onload = function (e) {
//         const img = new Image();
//         img.src = e.target.result;
//         img.onload = function () {
//           uploadedImage = img;

//           const width = img.naturalWidth;
//           const height = img.naturalHeight;
//           const fileSize = (file.size / (1024 * 1024)).toFixed(2);

//           document.getElementById("uploadedImage").src = e.target.result;
//           uploadedImageDimensions.textContent = `${width}x${height}px`;
//           uploadedImageSize.textContent = `(${fileSize} MB)`;
//         };
//       };
//       reader.readAsDataURL(file);
//     }
//   });

//   uploadFormUncrop.addEventListener("submit", function (e) {
//     e.preventDefault();

//     const formData = new FormData(this);
//     notification.style.display = "block";

//     fetch("/uncrop-image", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Server responded with " + response.status);
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         const url = window.URL.createObjectURL(blob);
//         const processedImage = document.getElementById("processedImage");

//         if (processedImage) {
//           processedImage.src = url;
//         }

//         notification.style.display = "none";

//         const fileExtension = imageInput.files[0].name.substring(imageInput.files[0].name.lastIndexOf("."));
//         const savedFileName = `${originalFileName}_uncropped${fileExtension}`;

//         if (uncropDownloadButton) {
//           uncropDownloadButton.href = url;
//           uncropDownloadButton.download = savedFileName;
//         }

//         if (uncropDownloadButtonContainer) {
//           uncropDownloadButtonContainer.style.display = "inline";
//         }
//       })
//       .catch((err) => {
//         console.error("Error:", err);
//         alert("Failed to uncrop the image. " + err.message);
//         notification.style.display = "none";
//       });
//   });
// });

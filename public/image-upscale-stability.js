document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadForm = document.getElementById("uploadFormUpscaleStability");
  const outputFormatSelect = document.getElementById("output_format");
  const desiredWidthInput = document.getElementById("desired_width"); // NEW: Added desired_width input element
  const notification = document.getElementById("processingNotification");

  // Preview uploaded image
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

  // Handle form submission
  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // Show processing notification
    notification.style.display = "block";

    const formData = new FormData();
    const file = imageInput.files[0];
    formData.append("image", file);
    formData.append("output_format", outputFormatSelect.value);
    // NEW: Append desired_width if provided
    if (desiredWidthInput.value) {
      formData.append("desired_width", desiredWidthInput.value);
    }

    fetch("/upscale-image-stability", {
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

        // Hide processing notification
        notification.style.display = "none";

        // Display file info for the upscaled image
        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        document.getElementById("upscaledImageSize").textContent = `(${fileSizeInMB} MB)`;

        // Estimate dimensions based on desired_width or default 4x scale
        const uploadedImg = document.getElementById("uploadedImage");
        let width, height;
        if (desiredWidthInput.value) {
          width = desiredWidthInput.value;
          height = Math.round(uploadedImg.naturalHeight * (width / uploadedImg.naturalWidth));
        } else {
          width = uploadedImg.naturalWidth * 4;
          height = uploadedImg.naturalHeight * 4;
        }
        document.getElementById("upscaledImageDimensions").textContent = `${width}x${height}px`;
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to upscale the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("image");
//   const uploadForm = document.getElementById("uploadFormUpscaleStability");
//   const outputFormatSelect = document.getElementById("output_format");
//   const notification = document.getElementById("processingNotification");

//   // Preview uploaded image
//   imageInput.addEventListener("change", function () {
//     if (this.files && this.files[0]) {
//       const file = this.files[0];
//       const reader = new FileReader();

//       reader.onload = function (e) {
//         const img = document.getElementById("uploadedImage");
//         img.src = e.target.result;
//         img.onload = function () {
//           const originalWidth = img.naturalWidth;
//           const originalHeight = img.naturalHeight;
//           const fileSizeInBytes = file.size;
//           const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//           document.getElementById("uploadedImageSize").textContent = `(${fileSizeInMB} MB)`;
//           document.getElementById("uploadedImageDimensions").textContent = `${originalWidth}x${originalHeight}px`;
//         };
//       };
//       reader.readAsDataURL(file);
//     }
//   });

//   // Handle form submission
//   uploadForm.addEventListener("submit", function (e) {
//     e.preventDefault();

//     // Show processing notification
//     notification.style.display = "block";

//     const formData = new FormData();
//     const file = imageInput.files[0];
//     formData.append("image", file);

//     // Append output_format if selected (the select always has a value)
//     formData.append("output_format", outputFormatSelect.value);

//     fetch("/upscale-image-stability", {
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
//         processedImage.src = url;

//         // Hide processing notification
//         notification.style.display = "none";

//         // Display file info for the upscaled image
//         const fileSizeInBytes = blob.size;
//         const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//         document.getElementById("upscaledImageSize").textContent = `(${fileSizeInMB} MB)`;

//         // Since the output image is 4x the input image resolution, we can calculate dimensions if needed
//         const uploadedImg = document.getElementById("uploadedImage");
//         const width = uploadedImg.naturalWidth * 4;
//         const height = uploadedImg.naturalHeight * 4;
//         document.getElementById("upscaledImageDimensions").textContent = `${width}x${height}px`;
//       })
//       .catch((err) => {
//         console.error("Error:", err);
//         alert("Failed to upscale the image. " + err.message);
//         notification.style.display = "none";
//       });
//   });
// });

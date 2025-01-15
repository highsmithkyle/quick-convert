document.addEventListener("DOMContentLoaded", function () {
  // Grab form elements
  const uploadForm = document.getElementById("uploadFormGenerationUltra");
  const promptInput = document.getElementById("prompt");
  const negativePromptInput = document.getElementById("negative_prompt");
  const aspectRatioSelect = document.getElementById("aspect_ratio");
  const outputFormatSelect = document.getElementById("output_format");
  const notification = document.getElementById("processingNotification");

  // Handle form submission
  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // Show processing notification
    notification.style.display = "block";

    const formData = new FormData();
    // Append required prompt parameter
    formData.append("prompt", promptInput.value);
    // Append other optional parameters if provided
    if (negativePromptInput.value) {
      formData.append("negative_prompt", negativePromptInput.value);
    }
    if (aspectRatioSelect.value) {
      formData.append("aspect_ratio", aspectRatioSelect.value);
    }
    if (outputFormatSelect.value) {
      formData.append("output_format", outputFormatSelect.value);
    }

    // Send a POST request to the endpoint
    fetch("/generate-image-ultra", {
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
        const generatedImage = document.getElementById("generatedImage");
        generatedImage.src = url;
        // Hide processing notification
        notification.style.display = "none";
        // Display generated image size info
        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        document.getElementById("generatedImageSize").textContent = `(${fileSizeInMB} MB)`;
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to generate the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   // NEW: Grabbing form elements for the Ultra image generation
//   const uploadForm = document.getElementById("uploadFormGenerationUltra");
//   const promptInput = document.getElementById("prompt");
//   const negativePromptInput = document.getElementById("negative_prompt");
//   const aspectRatioSelect = document.getElementById("aspect_ratio");
//   const seedInput = document.getElementById("seed");
//   const outputFormatSelect = document.getElementById("output_format");
//   const imageInput = document.getElementById("image");
//   const strengthInput = document.getElementById("strength");
//   const notification = document.getElementById("processingNotification");

//   // NEW: For previewing the uploaded image (if provided)
//   imageInput.addEventListener("change", function () {
//     if (this.files && this.files[0]) {
//       const file = this.files[0];
//       const reader = new FileReader();
//       reader.onload = function (e) {
//         const img = document.getElementById("uploadedImage");
//         img.src = e.target.result;
//         // NEW: Optionally show file size
//         const fileSizeInBytes = file.size;
//         const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//         document.getElementById("uploadedImageSize").textContent = `(${fileSizeInMB} MB)`;
//       };
//       reader.readAsDataURL(file);
//     }
//   });

//   // NEW: Handle form submission for image generation
//   uploadForm.addEventListener("submit", function (e) {
//     e.preventDefault();
//     // Show processing notification
//     notification.style.display = "block";

//     const formData = new FormData();
//     // NEW: Append required prompt parameter
//     formData.append("prompt", promptInput.value);
//     // NEW: Append optional parameters if provided
//     if (negativePromptInput.value) {
//       formData.append("negative_prompt", negativePromptInput.value);
//     }
//     if (aspectRatioSelect.value) {
//       formData.append("aspect_ratio", aspectRatioSelect.value);
//     }
//     if (seedInput.value) {
//       formData.append("seed", seedInput.value);
//     }
//     if (outputFormatSelect.value) {
//       formData.append("output_format", outputFormatSelect.value);
//     }
//     // NEW: Append image file if provided
//     if (imageInput.files[0]) {
//       formData.append("image", imageInput.files[0]);
//       // NEW: Append strength value (must be provided if image exists)
//       if (strengthInput.value) {
//         formData.append("strength", strengthInput.value);
//       }
//     }

//     // NEW: Send a POST request to the new endpoint for image generation
//     fetch("/generate-image-ultra", {
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
//         const generatedImage = document.getElementById("generatedImage");
//         generatedImage.src = url;

//         // Hide processing notification
//         notification.style.display = "none";

//         // Display file size info for the generated image
//         const fileSizeInBytes = blob.size;
//         const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//         document.getElementById("generatedImageSize").textContent = `(${fileSizeInMB} MB)`;
//       })
//       .catch((err) => {
//         console.error("Error:", err);
//         alert("Failed to generate the image. " + err.message);
//         notification.style.display = "none";
//       });
//   });
// });

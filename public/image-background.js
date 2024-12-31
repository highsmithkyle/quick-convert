document.addEventListener("DOMContentLoaded", function () {
  const backgroundForm = document.getElementById("backgroundForm");
  const processingNotification = document.getElementById("processingNotification");

  const imageInput = document.getElementById("image");
  const originalImage = document.getElementById("originalImage");
  const finalImage = document.getElementById("finalImage");

  const colorPicker = document.getElementById("gradientColor");
  const colorValueDisplay = document.getElementById("colorValue");
  const gradientSizeSelect = document.getElementById("gradientSize");
  const heightInput = document.getElementById("height");

  const originalImageDimensions = document.getElementById("originalImageDimensions");
  const originalImageSize = document.getElementById("originalImageSize");
  const finalImageDimensions = document.getElementById("finalImageDimensions");
  const finalImageSize = document.getElementById("finalImageSize");

  /* [ADDED CODE] - For target width/height inputs */
  const targetWidthInput = document.getElementById("targetWidth");
  const targetHeightInput = document.getElementById("targetHeight");
  /* [ADDED CODE END] */

  // [ADDED CODE] - For suggested colors
  const suggestedColorsContainer = document.getElementById("suggestedColorsContainer");
  /* [ADDED CODE END] */

  // Update color display
  colorPicker.addEventListener("input", function () {
    colorValueDisplay.textContent = colorPicker.value.toUpperCase();
  });

  // Display original image details
  imageInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        originalImage.src = e.target.result;
        originalImage.onload = function () {
          const width = originalImage.naturalWidth;
          const height = originalImage.naturalHeight;
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

          originalImageDimensions.textContent = `${width}x${height}px`;
          originalImageSize.textContent = `(${sizeMB} MB)`;
        };
      };
      reader.readAsDataURL(file);

      /* [ADDED CODE] - Get suggested colors from server */
      getSuggestedColors(file);
      /* [ADDED CODE END] */
    } else {
      originalImage.src = "";
      originalImageDimensions.textContent = "";
      originalImageSize.textContent = "";
      /* [ADDED CODE] */
      suggestedColorsContainer.innerHTML = "";
      /* [ADDED CODE END] */
    }
  });

  /* [ADDED CODE] - Dynamically calculate targetHeight based on aspect ratio */
  targetWidthInput.addEventListener("input", function () {
    const width = originalImage.naturalWidth;
    const height = originalImage.naturalHeight;
    const enteredWidth = parseInt(targetWidthInput.value, 10);

    if (width > 0 && enteredWidth > 0) {
      const ratio = height / width;
      const newHeight = Math.round(enteredWidth * ratio);
      targetHeightInput.value = newHeight; // auto-fill
    }
  });
  /* [ADDED CODE END] */

  // Handle form submission
  backgroundForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (imageInput.files.length === 0) {
      alert("Please upload an image.");
      return;
    }

    const file = imageInput.files[0];
    const color = colorPicker.value;
    const gradientSize = gradientSizeSelect.value;
    const colorBlockHeight = heightInput.value;

    /* [CHANGED CODE] - Collect targetWidth & targetHeight */
    const targetWidthValue = targetWidthInput.value;
    const targetHeightValue = targetHeightInput.value;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("color", color);
    formData.append("gradientSize", gradientSize);
    formData.append("height", colorBlockHeight);

    /* [ADDED CODE] - Pass along target width/height */
    formData.append("targetWidth", targetWidthValue);
    formData.append("targetHeight", targetHeightValue);
    /* [ADDED CODE END] */

    processingNotification.style.display = "block";

    fetch("/create-background-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        processingNotification.style.display = "none";

        if (data.error) {
          alert(`Error: ${data.error}`);
          return;
        }

        // Display final image
        finalImage.src = data.imageUrl;
        finalImage.onload = function () {
          const img = new Image();
          img.src = data.imageUrl;
          img.onload = function () {
            const width = img.width;
            const height = img.height;
            finalImageDimensions.textContent = `${width}x${height}px`;
            finalImageSize.textContent = `(${data.sizeMB} MB)`;
          };
        };
      })
      .catch((error) => {
        processingNotification.style.display = "none";
        console.error("Error:", error);
        alert("An error occurred while processing the image.");
      });
  });

  // [ADDED CODE] - Function to fetch suggested colors
  function getSuggestedColors(file) {
    const formData = new FormData();
    formData.append("image", file);

    fetch("/get-suggested-colors", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Error fetching suggested colors:", data.error);
          return;
        }
        displaySuggestedColors(data.colors || []);
      })
      .catch((error) => {
        console.error("Error in getSuggestedColors:", error);
      });
  }

  // [CHANGED CODE] - Always append black and white as the last two swatches
  function displaySuggestedColors(colors) {
    suggestedColorsContainer.innerHTML = "";

    // First display the Vibrant-derived colors (up to 5)
    colors.forEach((clr) => {
      createSwatch(clr);
    });

    // Then append black and white (2 more)
    createSwatch("#000000");
    createSwatch("#FFFFFF");
  }

  // [ADDED CODE] - Helper to create clickable swatches
  function createSwatch(colorHex) {
    const swatch = document.createElement("div");
    swatch.style.width = "24px";
    swatch.style.height = "24px";
    swatch.style.cursor = "pointer";
    swatch.style.border = "1px solid #ccc";
    swatch.style.backgroundColor = colorHex;

    swatch.addEventListener("click", function () {
      colorPicker.value = colorHex;
      colorValueDisplay.textContent = colorHex.toUpperCase();
    });

    suggestedColorsContainer.appendChild(swatch);
  }
});


// document.addEventListener("DOMContentLoaded", function () {
//   const backgroundForm = document.getElementById("backgroundForm");
//   const processingNotification = document.getElementById("processingNotification");

//   const imageInput = document.getElementById("image");
//   const originalImage = document.getElementById("originalImage");
//   const finalImage = document.getElementById("finalImage");

//   const colorPicker = document.getElementById("gradientColor");
//   const colorValueDisplay = document.getElementById("colorValue");
//   const gradientSizeSelect = document.getElementById("gradientSize");
//   const heightInput = document.getElementById("height");

//   const originalImageDimensions = document.getElementById("originalImageDimensions");
//   const originalImageSize = document.getElementById("originalImageSize");
//   const finalImageDimensions = document.getElementById("finalImageDimensions");
//   const finalImageSize = document.getElementById("finalImageSize");

//   /* [ADDED CODE] - For target width/height inputs */
//   const targetWidthInput = document.getElementById("targetWidth");
//   const targetHeightInput = document.getElementById("targetHeight");
//   /* [ADDED CODE END] */

//   // [ADDED CODE] - For suggested colors
//   const suggestedColorsContainer = document.getElementById("suggestedColorsContainer");
//   /* [ADDED CODE END] */

//   // Update color display
//   colorPicker.addEventListener("input", function () {
//     colorValueDisplay.textContent = colorPicker.value.toUpperCase();
//   });

//   // Display original image details
//   imageInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = function (e) {
//         originalImage.src = e.target.result;
//         originalImage.onload = function () {
//           const width = originalImage.naturalWidth;
//           const height = originalImage.naturalHeight;
//           const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

//           originalImageDimensions.textContent = `${width}x${height}px`;
//           originalImageSize.textContent = `(${sizeMB} MB)`;
//         };
//       };
//       reader.readAsDataURL(file);

//       /* [ADDED CODE] - Get suggested colors from server */
//       getSuggestedColors(file);
//       /* [ADDED CODE END] */

//     } else {
//       originalImage.src = "";
//       originalImageDimensions.textContent = "";
//       originalImageSize.textContent = "";
//       /* [ADDED CODE] */
//       suggestedColorsContainer.innerHTML = "";
//       /* [ADDED CODE END] */
//     }
//   });

//   /* [ADDED CODE] - Dynamically calculate targetHeight based on aspect ratio */
//   targetWidthInput.addEventListener("input", function () {
//     const width = originalImage.naturalWidth;
//     const height = originalImage.naturalHeight;
//     const enteredWidth = parseInt(targetWidthInput.value, 10);

//     if (width > 0 && enteredWidth > 0) {
//       const ratio = height / width;
//       const newHeight = Math.round(enteredWidth * ratio);
//       targetHeightInput.value = newHeight; // auto-fill
//     }
//   });
//   /* [ADDED CODE END] */

//   // Handle form submission
//   backgroundForm.addEventListener("submit", function (e) {
//     e.preventDefault();

//     if (imageInput.files.length === 0) {
//       alert("Please upload an image.");
//       return;
//     }

//     const file = imageInput.files[0];
//     const color = colorPicker.value;
//     const gradientSize = gradientSizeSelect.value;
//     const colorBlockHeight = heightInput.value;

//     /* [CHANGED CODE] - Collect targetWidth & targetHeight */
//     const targetWidthValue = targetWidthInput.value;
//     const targetHeightValue = targetHeightInput.value;

//     const formData = new FormData();
//     formData.append("image", file);
//     formData.append("color", color);
//     formData.append("gradientSize", gradientSize);
//     formData.append("height", colorBlockHeight);

//     /* [ADDED CODE] - Pass along target width/height */
//     formData.append("targetWidth", targetWidthValue);
//     formData.append("targetHeight", targetHeightValue);
//     /* [ADDED CODE END] */

//     processingNotification.style.display = "block";

//     fetch("/create-background-image", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         processingNotification.style.display = "none";

//         if (data.error) {
//           alert(`Error: ${data.error}`);
//           return;
//         }

//         // Display final image
//         finalImage.src = data.imageUrl;
//         finalImage.onload = function () {
//           const img = new Image();
//           img.src = data.imageUrl;
//           img.onload = function () {
//             const width = img.width;
//             const height = img.height;
//             finalImageDimensions.textContent = `${width}x${height}px`;
//             finalImageSize.textContent = `(${data.sizeMB} MB)`;
//           };
//         };
//       })
//       .catch((error) => {
//         processingNotification.style.display = "none";
//         console.error("Error:", error);
//         alert("An error occurred while processing the image.");
//       });
//   });

//   // [ADDED CODE] - Function to fetch suggested colors
//   function getSuggestedColors(file) {
//     const formData = new FormData();
//     formData.append("image", file);

//     fetch("/get-suggested-colors", {
//       method: "POST",
//       body: formData,
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.error) {
//           console.error("Error fetching suggested colors:", data.error);
//           return;
//         }
//         displaySuggestedColors(data.colors || []);
//       })
//       .catch((error) => {
//         console.error("Error in getSuggestedColors:", error);
//       });
//   }

//   // [ADDED CODE] - Function to display and allow selection of suggested colors
//   function displaySuggestedColors(colors) {
//     suggestedColorsContainer.innerHTML = "";

//     colors.forEach((clr) => {
//       const swatch = document.createElement("div");
//       swatch.style.width = "24px";
//       swatch.style.height = "24px";
//       swatch.style.cursor = "pointer";
//       swatch.style.border = "1px solid #ccc";
//       swatch.style.backgroundColor = clr;

//       // When user clicks on swatch, update the color picker
//       swatch.addEventListener("click", function () {
//         colorPicker.value = clr;
//         colorValueDisplay.textContent = clr.toUpperCase();
//       });

//       suggestedColorsContainer.appendChild(swatch);
//     });
//   }
//   // [ADDED CODE END]
// });


// document.addEventListener("DOMContentLoaded", function () {
//   const backgroundForm = document.getElementById("backgroundForm");
//   const processingNotification = document.getElementById("processingNotification");

//   const imageInput = document.getElementById("image");
//   const originalImage = document.getElementById("originalImage");
//   const finalImage = document.getElementById("finalImage");

//   const colorPicker = document.getElementById("gradientColor");
//   const colorValueDisplay = document.getElementById("colorValue");
//   const gradientSizeSelect = document.getElementById("gradientSize");
//   const heightInput = document.getElementById("height");

//   const originalImageDimensions = document.getElementById("originalImageDimensions");
//   const originalImageSize = document.getElementById("originalImageSize");
//   const finalImageDimensions = document.getElementById("finalImageDimensions");
//   const finalImageSize = document.getElementById("finalImageSize");

//   /* [ADDED CODE] - For target width/height inputs */
//   const targetWidthInput = document.getElementById("targetWidth");
//   const targetHeightInput = document.getElementById("targetHeight");
//   /* [ADDED CODE END] */

//   // Update color display
//   colorPicker.addEventListener("input", function () {
//     colorValueDisplay.textContent = colorPicker.value.toUpperCase();
//   });

//   // Display original image details
//   imageInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = function (e) {
//         originalImage.src = e.target.result;
//         originalImage.onload = function () {
//           const width = originalImage.naturalWidth;
//           const height = originalImage.naturalHeight;
//           const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

//           originalImageDimensions.textContent = `${width}x${height}px`;
//           originalImageSize.textContent = `(${sizeMB} MB)`;
//         };
//       };
//       reader.readAsDataURL(file);
//     } else {
//       originalImage.src = "";
//       originalImageDimensions.textContent = "";
//       originalImageSize.textContent = "";
//     }
//   });

//   /* [ADDED CODE] - Dynamically calculate targetHeight based on aspect ratio */
//   targetWidthInput.addEventListener("input", function () {
//     const width = originalImage.naturalWidth;
//     const height = originalImage.naturalHeight;
//     const enteredWidth = parseInt(targetWidthInput.value, 10);

//     if (width > 0 && enteredWidth > 0) {
//       const ratio = height / width;
//       const newHeight = Math.round(enteredWidth * ratio);
//       targetHeightInput.value = newHeight; // auto-fill
//     }
//   });
//   /* [ADDED CODE END] */

//   // Handle form submission
//   backgroundForm.addEventListener("submit", function (e) {
//     e.preventDefault();

//     if (imageInput.files.length === 0) {
//       alert("Please upload an image.");
//       return;
//     }

//     const file = imageInput.files[0];
//     const color = colorPicker.value;
//     const gradientSize = gradientSizeSelect.value;
//     const colorBlockHeight = heightInput.value;

//     /* [CHANGED CODE] - Collect targetWidth & targetHeight */
//     const targetWidthValue = targetWidthInput.value;
//     const targetHeightValue = targetHeightInput.value;

//     const formData = new FormData();
//     formData.append("image", file);
//     formData.append("color", color);
//     formData.append("gradientSize", gradientSize);
//     formData.append("height", colorBlockHeight);

//     /* [ADDED CODE] - Pass along target width/height */
//     formData.append("targetWidth", targetWidthValue);
//     formData.append("targetHeight", targetHeightValue);
//     /* [ADDED CODE END] */

//     processingNotification.style.display = "block";

//     fetch("/create-background-image", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         processingNotification.style.display = "none";

//         if (data.error) {
//           alert(`Error: ${data.error}`);
//           return;
//         }

//         // Display final image
//         finalImage.src = data.imageUrl;
//         finalImage.onload = function () {
//           const img = new Image();
//           img.src = data.imageUrl;
//           img.onload = function () {
//             const width = img.width;
//             const height = img.height;
//             finalImageDimensions.textContent = `${width}x${height}px`;
//             finalImageSize.textContent = `(${data.sizeMB} MB)`;
//           };
//         };
//       })
//       .catch((error) => {
//         processingNotification.style.display = "none";
//         console.error("Error:", error);
//         alert("An error occurred while processing the image.");
//       });
//   });
// });

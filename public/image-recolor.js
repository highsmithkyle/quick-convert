document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageInput");
  const uploadedImage = document.getElementById("uploadedImage");
  const recoloredImage = document.getElementById("recoloredImage");
  const fuzzInput = document.getElementById("fuzz");
  const fuzzValueDisplay = document.getElementById("fuzzValue");
  const notification = document.getElementById("processingNotification");
  const colorOptionsContainer = document.getElementById("colorOptions");
  const originalImageDimensions = document.getElementById("originalImageDimensions");
  const originalImageSize = document.getElementById("originalImageSize");
  const recoloredImageDimensions = document.getElementById("recoloredImageDimensions");
  const recoloredImageSize = document.getElementById("recoloredImageSize");
  const inlineDownloadButton = document.getElementById("inlineDownloadButton");
  const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");
  const fuzzSliderContainer = document.querySelector(".fuzz-slider-container");

  // Modal Elements
  const fileTypeModal = document.getElementById("fileTypeModal");
  const fileTypeCloseButton = document.getElementById("fileTypeCloseButton");
  const fileTypeOkButton = document.getElementById("fileTypeOkButton");

  let debounceTimeout;

  fuzzInput.addEventListener("input", function () {
    fuzzValueDisplay.textContent = `${fuzzInput.value}%`;
    triggerRecolor();
  });

  imageInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.type;
      if (fileType !== "image/jpeg" && fileType !== "image/png") {
        showFileTypeModal();
        imageInput.value = ""; // Clear the input
        return;
      }

      uploadedImage.src = URL.createObjectURL(file);
      uploadedImage.style.display = "block";
      recoloredImage.style.display = "none";
      originalImageDimensions.textContent = "";
      originalImageSize.textContent = "";
      recoloredImageDimensions.textContent = "";
      recoloredImageSize.textContent = "";
      inlineDownloadButtonContainer.style.display = "none";

      fuzzSliderContainer.classList.remove("fuzz-slider-hidden");
      fuzzSliderContainer.classList.add("fuzz-slider-visible");

      colorOptionsContainer.innerHTML = "";

      detectColors(file);

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const width = img.width;
          const height = img.height;
          originalImageDimensions.textContent = `${width}x${height}px`;
          const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
          originalImageSize.textContent = `(${fileSizeInMB} MB)`;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  function detectColors(file) {
    const formData = new FormData();
    formData.append("image", file);

    fetch("/detectColors", { method: "POST", body: formData })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to detect colors.");
        }
        return response.json();
      })
      .then((data) => {
        const colors = data.colors;
        colorOptionsContainer.innerHTML = "";

        colors.forEach((color, index) => {
          const detectedRow = document.createElement("div");
          detectedRow.className = "recolor-detected-row";

          const detectedColorBox = document.createElement("div");
          detectedColorBox.className = "detected-color-box";
          detectedColorBox.style.backgroundColor = color;

          const detectedHexCode = document.createElement("div");
          detectedHexCode.className = "detected-hex-code";
          detectedHexCode.textContent = color.toUpperCase();

          const detectedCheckboxContainer = document.createElement("div");
          detectedCheckboxContainer.className = "detected-checkbox";

          const detectedCheckbox = document.createElement("input");
          detectedCheckbox.type = "checkbox";
          detectedCheckbox.id = `colorCheckbox${index}`;
          detectedCheckbox.name = "sourceColor";
          detectedCheckbox.value = color;

          detectedCheckboxContainer.appendChild(detectedCheckbox);

          const detectedLabel = document.createElement("label");
          detectedLabel.htmlFor = `colorCheckbox${index}`;
          detectedLabel.className = "detected-label";
          detectedLabel.textContent = "Detected Color";

          detectedRow.appendChild(detectedColorBox);
          detectedRow.appendChild(detectedHexCode);
          detectedRow.appendChild(detectedCheckboxContainer);
          detectedRow.appendChild(detectedLabel);

          // New Color Row
          const newColorRow = document.createElement("div");
          newColorRow.className = "recolor-new-row";
          newColorRow.id = `newColorRow${index}`;
          newColorRow.style.display = "none";

          const newColorBox = document.createElement("input");
          newColorBox.type = "color";
          newColorBox.className = "new-color-box";
          newColorBox.value = "#ff0000";

          const newHexCode = document.createElement("div");
          newHexCode.className = "new-hex-code";
          newHexCode.textContent = "#FF0000";

          const blankDiv = document.createElement("div"); // For alignment

          const newLabel = document.createElement("label");
          newLabel.className = "new-label";
          newLabel.textContent = "New Color";

          newColorRow.appendChild(newColorBox);
          newColorRow.appendChild(newHexCode);
          newColorRow.appendChild(blankDiv);
          newColorRow.appendChild(newLabel);

          colorOptionsContainer.appendChild(detectedRow);
          colorOptionsContainer.appendChild(newColorRow);

          detectedCheckbox.addEventListener("change", function () {
            if (detectedCheckbox.checked) {
              newColorRow.style.display = "grid";
            } else {
              newColorRow.style.display = "none";
              triggerRecolor();
            }
          });

          newColorBox.addEventListener("input", function () {
            newHexCode.textContent = newColorBox.value.toUpperCase();
            triggerRecolor();
          });
        });
      })
      .catch((error) => {
        console.error(error);
        alert("Failed to detect colors.");
      });
  }

  function triggerRecolor() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      recolorImage();
    }, 500);
  }

  function recolorImage() {
    const selectedSourceColors = Array.from(document.querySelectorAll('input[name="sourceColor"]:checked')).map((cb) => cb.value);
    const selectedTargetColors = [];

    selectedSourceColors.forEach((sourceColor) => {
      const checkbox = document.querySelector(`input[name="sourceColor"][value="${sourceColor}"]`);
      if (checkbox) {
        const detectedRow = checkbox.closest(".recolor-detected-row");
        const childIndex = Array.from(colorOptionsContainer.children).indexOf(detectedRow);
        const colorIndex = Math.floor(childIndex / 2);
        const newColorPicker = document.getElementById(`newColorRow${colorIndex}`).querySelector(".new-color-box");
        const newHexCode = newColorPicker.value.toUpperCase();
        selectedTargetColors.push(newHexCode.replace("#", ""));
      }
    });

    if (selectedSourceColors.length === 0) {
      recoloredImage.src = "";
      recoloredImage.style.display = "none";
      recoloredImageDimensions.textContent = "";
      recoloredImageSize.textContent = "";
      inlineDownloadButtonContainer.style.display = "none";
      return;
    }

    notification.style.display = "block";
    recoloredImage.style.display = "none";
    recoloredImageDimensions.textContent = "";
    recoloredImageSize.textContent = "";
    inlineDownloadButtonContainer.style.display = "none";

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);
    formData.append("sourceColors", JSON.stringify(selectedSourceColors));
    formData.append("targetColors", JSON.stringify(selectedTargetColors));
    formData.append("fuzz", fuzzInput.value);

    fetch("/recolorImage", { method: "POST", body: formData })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(text);
          });
        }
        return response.blob();
      })
      .then((blob) => {
        notification.style.display = "none";
        const url = URL.createObjectURL(blob);
        recoloredImage.src = url;
        recoloredImage.style.display = "block";

        const img = new Image();
        img.onload = function () {
          const width = img.width;
          const height = img.height;
          recoloredImageDimensions.textContent = `${width}x${height}px`;
          const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
          recoloredImageSize.textContent = `(${fileSizeInMB} MB)`;
          inlineDownloadButton.href = url;
          const originalName = imageInput.files[0].name;
          const extension = originalName.substring(originalName.lastIndexOf("."));
          inlineDownloadButton.download = `recolored-${originalName.substring(0, originalName.lastIndexOf("."))}${extension}`;
          inlineDownloadButtonContainer.style.display = "inline";
        };
        img.src = url;
      })
      .catch((error) => {
        notification.style.display = "none";
        alert(`Failed to recolor image: ${error.message}`);
        console.error("Recoloring error:", error);
      });
  }

  // File Type Modal Handling
  function showFileTypeModal() {
    fileTypeModal.classList.add("show");
  }

  function hideFileTypeModal() {
    fileTypeModal.classList.remove("show");
  }

  fileTypeCloseButton.addEventListener("click", hideFileTypeModal);
  fileTypeOkButton.addEventListener("click", hideFileTypeModal);
});

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("imageInput");
//   const uploadedImage = document.getElementById("uploadedImage");
//   const recoloredImage = document.getElementById("recoloredImage");
//   const fuzzInput = document.getElementById("fuzz");
//   const fuzzValueDisplay = document.getElementById("fuzzValue");
//   const notification = document.getElementById("processingNotification");
//   const colorOptionsContainer = document.getElementById("colorOptions");
//   const originalImageDimensions = document.getElementById("originalImageDimensions");
//   const originalImageSize = document.getElementById("originalImageSize");
//   const recoloredImageDimensions = document.getElementById("recoloredImageDimensions");
//   const recoloredImageSize = document.getElementById("recoloredImageSize");
//   const inlineDownloadButton = document.getElementById("inlineDownloadButton");
//   const inlineDownloadButtonContainer = document.getElementById("inlineDownloadButtonContainer");
//   const fuzzSliderContainer = document.querySelector(".fuzz-slider-container");

//   let debounceTimeout;

//   fuzzInput.addEventListener("input", function () {
//     fuzzValueDisplay.textContent = `${fuzzInput.value}%`;
//     triggerRecolor();
//   });

//   imageInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       uploadedImage.src = URL.createObjectURL(file);
//       uploadedImage.style.display = "block";
//       recoloredImage.style.display = "none";
//       originalImageDimensions.textContent = "";
//       originalImageSize.textContent = "";
//       recoloredImageDimensions.textContent = "";
//       recoloredImageSize.textContent = "";
//       inlineDownloadButtonContainer.style.display = "none";

//       fuzzSliderContainer.classList.remove("fuzz-slider-hidden");
//       fuzzSliderContainer.classList.add("fuzz-slider-visible");

//       colorOptionsContainer.innerHTML = "";

//       detectColors(file);

//       const reader = new FileReader();
//       reader.onload = function (e) {
//         const img = new Image();
//         img.onload = function () {
//           const width = img.width;
//           const height = img.height;
//           originalImageDimensions.textContent = `${width}x${height}px`;
//           const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
//           originalImageSize.textContent = `(${fileSizeInMB} MB)`;
//         };
//         img.src = e.target.result;
//       };
//       reader.readAsDataURL(file);
//     }
//   });

//   function detectColors(file) {
//     const formData = new FormData();
//     formData.append("image", file);

//     fetch("/detectColors", { method: "POST", body: formData })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Failed to detect colors.");
//         }
//         return response.json();
//       })
//       .then((data) => {
//         const colors = data.colors;
//         colorOptionsContainer.innerHTML = "";

//         colors.forEach((color, index) => {
//           const detectedRow = document.createElement("div");
//           detectedRow.className = "recolor-detected-row";

//           const detectedColorBox = document.createElement("div");
//           detectedColorBox.className = "detected-color-box";
//           detectedColorBox.style.backgroundColor = color;

//           const detectedHexCode = document.createElement("div");
//           detectedHexCode.className = "detected-hex-code";
//           detectedHexCode.textContent = color.toUpperCase();

//           const detectedCheckboxContainer = document.createElement("div");
//           detectedCheckboxContainer.className = "detected-checkbox";

//           const detectedCheckbox = document.createElement("input");
//           detectedCheckbox.type = "checkbox";
//           detectedCheckbox.id = `colorCheckbox${index}`;
//           detectedCheckbox.name = "sourceColor";
//           detectedCheckbox.value = color;

//           detectedCheckboxContainer.appendChild(detectedCheckbox);

//           const detectedLabel = document.createElement("label");
//           detectedLabel.htmlFor = `colorCheckbox${index}`;
//           detectedLabel.className = "detected-label";
//           detectedLabel.textContent = "Detected Color";

//           detectedRow.appendChild(detectedColorBox);
//           detectedRow.appendChild(detectedHexCode);
//           detectedRow.appendChild(detectedCheckboxContainer);
//           detectedRow.appendChild(detectedLabel);

//           // New Color Row
//           const newColorRow = document.createElement("div");
//           newColorRow.className = "recolor-new-row";
//           newColorRow.id = `newColorRow${index}`;
//           newColorRow.style.display = "none";

//           const newColorBox = document.createElement("input");
//           newColorBox.type = "color";
//           newColorBox.className = "new-color-box";
//           newColorBox.value = "#ff0000";

//           const newHexCode = document.createElement("div");
//           newHexCode.className = "new-hex-code";
//           newHexCode.textContent = "#FF0000";

//           const blankDiv = document.createElement("div"); // For alignment

//           const newLabel = document.createElement("label");
//           newLabel.className = "new-label";
//           newLabel.textContent = "New Color";

//           newColorRow.appendChild(newColorBox);
//           newColorRow.appendChild(newHexCode);
//           newColorRow.appendChild(blankDiv);
//           newColorRow.appendChild(newLabel);

//           colorOptionsContainer.appendChild(detectedRow);
//           colorOptionsContainer.appendChild(newColorRow);

//           detectedCheckbox.addEventListener("change", function () {
//             if (detectedCheckbox.checked) {
//               newColorRow.style.display = "grid";
//             } else {
//               newColorRow.style.display = "none";
//               triggerRecolor();
//             }
//           });

//           newColorBox.addEventListener("input", function () {
//             newHexCode.textContent = newColorBox.value.toUpperCase();
//             triggerRecolor();
//           });
//         });
//       })
//       .catch((error) => {
//         console.error(error);
//         alert("Failed to detect colors.");
//       });
//   }

//   function triggerRecolor() {
//     clearTimeout(debounceTimeout);
//     debounceTimeout = setTimeout(() => {
//       recolorImage();
//     }, 500);
//   }

//   function recolorImage() {
//     const selectedSourceColors = Array.from(document.querySelectorAll('input[name="sourceColor"]:checked')).map((cb) => cb.value);
//     const selectedTargetColors = [];

//     selectedSourceColors.forEach((sourceColor) => {
//       const checkbox = document.querySelector(`input[name="sourceColor"][value="${sourceColor}"]`);
//       if (checkbox) {
//         const detectedRow = checkbox.closest(".recolor-detected-row");
//         const childIndex = Array.from(colorOptionsContainer.children).indexOf(detectedRow);
//         const colorIndex = Math.floor(childIndex / 2);
//         const newColorPicker = document.getElementById(`newColorRow${colorIndex}`).querySelector(".new-color-box");
//         const newHexCode = newColorPicker.value.toUpperCase();
//         selectedTargetColors.push(newHexCode.replace("#", ""));
//       }
//     });

//     if (selectedSourceColors.length === 0) {
//       recoloredImage.src = "";
//       recoloredImage.style.display = "none";
//       recoloredImageDimensions.textContent = "";
//       recoloredImageSize.textContent = "";
//       inlineDownloadButtonContainer.style.display = "none";
//       return;
//     }

//     notification.style.display = "block";
//     recoloredImage.style.display = "none";
//     recoloredImageDimensions.textContent = "";
//     recoloredImageSize.textContent = "";
//     inlineDownloadButtonContainer.style.display = "none";

//     const formData = new FormData();
//     formData.append("image", imageInput.files[0]);
//     formData.append("sourceColors", JSON.stringify(selectedSourceColors));
//     formData.append("targetColors", JSON.stringify(selectedTargetColors));
//     formData.append("fuzz", fuzzInput.value);

//     fetch("/recolorImage", { method: "POST", body: formData })
//       .then((response) => {
//         if (!response.ok) {
//           return response.text().then((text) => {
//             throw new Error(text);
//           });
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         notification.style.display = "none";
//         const url = URL.createObjectURL(blob);
//         recoloredImage.src = url;
//         recoloredImage.style.display = "block";

//         const img = new Image();
//         img.onload = function () {
//           const width = img.width;
//           const height = img.height;
//           recoloredImageDimensions.textContent = `${width}x${height}px`;
//           const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
//           recoloredImageSize.textContent = `(${fileSizeInMB} MB)`;
//           inlineDownloadButton.href = url;
//           const originalName = imageInput.files[0].name;
//           const extension = originalName.substring(originalName.lastIndexOf("."));
//           inlineDownloadButton.download = `recolored-${originalName.substring(0, originalName.lastIndexOf("."))}${extension}`;
//           inlineDownloadButtonContainer.style.display = "inline";
//         };
//         img.src = url;
//       })
//       .catch((error) => {
//         notification.style.display = "none";
//         alert(`Failed to recolor image: ${error.message}`);
//         console.error("Recoloring error:", error);
//       });
//   }
// });

document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("mediaInput");
  const imageDisplay = document.getElementById("imageDisplay");
  const overlay = document.getElementById("overlay");
  const imageContainer = document.getElementById("videoContainer");
  const sizeSelector = document.getElementById("sizeSelector");
  const formatSelect = document.getElementById("formatSelect");
  const handle = overlay.querySelector(".resize-handle");
  const notification = document.getElementById("processingNotification");
  const uploadedImageSize = document.getElementById("uploadedImageSize");
  const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
  const croppedImageSize = document.getElementById("croppedImageSize");
  const croppedImageDimensions = document.getElementById("croppedImageDimensions");
  const downloadButton = document.getElementById("downloadButton");

  let scaleX, scaleY;
  let isResizing = false;
  let canDrag = false;
  let originalFileName = "";
  let aspectRatio = null;

  overlay.style.display = "none";

  function setOverlaySize(ratio) {
    const { width, height } = imageContainer.getBoundingClientRect();
    let overlayWidth, overlayHeight;

    switch (ratio) {
      case "16:9":
        aspectRatio = 16 / 9;
        overlayWidth = width;
        overlayHeight = overlayWidth / aspectRatio;
        makeResizable(overlay);
        handle.style.display = "block";
        break;
      case "9:16":
        aspectRatio = 9 / 16;
        overlayHeight = height;
        overlayWidth = overlayHeight * aspectRatio;
        if (overlayWidth > width) {
          overlayWidth = width;
          overlayHeight = overlayWidth / aspectRatio;
        }
        makeResizable(overlay);
        handle.style.display = "block";
        break;
      case "1:1":
        aspectRatio = 1;
        overlayWidth = Math.min(width, height);
        overlayHeight = overlayWidth;
        makeResizable(overlay);
        handle.style.display = "block";
        break;
      case "8:3":
        aspectRatio = 8 / 3;
        overlayWidth = width;
        overlayHeight = overlayWidth / aspectRatio;
        makeResizable(overlay);
        handle.style.display = "block";
        break;
      case "custom":
        overlayWidth = 200;
        overlayHeight = 150;
        aspectRatio = null;
        makeCustomResizable(overlay);
        handle.style.display = "block";
        break;
      default:
        overlayWidth = width;
        overlayHeight = height;
        handle.style.display = "none";
        break;
    }

    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    centerOverlay();
  }

  function centerOverlay() {
    const parentRect = imageContainer.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    overlay.style.top = `${Math.max(0, (parentRect.height - overlayRect.height) / 2)}px`;
    overlay.style.left = `${Math.max(0, (parentRect.width - overlayRect.width) / 2)}px`;
  }

  function updateOverlay() {
    overlay.style.display = "block";
    setOverlaySize(sizeSelector.value);
  }

  sizeSelector.addEventListener("change", function () {
    updateOverlay();
  });

  imageInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    originalFileName = file.name.replace(/\.[^/.]+$/, "");
    const originalImageUrl = URL.createObjectURL(file);
    imageDisplay.src = originalImageUrl;
    imageDisplay.style.display = "block";
    imageDisplay.onload = function () {
      scaleX = imageDisplay.naturalWidth / imageDisplay.getBoundingClientRect().width;
      scaleY = imageDisplay.naturalHeight / imageDisplay.getBoundingClientRect().height;

      const fileSizeInBytes = file.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
      uploadedImageSize.textContent = `${fileSizeInMB} MB`;
      uploadedImageDimensions.textContent = `${imageDisplay.naturalWidth}x${imageDisplay.naturalHeight}px`;

      updateOverlay();
    };
  });

  function makeDraggable(element) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    element.addEventListener("mousedown", function (e) {
      if (isResizing) return;

      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      canDrag = true;

      document.onmouseup = function () {
        document.onmouseup = null;
        document.onmousemove = null;
        canDrag = false;
      };
      document.onmousemove = function (e) {
        if (!canDrag) return;

        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        newTop = Math.max(0, Math.min(newTop, imageContainer.offsetHeight - element.offsetHeight));
        newLeft = Math.max(0, Math.min(newLeft, imageContainer.offsetWidth - element.offsetWidth));

        element.style.top = `${newTop}px`;
        element.style.left = `${newLeft}px`;
      };
    });
  }

  function makeResizable(element) {
    handle.addEventListener("mousedown", function (e) {
      isResizing = true;
      canDrag = false;

      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
      const startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);

      function doDrag(event) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        let newWidth = startWidth + dx;
        let newHeight = startHeight + dy;

        if (aspectRatio) {
          if (newWidth / newHeight > aspectRatio) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }

        const imageBounds = imageContainer.getBoundingClientRect();
        const maxWidth = Math.min(imageBounds.width - element.offsetLeft, imageBounds.height * (aspectRatio || newHeight / newWidth));
        const maxHeight = Math.min(imageBounds.height - element.offsetTop, imageBounds.width / (aspectRatio || newWidth / newHeight));

        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = newWidth / (aspectRatio || 1);
        }
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * (aspectRatio || 1);
        }

        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;

        if (parseInt(element.style.width, 10) < 50) {
          element.style.width = "50px";
        }
        if (parseInt(element.style.height, 10) < 50) {
          element.style.height = "50px";
        }
      }

      function stopDrag() {
        isResizing = false;
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
        canDrag = true;
      }

      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    });
  }

  function makeCustomResizable(element) {
    handle.addEventListener("mousedown", function (e) {
      isResizing = true;
      canDrag = false;

      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
      const startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);

      function doDrag(event) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        let newWidth = startWidth + dx;
        let newHeight = startHeight + dy;

        const imageBounds = imageContainer.getBoundingClientRect();

        if (element.offsetLeft + newWidth > imageBounds.width) {
          newWidth = imageBounds.width - element.offsetLeft;
        }
        if (element.offsetTop + newHeight > imageBounds.height) {
          newHeight = imageBounds.height - element.offsetTop;
        }

        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;

        if (newWidth < 50) {
          element.style.width = "50px";
        }
        if (newHeight < 50) {
          element.style.height = "50px";
        }
      }

      function stopDrag() {
        isResizing = false;
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
        canDrag = true;
      }

      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    });
  }

  makeDraggable(overlay);
  makeCustomResizable(overlay);

  document.getElementById("uploadForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const imageRect = imageDisplay.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    notification.style.display = "block";

    const cropWidth = overlayRect.width * scaleX;
    const cropHeight = overlayRect.height * scaleY;
    const cropLeft = (overlayRect.left - imageRect.left) * scaleX;
    const cropTop = (overlayRect.top - imageRect.top) * scaleY;

    let formData = new FormData();
    formData.append("media", document.getElementById("mediaInput").files[0]);
    formData.append("width", Math.round(cropWidth));
    formData.append("height", Math.round(cropHeight));
    formData.append("left", Math.round(cropLeft));
    formData.append("top", Math.round(cropTop));
    formData.append("format", formatSelect.value);

    fetch("/upload-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        document.getElementById("croppedImageDisplay").src = url;
        notification.style.display = "none";

        const fileSizeInBytes = blob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        croppedImageSize.textContent = `${fileSizeInMB} MB`;
        croppedImageDimensions.textContent = `${Math.round(cropWidth)}x${Math.round(cropHeight)}px`;

        if (Math.round(cropWidth) < 200 || Math.round(cropHeight) < 200) {
          if (confirm("The cropped image is smaller than 200x200px. Do you want to upscale the image?")) {
            upscaleImage(blob, cropWidth, cropHeight);
          }
        }

        downloadButton.style.display = "inline-block";
        downloadButton.addEventListener("click", function () {
          const a = document.createElement("a");
          a.href = url;
          a.download = `${originalFileName}_crop.${formatSelect.value}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      })
      .catch((error) => {
        console.error("Error uploading the image:", error);
        notification.style.display = "none";
      });
  });

  function upscaleImage(blob, cropWidth, cropHeight) {
    const upscaleFactor = 3;
    const targetWidth = Math.round(cropWidth * upscaleFactor);
    const targetHeight = Math.round(cropHeight * upscaleFactor);

    const formData = new FormData();
    formData.append("image", blob); // Changed from "image_file" to "image" to match server expectations
    formData.append("target_width", targetWidth);
    formData.append("target_height", targetHeight);

    fetch("/upscale-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to upscale image");
        }
        return response.blob();
      })
      .then((upscaledBlob) => {
        const url = window.URL.createObjectURL(upscaledBlob);
        document.getElementById("croppedImageDisplay").src = url;

        const fileSizeInBytes = upscaledBlob.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        croppedImageSize.textContent = `${fileSizeInMB} MB`;
        croppedImageDimensions.textContent = `${targetWidth}x${targetHeight}px`;

        const downloadButton = document.createElement("a");
        downloadButton.href = url;
        downloadButton.download = `${originalFileName}_upscaled.${formatSelect.value}`;
        downloadButton.click();
      })
      .catch((error) => {
        console.error("Error upscaling the image:", error);
        alert("Failed to upscale the image.");
      });
  }
});

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("mediaInput");
//   const imageDisplay = document.getElementById("imageDisplay");
//   const overlay = document.getElementById("overlay");
//   const imageContainer = document.getElementById("videoContainer");
//   const sizeSelector = document.getElementById("sizeSelector");
//   const formatSelect = document.getElementById("formatSelect");
//   const handle = overlay.querySelector(".resize-handle");
//   const notification = document.getElementById("processingNotification");
//   const uploadedImageSize = document.getElementById("uploadedImageSize");
//   const uploadedImageDimensions = document.getElementById("uploadedImageDimensions");
//   const croppedImageSize = document.getElementById("croppedImageSize");
//   const croppedImageDimensions = document.getElementById("croppedImageDimensions");
//   const downloadButton = document.getElementById("downloadButton");

//   let scaleX, scaleY;
//   let isResizing = false;
//   let canDrag = false;
//   let originalFileName = "";
//   let aspectRatio = null;

//   overlay.style.display = "none";

//   function setOverlaySize(ratio) {
//     const { width, height } = imageContainer.getBoundingClientRect();
//     let overlayWidth, overlayHeight;

//     switch (ratio) {
//       case "16:9":
//         aspectRatio = 16 / 9;
//         overlayWidth = width;
//         overlayHeight = overlayWidth / aspectRatio;
//         makeResizable(overlay);
//         handle.style.display = "block";
//         break;
//       case "9:16":
//         aspectRatio = 9 / 16;
//         overlayHeight = height;
//         overlayWidth = overlayHeight * aspectRatio;
//         if (overlayWidth > width) {
//           overlayWidth = width;
//           overlayHeight = overlayWidth / aspectRatio;
//         }
//         makeResizable(overlay);
//         handle.style.display = "block";
//         break;
//       case "1:1":
//         aspectRatio = 1;
//         overlayWidth = Math.min(width, height);
//         overlayHeight = overlayWidth;
//         makeResizable(overlay);
//         handle.style.display = "block";
//         break;
//       case "8:3":
//         aspectRatio = 8 / 3;
//         overlayWidth = width;
//         overlayHeight = overlayWidth / aspectRatio;
//         makeResizable(overlay);
//         handle.style.display = "block";
//         break;
//       case "custom":
//         overlayWidth = 200;
//         overlayHeight = 150;
//         aspectRatio = null;
//         makeCustomResizable(overlay);
//         handle.style.display = "block";
//         break;
//       default:
//         overlayWidth = width;
//         overlayHeight = height;
//         handle.style.display = "none";
//         break;
//     }

//     overlay.style.width = `${overlayWidth}px`;
//     overlay.style.height = `${overlayHeight}px`;
//     centerOverlay();
//   }

//   function centerOverlay() {
//     const parentRect = imageContainer.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();
//     overlay.style.top = `${Math.max(0, (parentRect.height - overlayRect.height) / 2)}px`;
//     overlay.style.left = `${Math.max(0, (parentRect.width - overlayRect.width) / 2)}px`;
//   }

//   function updateOverlay() {
//     overlay.style.display = "block";
//     setOverlaySize(sizeSelector.value);
//   }

//   sizeSelector.addEventListener("change", function () {
//     updateOverlay();
//   });

//   imageInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     originalFileName = file.name.replace(/\.[^/.]+$/, "");
//     const originalImageUrl = URL.createObjectURL(file);
//     imageDisplay.src = originalImageUrl;
//     imageDisplay.style.display = "block";
//     imageDisplay.onload = function () {
//       scaleX = imageDisplay.naturalWidth / imageDisplay.getBoundingClientRect().width;
//       scaleY = imageDisplay.naturalHeight / imageDisplay.getBoundingClientRect().height;

//       const fileSizeInBytes = file.size;
//       const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//       uploadedImageSize.textContent = `${fileSizeInMB} MB`;
//       uploadedImageDimensions.textContent = `${imageDisplay.naturalWidth}x${imageDisplay.naturalHeight}px`;

//       updateOverlay();
//     };
//   });

//   function makeDraggable(element) {
//     let pos1 = 0,
//       pos2 = 0,
//       pos3 = 0,
//       pos4 = 0;

//     element.addEventListener("mousedown", function (e) {
//       if (isResizing) return;

//       e.preventDefault();
//       pos3 = e.clientX;
//       pos4 = e.clientY;
//       canDrag = true;

//       document.onmouseup = function () {
//         document.onmouseup = null;
//         document.onmousemove = null;
//         canDrag = false;
//       };
//       document.onmousemove = function (e) {
//         if (!canDrag) return;

//         e.preventDefault();
//         pos1 = pos3 - e.clientX;
//         pos2 = pos4 - e.clientY;
//         pos3 = e.clientX;
//         pos4 = e.clientY;

//         let newTop = element.offsetTop - pos2;
//         let newLeft = element.offsetLeft - pos1;

//         newTop = Math.max(0, Math.min(newTop, imageContainer.offsetHeight - element.offsetHeight));
//         newLeft = Math.max(0, Math.min(newLeft, imageContainer.offsetWidth - element.offsetWidth));

//         element.style.top = `${newTop}px`;
//         element.style.left = `${newLeft}px`;
//       };
//     });
//   }

//   function makeResizable(element) {
//     handle.addEventListener("mousedown", function (e) {
//       isResizing = true;
//       canDrag = false;

//       e.preventDefault();
//       const startX = e.clientX;
//       const startY = e.clientY;
//       const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
//       const startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);

//       function doDrag(event) {
//         const dx = event.clientX - startX;
//         const dy = event.clientY - startY;

//         let newWidth = startWidth + dx;
//         let newHeight = startHeight + dy;

//         if (aspectRatio) {
//           if (newWidth / newHeight > aspectRatio) {
//             newHeight = newWidth / aspectRatio;
//           } else {
//             newWidth = newHeight * aspectRatio;
//           }
//         }

//         const imageBounds = imageContainer.getBoundingClientRect();
//         const maxWidth = Math.min(imageBounds.width - element.offsetLeft, imageBounds.height * (aspectRatio || newHeight / newWidth));
//         const maxHeight = Math.min(imageBounds.height - element.offsetTop, imageBounds.width / (aspectRatio || newWidth / newHeight));

//         if (newWidth > maxWidth) {
//           newWidth = maxWidth;
//           newHeight = newWidth / (aspectRatio || 1);
//         }
//         if (newHeight > maxHeight) {
//           newHeight = maxHeight;
//           newWidth = newHeight * (aspectRatio || 1);
//         }

//         element.style.width = `${newWidth}px`;
//         element.style.height = `${newHeight}px`;

//         if (parseInt(element.style.width, 10) < 50) {
//           element.style.width = "50px";
//         }
//         if (parseInt(element.style.height, 10) < 50) {
//           element.style.height = "50px";
//         }
//       }

//       function stopDrag() {
//         isResizing = false;
//         document.removeEventListener("mousemove", doDrag);
//         document.removeEventListener("mouseup", stopDrag);
//         canDrag = true;
//       }

//       document.addEventListener("mousemove", doDrag);
//       document.addEventListener("mouseup", stopDrag);
//     });
//   }

//   function makeCustomResizable(element) {
//     handle.addEventListener("mousedown", function (e) {
//       isResizing = true;
//       canDrag = false;

//       e.preventDefault();
//       const startX = e.clientX;
//       const startY = e.clientY;
//       const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
//       const startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);

//       function doDrag(event) {
//         const dx = event.clientX - startX;
//         const dy = event.clientY - startY;

//         let newWidth = startWidth + dx;
//         let newHeight = startHeight + dy;

//         const imageBounds = imageContainer.getBoundingClientRect();

//         if (element.offsetLeft + newWidth > imageBounds.width) {
//           newWidth = imageBounds.width - element.offsetLeft;
//         }
//         if (element.offsetTop + newHeight > imageBounds.height) {
//           newHeight = imageBounds.height - element.offsetTop;
//         }

//         element.style.width = `${newWidth}px`;
//         element.style.height = `${newHeight}px`;

//         if (newWidth < 50) {
//           element.style.width = "50px";
//         }
//         if (newHeight < 50) {
//           element.style.height = "50px";
//         }
//       }

//       function stopDrag() {
//         isResizing = false;
//         document.removeEventListener("mousemove", doDrag);
//         document.removeEventListener("mouseup", stopDrag);
//         canDrag = true;
//       }

//       document.addEventListener("mousemove", doDrag);
//       document.addEventListener("mouseup", stopDrag);
//     });
//   }

//   makeDraggable(overlay);
//   makeCustomResizable(overlay);

//   document.getElementById("uploadForm").addEventListener("submit", function (event) {
//     event.preventDefault();
//     const imageRect = imageDisplay.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();

//     notification.style.display = "block";

//     const cropWidth = overlayRect.width * scaleX;
//     const cropHeight = overlayRect.height * scaleY;
//     const cropLeft = (overlayRect.left - imageRect.left) * scaleX;
//     const cropTop = (overlayRect.top - imageRect.top) * scaleY;

//     let formData = new FormData();
//     formData.append("media", document.getElementById("mediaInput").files[0]);
//     formData.append("width", Math.round(cropWidth));
//     formData.append("height", Math.round(cropHeight));
//     formData.append("left", Math.round(cropLeft));
//     formData.append("top", Math.round(cropTop));
//     formData.append("format", formatSelect.value);

//     fetch("/upload-image", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Network response was not ok " + response.statusText);
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         const url = window.URL.createObjectURL(blob);
//         document.getElementById("croppedImageDisplay").src = url;
//         notification.style.display = "none";

//         const fileSizeInBytes = blob.size;
//         const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
//         croppedImageSize.textContent = `${fileSizeInMB} MB`;
//         croppedImageDimensions.textContent = `${Math.round(cropWidth)}x${Math.round(cropHeight)}px`;

//         downloadButton.style.display = "inline-block";
//         downloadButton.addEventListener("click", function () {
//           const a = document.createElement("a");
//           a.href = url;
//           a.download = `${originalFileName}_crop.${formatSelect.value}`;
//           document.body.appendChild(a);
//           a.click();
//           document.body.removeChild(a);
//         });
//       })
//       .catch((error) => {
//         console.error("Error uploading the image:", error);
//         notification.style.display = "none";
//       });
//   });
// });

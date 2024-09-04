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

  overlay.style.display = "none";

  function updateOverlay() {
    overlay.style.display = "block";

    if (sizeSelector.value === "custom") {
      handle.style.display = "block";
    } else {
      handle.style.display = "none";
    }

    setOverlaySize(sizeSelector.value);
  }

  function setOverlaySize(ratio) {
    const { width, height } = imageContainer.getBoundingClientRect();
    let overlayWidth, overlayHeight;

    switch (ratio) {
      case "2:1":
        overlayWidth = width;
        overlayHeight = width / 2;
        break;
      case "2:1-small":
        overlayWidth = width * 0.7;
        overlayHeight = overlayWidth / 2;
        break;
      case "3:1":
        overlayWidth = width;
        overlayHeight = height / 3;
        break;
      case "9:16":
        overlayHeight = height;
        overlayWidth = overlayHeight * (9 / 16);
        if (overlayWidth > width) {
          overlayWidth = width;
          overlayHeight = overlayWidth * (16 / 9);
        }
        break;
      case "custom":
        overlayWidth = 200;
        overlayHeight = 150;
        makeResizable(overlay);
        break;
      default:
        overlayWidth = width;
        overlayHeight = height;
        break;
    }

    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    centerOverlay();
  }

  function centerOverlay() {
    const parentRect = imageContainer.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    overlay.style.top = `${(parentRect.height - overlayRect.height) / 2}px`;
    overlay.style.left = `${(parentRect.width - overlayRect.width) / 2}px`;
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

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
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

        element.style.width = `${startWidth + dx}px`;
        element.style.height = `${startHeight + dy}px`;

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

  makeDraggable(overlay);
  makeResizable(overlay);

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
});

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("mediaInput");
//   const imageDisplay = document.getElementById("imageDisplay");
//   const overlay = document.getElementById("overlay");
//   const imageContainer = document.getElementById("videoContainer");
//   const sizeSelector = document.getElementById("sizeSelector");
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

//   overlay.style.display = "none";

//   function updateOverlay() {
//     overlay.style.display = "block";

//     if (sizeSelector.value === "custom") {
//       handle.style.display = "block";
//     } else {
//       handle.style.display = "none";
//     }

//     setOverlaySize(sizeSelector.value);
//   }

//   function setOverlaySize(ratio) {
//     const { width, height } = imageContainer.getBoundingClientRect();
//     let overlayWidth, overlayHeight;

//     switch (ratio) {
//       case "2:1":
//         overlayWidth = width;
//         overlayHeight = width / 2;
//         break;
//       case "2:1-small":
//         overlayWidth = width * 0.7;
//         overlayHeight = overlayWidth / 2;
//         break;
//       case "3:1":
//         overlayWidth = width;
//         overlayHeight = height / 3;
//         break;
//       case "9:16":
//         overlayHeight = height;
//         overlayWidth = overlayHeight * (9 / 16);
//         if (overlayWidth > width) {
//           overlayWidth = width;
//           overlayHeight = overlayWidth * (16 / 9);
//         }
//         break;
//       case "custom":
//         overlayWidth = 200;
//         overlayHeight = 150;
//         makeResizable(overlay);
//         break;
//       default:
//         overlayWidth = width;
//         overlayHeight = height;
//         break;
//     }

//     overlay.style.width = `${overlayWidth}px`;
//     overlay.style.height = `${overlayHeight}px`;
//     centerOverlay();
//   }

//   function centerOverlay() {
//     const parentRect = imageContainer.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();
//     overlay.style.top = `${(parentRect.height - overlayRect.height) / 2}px`;
//     overlay.style.left = `${(parentRect.width - overlayRect.width) / 2}px`;
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

//         element.style.top = newTop + "px";
//         element.style.left = newLeft + "px";
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

//         element.style.width = `${startWidth + dx}px`;
//         element.style.height = `${startHeight + dy}px`;

//         // Ensure the overlay does not resize below a certain minimum size
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

//   makeDraggable(overlay);
//   makeResizable(overlay);

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
//           a.download = `${originalFileName}_crop.png`;
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

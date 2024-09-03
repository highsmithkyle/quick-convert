// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("imageInput");
//   const imageDisplay = document.getElementById("imageDisplay");
//   const overlay = document.getElementById("overlay");
//   const imageContainer = document.getElementById("imageContainer");
//   const sizeSelector = document.getElementById("sizeSelector");
//   let originalImageUrl = "";

//   function updateOverlay() {
//     overlay.style.display = "block";
//     setOverlaySize("default");
//   }

//   function setOverlaySize(ratio) {
//     const { width, height } = imageContainer.getBoundingClientRect();

//     switch (ratio) {
//       case "2:1":
//         overlay.style.width = `${width}px`;
//         overlay.style.height = `${width / 2}px`;
//         break;
//       case "2:1-small":
//         let smallWidth = width * 0.7;
//         overlay.style.width = `${smallWidth}px`;
//         overlay.style.height = `${smallWidth / 2}px`;
//         break;
//       case "3:1":
//         overlay.style.width = `${width}px`;
//         overlay.style.height = `${height / 3}px`;
//         break;
//       case "9:16":
//         let overlayHeight = height;
//         let overlayWidth = overlayHeight * (9 / 16);
//         if (overlayWidth > width) {
//           overlayWidth = width;
//           overlayHeight = overlayWidth * (16 / 9);
//         }
//         overlay.style.width = `${overlayWidth}px`;
//         overlay.style.height = `${overlayHeight}px`;
//         break;
//       default:
//         overlay.style.width = "100%";
//         overlay.style.height = "100%";
//         break;
//     }
//     centerOverlay();
//   }

//   function centerOverlay() {
//     const parentRect = imageContainer.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();
//     overlay.style.top = `${(parentRect.height - overlayRect.height) / 2}px`;
//     overlay.style.left = `${(parentRect.width - overlayRect.width) / 2}px`;
//   }

//   sizeSelector.addEventListener("change", function () {
//     setOverlaySize(this.value);
//   });

//   imageInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     originalImageUrl = URL.createObjectURL(file);
//     imageDisplay.src = originalImageUrl;
//     imageDisplay.style.display = "block";
//     imageDisplay.onload = function () {
//       updateOverlay();
//     };
//   });

//   function makeDraggable(element) {
//     let pos1 = 0,
//       pos2 = 0,
//       pos3 = 0,
//       pos4 = 0;
//     element.addEventListener("mousedown", function (e) {
//       e.preventDefault();
//       pos3 = e.clientX;
//       pos4 = e.clientY;
//       document.onmouseup = function () {
//         document.onmouseup = null;
//         document.onmousemove = null;
//       };
//       document.onmousemove = function (e) {
//         e.preventDefault();
//         pos1 = pos3 - e.clientX;
//         pos2 = pos4 - e.clientY;
//         pos3 = e.clientX;
//         pos4 = e.clientY;
//         let newTop = element.offsetTop - pos2;
//         let newLeft = element.offsetLeft - pos1;

//         // Constrain crop area within image container
//         newTop = Math.max(0, Math.min(newTop, imageContainer.offsetHeight - element.offsetHeight));
//         newLeft = Math.max(0, Math.min(newLeft, imageContainer.offsetWidth - element.offsetWidth));

//         element.style.top = newTop + "px";
//         element.style.left = newLeft + "px";
//       };
//     });
//   }

//   makeDraggable(overlay);

//   document.getElementById("uploadForm").addEventListener("submit", function (event) {
//     event.preventDefault();
//     const imageRect = imageDisplay.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();

//     const notification = document.getElementById("processingNotification");
//     notification.style.display = "block";

//     // Calculate the scale factors
//     const scaleX = imageDisplay.naturalWidth / imageRect.width;
//     const scaleY = imageDisplay.naturalHeight / imageRect.height;

//     // Calculate the crop dimensions based on the actual size of the image
//     const cropWidth = overlayRect.width * scaleX;
//     const cropHeight = overlayRect.height * scaleY;
//     const cropLeft = (overlayRect.left - imageRect.left) * scaleX;
//     const cropTop = (overlayRect.top - imageRect.top) * scaleY;

//     // Set values
//     let formData = new FormData();
//     formData.append("image", imageInput.files[0]);
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
//         const croppedImageDisplay = document.getElementById("croppedImageDisplay");
//         croppedImageDisplay.src = url;

//         notification.style.display = "none";
//       })
//       .catch((error) => {
//         console.error("Problem with fetch operation:", error);
//         alert("Error cropping image: " + error.message);
//         notification.style.display = "none";
//       });
//   });
// });

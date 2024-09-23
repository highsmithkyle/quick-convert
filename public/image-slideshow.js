document.addEventListener("DOMContentLoaded", function () {
  const addImageButton = document.getElementById("addImageButton");
  const imageContainer = document.getElementById("imageContainer");
  const createVideoButton = document.getElementById("createVideoButton");
  const processingNotification = document.getElementById("processingNotification");
  const videoContainerTitle = document.querySelector(".video-container h3");
  const handlingOption = document.getElementById("handlingOption");
  const outputWidthInput = document.getElementById("outputWidth");
  const outputHeightInput = document.getElementById("outputHeight");
  const modal = document.getElementById("cropModal");
  const modalImageContainer = document.getElementById("modalImageContainer");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalCloseButton = document.getElementById("modalCloseButton");
  const overlay = document.getElementById("overlay");
  const cropSizeSelector = document.getElementById("cropSizeSelector");
  const handle = overlay.querySelector(".resize-handle");
  let selectedFiles = [];
  let durations = [];
  let aspectRatio = null;
  let isResizing = false;
  let canDrag = false;

  function addImages(files) {
    Array.from(files).forEach((file) => {
      selectedFiles.push(file);
      durations.push(3);

      const currentIndex = imageContainer.querySelectorAll(".image-container:not(.add-image-container)").length;

      const container = document.createElement("div");
      container.classList.add("image-container");
      container.setAttribute("data-index", currentIndex);

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.classList.add("slideshow-image");

      const buttonTitleContainer = document.createElement("div");
      buttonTitleContainer.classList.add("button-title-container");

      const title = document.createElement("p");
      title.classList.add("image-title");
      title.textContent = `Image ${currentIndex + 1}`;

      const cropButton = document.createElement("button");
      cropButton.classList.add("image-slideshow-crop-button");
      cropButton.addEventListener("click", () => openCropModal(file, currentIndex + 1));

      const closeButton = document.createElement("button");
      closeButton.classList.add("image-slideshow-close-button");
      closeButton.addEventListener("click", function () {
        const index = parseInt(container.getAttribute("data-index"), 10);

        if (index >= 0 && index < selectedFiles.length) {
          selectedFiles.splice(index, 1);
          durations.splice(index, 1);

          container.remove();
          updateTitles();
        }
      });

      buttonTitleContainer.appendChild(cropButton);
      buttonTitleContainer.appendChild(title);
      buttonTitleContainer.appendChild(closeButton);

      container.appendChild(buttonTitleContainer);
      container.appendChild(img);

      const durationContainer = document.createElement("span");
      durationContainer.classList.add("duration-container");

      const durationLabel = document.createElement("label");
      durationLabel.textContent = "Duration: ";

      const durationInput = document.createElement("input");
      durationInput.type = "number";
      durationInput.min = "1";
      durationInput.value = "3";
      durationInput.classList.add("duration-input");

      const durationSuffix = document.createElement("span");
      durationSuffix.textContent = "s";

      durationInput.addEventListener("change", function () {
        const index = parseInt(container.getAttribute("data-index"), 10);
        if (index >= 0 && index < durations.length) {
          durations[index] = parseInt(durationInput.value, 10);
        }
      });

      durationContainer.appendChild(durationLabel);
      durationContainer.appendChild(durationInput);
      durationContainer.appendChild(durationSuffix);

      container.appendChild(durationContainer);
      imageContainer.insertBefore(container, addImageButton);
    });

    updateTitles();
    initializeSortable();
  }

  function openCropModal(file, index) {
    modalImage.src = URL.createObjectURL(file);
    modalTitle.textContent = `Image ${index}`;
    modal.style.display = "flex";
    setTimeout(() => {
      modal.classList.add("show");
      initializeOverlay();
    }, 10);
  }

  function initializeOverlay() {
    const modalRect = modalImageContainer.getBoundingClientRect();
    overlay.style.width = `${modalRect.width * 0.8}px`;
    overlay.style.height = `${modalRect.height * 0.8}px`;
    overlay.style.top = `${(modalRect.height - overlay.offsetHeight) / 2}px`;
    overlay.style.left = `${(modalRect.width - overlay.offsetWidth) / 2}px`;
    overlay.style.display = "block";
    makeDraggable(overlay, modalImageContainer);
    makeResizable(overlay, modalImageContainer);
    updateOverlay();
  }

  function closeModal() {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }

  modalCloseButton.addEventListener("click", closeModal);

  cropSizeSelector.addEventListener("change", updateOverlay);

  function updateOverlay() {
    const ratio = cropSizeSelector.value;
    const { width, height } = modalImageContainer.getBoundingClientRect();
    let overlayWidth, overlayHeight;

    switch (ratio) {
      case "16:9":
        aspectRatio = 16 / 9;
        overlayWidth = width;
        overlayHeight = overlayWidth / aspectRatio;
        break;
      case "9:16":
        aspectRatio = 9 / 16;
        overlayHeight = height;
        overlayWidth = overlayHeight * aspectRatio;
        break;
      case "1:1":
        aspectRatio = 1;
        overlayWidth = Math.min(width, height);
        overlayHeight = overlayWidth;
        break;
      case "8:3":
        aspectRatio = 8 / 3;
        overlayWidth = width;
        overlayHeight = overlayWidth / aspectRatio;
        break;
      case "custom":
        overlayWidth = 200;
        overlayHeight = 150;
        aspectRatio = null;
        break;
      default:
        overlayWidth = width * 0.8;
        overlayHeight = height * 0.8;
        break;
    }

    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    overlay.style.top = `${(height - overlayHeight) / 2}px`;
    overlay.style.left = `${(width - overlayWidth) / 2}px`;
  }

  function makeDraggable(element, container) {
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

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Prevent dragging outside the container for both custom and aspect ratios
        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;
        if (newTop + elementRect.height > containerRect.height) {
          newTop = containerRect.height - elementRect.height;
        }
        if (newLeft + elementRect.width > containerRect.width) {
          newLeft = containerRect.width - elementRect.width;
        }

        element.style.top = `${newTop}px`;
        element.style.left = `${newLeft}px`;
      };
    });
  }

  function makeResizable(element, container) {
    handle.style.display = "block";

    handle.onmousedown = function (e) {
      e.preventDefault();
      isResizing = true;
      canDrag = false;
      document.onmousemove = resizeElement;
      document.onmouseup = stopResize;
    };

    function resizeElement(e) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      let newWidth = e.clientX - elementRect.left;
      let newHeight = e.clientY - elementRect.top;

      if (aspectRatio) {
        if (newWidth / newHeight > aspectRatio) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }

      if (newWidth + elementRect.left > containerRect.right) {
        newWidth = containerRect.right - elementRect.left;
        newHeight = newWidth / (aspectRatio || 1);
      }
      if (newHeight + elementRect.top > containerRect.bottom) {
        newHeight = containerRect.bottom - elementRect.top;
        newWidth = newHeight * (aspectRatio || 1);
      }

      if (newWidth < 50) newWidth = 50;
      if (newHeight < 50) newHeight = 50;

      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;
    }

    function stopResize() {
      isResizing = false;
      document.onmousemove = null;
      document.onmouseup = null;
      canDrag = true;
    }
  }

  function updateTitles() {
    const containers = document.querySelectorAll(".image-container:not(.add-image-container)");
    containers.forEach((container, index) => {
      const title = container.querySelector(".image-title");
      title.textContent = `Image ${index + 1}`;
      container.setAttribute("data-index", index);
    });
  }

  function initializeSortable() {
    new Sortable(imageContainer, {
      animation: 150,
      ghostClass: "dragging",
      onEnd: function () {
        const newOrderContainers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);
        const newSelectedFiles = [];
        const newDurations = [];

        newOrderContainers.forEach((container) => {
          const index = parseInt(container.getAttribute("data-index"), 10);
          if (index >= 0) {
            const durationInput = container.querySelector(".duration-input");
            newSelectedFiles.push(selectedFiles[index]);
            newDurations.push(parseInt(durationInput.value, 10));
          }
        });

        selectedFiles = newSelectedFiles;
        durations = newDurations;
        updateTitles();
      },
    });
  }

  handlingOption.addEventListener("change", function () {
    if (handlingOption.value === "cropToSmallest") {
      let minWidth = Infinity;
      let minHeight = Infinity;

      selectedFiles.forEach((file) => {
        const imageElement = new Image();
        imageElement.src = URL.createObjectURL(file);
        imageElement.onload = function () {
          if (imageElement.width < minWidth) {
            minWidth = imageElement.width;
          }
          if (imageElement.height < minHeight) {
            minHeight = imageElement.height;
          }

          outputWidthInput.value = minWidth;
          outputHeightInput.value = minHeight;
        };
      });
    }
  });

  addImageButton.addEventListener("click", function () {
    const imagesInput = document.createElement("input");
    imagesInput.type = "file";
    imagesInput.accept = "image/*";
    imagesInput.multiple = true;
    imagesInput.style.display = "none";
    imagesInput.click();

    imagesInput.addEventListener("change", function (event) {
      const files = event.target.files;
      addImages(files);
    });
  });

  createVideoButton.addEventListener("click", function () {
    const imageContainers = document.querySelectorAll(".image-container:not(.add-image-container)");
    const outputWidth = outputWidthInput.value;
    const outputHeight = outputHeightInput.value;
    const selectedHandlingOption = handlingOption.value;

    durations = Array.from(imageContainers).map((container) => {
      const durationInput = container.querySelector(".duration-input");
      return parseInt(durationInput.value, 10);
    });

    if (selectedFiles.length !== durations.length) {
      alert("Mismatch between number of images and durations.");
      return;
    }

    const formData = new FormData();
    processingNotification.style.display = "block";

    selectedFiles.forEach((file, index) => {
      formData.append("images", file);
      formData.append(`duration${index}`, durations[index]);
    });

    formData.append("durations", JSON.stringify(durations));
    formData.append("outputWidth", outputWidth);
    formData.append("outputHeight", outputHeight);
    formData.append("handlingOption", selectedHandlingOption);

    fetch("/create-video", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to create video");
        }
        return response.json();
      })
      .then((data) => {
        const videoUrl = data.videoPath;
        const videoElement = document.getElementById("processedVideo");
        videoElement.src = videoUrl;
        videoElement.style.display = "block";
        fetchVideoDimensions(videoUrl);
        processingNotification.style.display = "none";
      })
      .catch(() => {
        processingNotification.style.display = "none";
      });
  });

  function fetchVideoDimensions(videoUrl) {
    let videoInfoElement = document.createElement("span");
    videoInfoElement.style.fontWeight = "normal";
    videoInfoElement.style.fontSize = "14px";
    videoInfoElement.style.marginLeft = "8px";
    videoContainerTitle.appendChild(videoInfoElement);

    const videoElement = document.createElement("video");
    videoElement.src = videoUrl;

    videoElement.onloadedmetadata = function () {
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      videoInfoElement.textContent = ` (${width}x${height})`;
    };
  }
});

// document.addEventListener("DOMContentLoaded", function () {
//   const addImageButton = document.getElementById("addImageButton");
//   const imageContainer = document.getElementById("imageContainer");
//   const createVideoButton = document.getElementById("createVideoButton");
//   const processingNotification = document.getElementById("processingNotification");
//   const videoContainerTitle = document.querySelector(".video-container h3");
//   const handlingOption = document.getElementById("handlingOption");
//   const outputWidthInput = document.getElementById("outputWidth");
//   const outputHeightInput = document.getElementById("outputHeight");
//   const modal = document.getElementById("cropModal");
//   const modalImageContainer = document.getElementById("modalImageContainer");
//   const modalImage = document.getElementById("modalImage");
//   const modalTitle = document.getElementById("modalTitle");
//   const modalCloseButton = document.getElementById("modalCloseButton");
//   const overlay = document.getElementById("overlay");
//   const cropSizeSelector = document.getElementById("cropSizeSelector");
//   const handle = overlay.querySelector(".resize-handle");
//   let selectedFiles = [];
//   let durations = [];
//   let aspectRatio = null;
//   let isResizing = false;
//   let canDrag = false;

//   function addImages(files) {
//     Array.from(files).forEach((file) => {
//       selectedFiles.push(file);
//       durations.push(3);

//       const currentIndex = imageContainer.querySelectorAll(".image-container:not(.add-image-container)").length;

//       const container = document.createElement("div");
//       container.classList.add("image-container");
//       container.setAttribute("data-index", currentIndex);

//       const img = document.createElement("img");
//       img.src = URL.createObjectURL(file);
//       img.classList.add("slideshow-image");

//       const buttonTitleContainer = document.createElement("div");
//       buttonTitleContainer.classList.add("button-title-container");

//       const title = document.createElement("p");
//       title.classList.add("image-title");
//       title.textContent = `Image ${currentIndex + 1}`;

//       const cropButton = document.createElement("button");
//       cropButton.classList.add("image-slideshow-crop-button");
//       cropButton.addEventListener("click", () => openCropModal(file, currentIndex + 1));

//       const closeButton = document.createElement("button");
//       closeButton.classList.add("image-slideshow-close-button");
//       closeButton.addEventListener("click", function () {
//         const index = parseInt(container.getAttribute("data-index"), 10);

//         if (index >= 0 && index < selectedFiles.length) {
//           selectedFiles.splice(index, 1);
//           durations.splice(index, 1);

//           container.remove();
//           updateTitles();
//         }
//       });

//       buttonTitleContainer.appendChild(cropButton);
//       buttonTitleContainer.appendChild(title);
//       buttonTitleContainer.appendChild(closeButton);

//       container.appendChild(buttonTitleContainer);
//       container.appendChild(img);

//       const durationContainer = document.createElement("span");
//       durationContainer.classList.add("duration-container");

//       const durationLabel = document.createElement("label");
//       durationLabel.textContent = "Duration: ";

//       const durationInput = document.createElement("input");
//       durationInput.type = "number";
//       durationInput.min = "1";
//       durationInput.value = "3";
//       durationInput.classList.add("duration-input");

//       const durationSuffix = document.createElement("span");
//       durationSuffix.textContent = "s";

//       durationInput.addEventListener("change", function () {
//         const index = parseInt(container.getAttribute("data-index"), 10);
//         if (index >= 0 && index < durations.length) {
//           durations[index] = parseInt(durationInput.value, 10);
//         }
//       });

//       durationContainer.appendChild(durationLabel);
//       durationContainer.appendChild(durationInput);
//       durationContainer.appendChild(durationSuffix);

//       container.appendChild(durationContainer);
//       imageContainer.insertBefore(container, addImageButton);
//     });

//     updateTitles();
//     initializeSortable();
//   }

//   function openCropModal(file, index) {
//     modalImage.src = URL.createObjectURL(file);
//     modalTitle.textContent = `Image ${index}`;
//     modal.style.display = "flex";
//     setTimeout(() => {
//       modal.classList.add("show");
//       initializeOverlay();
//     }, 10);
//   }

//   function initializeOverlay() {
//     const modalRect = modalImageContainer.getBoundingClientRect();
//     overlay.style.width = `${modalRect.width * 0.8}px`;
//     overlay.style.height = `${modalRect.height * 0.8}px`;
//     overlay.style.top = `${(modalRect.height - overlay.offsetHeight) / 2}px`;
//     overlay.style.left = `${(modalRect.width - overlay.offsetWidth) / 2}px`;
//     overlay.style.display = "block";
//     makeDraggable(overlay, modalImageContainer);
//     makeResizable(overlay, modalImageContainer);
//     updateOverlay();
//   }

//   function closeModal() {
//     modal.classList.remove("show");
//     setTimeout(() => {
//       modal.style.display = "none";
//     }, 300);
//   }

//   modalCloseButton.addEventListener("click", closeModal);

//   cropSizeSelector.addEventListener("change", updateOverlay);

//   function updateOverlay() {
//     const ratio = cropSizeSelector.value;
//     const { width, height } = modalImageContainer.getBoundingClientRect();
//     let overlayWidth, overlayHeight;

//     switch (ratio) {
//       case "16:9":
//         aspectRatio = 16 / 9;
//         overlayWidth = width;
//         overlayHeight = overlayWidth / aspectRatio;
//         break;
//       case "9:16":
//         aspectRatio = 9 / 16;
//         overlayHeight = height;
//         overlayWidth = overlayHeight * aspectRatio;
//         break;
//       case "1:1":
//         aspectRatio = 1;
//         overlayWidth = Math.min(width, height);
//         overlayHeight = overlayWidth;
//         break;
//       case "8:3":
//         aspectRatio = 8 / 3;
//         overlayWidth = width;
//         overlayHeight = overlayWidth / aspectRatio;
//         break;
//       case "custom":
//         overlayWidth = 200;
//         overlayHeight = 150;
//         aspectRatio = null;
//         break;
//       default:
//         overlayWidth = width * 0.8;
//         overlayHeight = height * 0.8;
//         break;
//     }

//     // Ensure overlay is centered and fits within the image container
//     overlay.style.width = `${overlayWidth}px`;
//     overlay.style.height = `${overlayHeight}px`;
//     overlay.style.top = `${(height - overlayHeight) / 2}px`;
//     overlay.style.left = `${(width - overlayWidth) / 2}px`;
//   }

//   function makeDraggable(element, container) {
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

//         const containerRect = container.getBoundingClientRect();
//         const elementRect = element.getBoundingClientRect();

//         // Ensure the element stays within the container
//         if (newTop < 0) newTop = 0;
//         if (newLeft < 0) newLeft = 0;
//         if (newTop + elementRect.height > containerRect.height) {
//           newTop = containerRect.height - elementRect.height;
//         }
//         if (newLeft + elementRect.width > containerRect.width) {
//           newLeft = containerRect.width - elementRect.width;
//         }

//         element.style.top = `${newTop}px`;
//         element.style.left = `${newLeft}px`;
//       };
//     });
//   }

//   function makeResizable(element, container) {
//     handle.style.display = "block"; // Show the resize handle

//     handle.onmousedown = function (e) {
//       e.preventDefault();
//       isResizing = true;
//       canDrag = false;
//       document.onmousemove = resizeElement;
//       document.onmouseup = stopResize;
//     };

//     function resizeElement(e) {
//       const containerRect = container.getBoundingClientRect();
//       const elementRect = element.getBoundingClientRect();

//       let newWidth = e.clientX - elementRect.left;
//       let newHeight = e.clientY - elementRect.top;

//       // Maintain aspect ratio if preset
//       if (aspectRatio) {
//         if (newWidth / newHeight > aspectRatio) {
//           newHeight = newWidth / aspectRatio;
//         } else {
//           newWidth = newHeight * aspectRatio;
//         }
//       }

//       // Ensure resizing does not exceed container bounds
//       if (newWidth + elementRect.left > containerRect.right) {
//         newWidth = containerRect.right - elementRect.left;
//         newHeight = newWidth / (aspectRatio || 1);
//       }
//       if (newHeight + elementRect.top > containerRect.bottom) {
//         newHeight = containerRect.bottom - elementRect.top;
//         newWidth = newHeight * (aspectRatio || 1);
//       }

//       // Minimum size constraint
//       if (newWidth < 50) newWidth = 50;
//       if (newHeight < 50) newHeight = 50;

//       element.style.width = `${newWidth}px`;
//       element.style.height = `${newHeight}px`;
//     }

//     function stopResize() {
//       isResizing = false;
//       document.onmousemove = null;
//       document.onmouseup = null;
//       canDrag = true;
//     }
//   }

//   function updateTitles() {
//     const containers = document.querySelectorAll(".image-container:not(.add-image-container)");
//     containers.forEach((container, index) => {
//       const title = container.querySelector(".image-title");
//       title.textContent = `Image ${index + 1}`;
//       container.setAttribute("data-index", index);
//     });
//   }

//   function initializeSortable() {
//     new Sortable(imageContainer, {
//       animation: 150,
//       ghostClass: "dragging",
//       onEnd: function () {
//         const newOrderContainers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);
//         const newSelectedFiles = [];
//         const newDurations = [];

//         newOrderContainers.forEach((container) => {
//           const index = parseInt(container.getAttribute("data-index"), 10);
//           if (index >= 0) {
//             const durationInput = container.querySelector(".duration-input");
//             newSelectedFiles.push(selectedFiles[index]);
//             newDurations.push(parseInt(durationInput.value, 10));
//           }
//         });

//         selectedFiles = newSelectedFiles;
//         durations = newDurations;
//         updateTitles();
//       },
//     });
//   }

//   handlingOption.addEventListener("change", function () {
//     if (handlingOption.value === "cropToSmallest") {
//       let minWidth = Infinity;
//       let minHeight = Infinity;

//       selectedFiles.forEach((file) => {
//         const imageElement = new Image();
//         imageElement.src = URL.createObjectURL(file);
//         imageElement.onload = function () {
//           if (imageElement.width < minWidth) {
//             minWidth = imageElement.width;
//           }
//           if (imageElement.height < minHeight) {
//             minHeight = imageElement.height;
//           }

//           outputWidthInput.value = minWidth;
//           outputHeightInput.value = minHeight;
//         };
//       });
//     }
//   });

//   addImageButton.addEventListener("click", function () {
//     const imagesInput = document.createElement("input");
//     imagesInput.type = "file";
//     imagesInput.accept = "image/*";
//     imagesInput.multiple = true;
//     imagesInput.style.display = "none";
//     imagesInput.click();

//     imagesInput.addEventListener("change", function (event) {
//       const files = event.target.files;
//       addImages(files);
//     });
//   });

//   createVideoButton.addEventListener("click", function () {
//     const imageContainers = document.querySelectorAll(".image-container:not(.add-image-container)");
//     const outputWidth = outputWidthInput.value;
//     const outputHeight = outputHeightInput.value;
//     const selectedHandlingOption = handlingOption.value;

//     durations = Array.from(imageContainers).map((container) => {
//       const durationInput = container.querySelector(".duration-input");
//       return parseInt(durationInput.value, 10);
//     });

//     if (selectedFiles.length !== durations.length) {
//       alert("Mismatch between number of images and durations.");
//       return;
//     }

//     const formData = new FormData();
//     processingNotification.style.display = "block";

//     selectedFiles.forEach((file, index) => {
//       formData.append("images", file);
//       formData.append(`duration${index}`, durations[index]);
//     });

//     formData.append("durations", JSON.stringify(durations));
//     formData.append("outputWidth", outputWidth);
//     formData.append("outputHeight", outputHeight);
//     formData.append("handlingOption", selectedHandlingOption);

//     fetch("/create-video", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Failed to create video");
//         }
//         return response.json();
//       })
//       .then((data) => {
//         const videoUrl = data.videoPath;
//         const videoElement = document.getElementById("processedVideo");
//         videoElement.src = videoUrl;
//         videoElement.style.display = "block";
//         fetchVideoDimensions(videoUrl);
//         processingNotification.style.display = "none";
//       })
//       .catch(() => {
//         processingNotification.style.display = "none";
//       });
//   });

//   function fetchVideoDimensions(videoUrl) {
//     let videoInfoElement = document.createElement("span");
//     videoInfoElement.style.fontWeight = "normal";
//     videoInfoElement.style.fontSize = "14px";
//     videoInfoElement.style.marginLeft = "8px";
//     videoContainerTitle.appendChild(videoInfoElement);

//     const videoElement = document.createElement("video");
//     videoElement.src = videoUrl;

//     videoElement.onloadedmetadata = function () {
//       const width = videoElement.videoWidth;
//       const height = videoElement.videoHeight;
//       videoInfoElement.textContent = ` (${width}x${height})`;
//     };
//   }
// });

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
  const cropButton = document.getElementById("cropButton");
  const handle = overlay.querySelector(".resize-handle");
  const instructionText = document.getElementById("headerInstruction");

  let selectedFiles = [];
  let durations = [];
  let aspectRatio = null;
  let isResizing = false;
  let canDrag = false;
  let scaleX, scaleY;

  // Default to 'Header Video'
  handlingOption.value = "headerBackground";

  // Hide inputs if 'Header Video' or '1:1 Square' is selected
  function updateHandlingOptionUI() {
    const outputWidthParent = outputWidthInput.parentElement;
    const outputHeightParent = outputHeightInput.parentElement;

    if (handlingOption.value === "headerBackground") {
      outputWidthParent.style.display = "none";
      outputHeightParent.style.display = "none";
      instructionText.textContent = "Please crop your images to the header background size by using the crop button located next to your image.";
      instructionText.style.display = "block";
    } else if (handlingOption.value === "square") {
      outputWidthParent.style.display = "none";
      outputHeightParent.style.display = "none";
      instructionText.textContent = "Please crop your images to the 1:1 square size by using the crop button located next to your image.";
      instructionText.style.display = "block";
    } else {
      outputWidthParent.style.display = "block";
      outputHeightParent.style.display = "block";
      instructionText.style.display = "none";
    }
  }

  // Call this function on initialization
  updateHandlingOptionUI();

  // Listen for changes in the dropdown to update the UI accordingly
  handlingOption.addEventListener("change", updateHandlingOptionUI);

  // Add images to the container
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

      img.onload = function () {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        updateImageTitle(container, currentIndex + 1, width, height);
      };

      const buttonTitleContainer = document.createElement("div");
      buttonTitleContainer.classList.add("button-title-container");

      const title = document.createElement("p");
      title.classList.add("image-title");

      const cropButton = document.createElement("button");
      cropButton.classList.add("image-slideshow-crop-button");
      cropButton.addEventListener("click", () => openCropModal(file, currentIndex + 1, container, img));

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

  function openCropModal(file, index, container, img) {
    const updatedFile = selectedFiles[container.getAttribute("data-index")];

    modalImage.src = URL.createObjectURL(updatedFile);
    modalTitle.textContent = `Image ${index}`;
    modal.style.display = "flex";

    modalImage.onload = function () {
      scaleX = modalImage.naturalWidth / modalImage.getBoundingClientRect().width;
      scaleY = modalImage.naturalHeight / modalImage.getBoundingClientRect().height;

      setTimeout(() => {
        modal.classList.add("show");
        initializeOverlay();

        const cropSizeContainer = cropSizeSelector.parentElement;

        const customOption = cropSizeSelector.querySelector('option[value="custom"]');
        if (customOption) {
          customOption.remove();
        }

        if (handlingOption.value === "headerBackground") {
          cropSizeSelector.value = "1000x400";
          cropSizeContainer.style.display = "none";
          updateOverlay();
        } else if (handlingOption.value === "square") {
          cropSizeSelector.value = "1:1";
          cropSizeContainer.style.display = "none";
          updateOverlay();
        } else {
          cropSizeContainer.style.display = "block";
        }
      }, 10);
    };

    cropButton.onclick = function () {
      cropImage(updatedFile, container, img);
    };
  }

  function cropImage(file, container, img) {
    const modalRect = modalImage.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    const scaleX = modalImage.naturalWidth / modalRect.width;
    const scaleY = modalImage.naturalHeight / modalRect.height;

    const cropWidth = overlayRect.width * scaleX;
    const cropHeight = overlayRect.height * scaleY;
    const cropLeft = (overlayRect.left - modalRect.left) * scaleX;
    const cropTop = (overlayRect.top - modalRect.top) * scaleY;

    if (cropWidth <= 0 || cropHeight <= 0 || cropLeft < 0 || cropTop < 0) {
      alert("Invalid crop dimensions");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("width", Math.round(cropWidth));
    formData.append("height", Math.round(cropHeight));
    formData.append("left", Math.round(cropLeft));
    formData.append("top", Math.round(cropTop));

    fetch("/crop-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        img.src = url;

        const index = container.getAttribute("data-index");
        selectedFiles[index] = new File([blob], file.name, { type: blob.type });

        updateImageTitle(container, index + 1, img.naturalWidth, img.naturalHeight);
        closeModal();
      })
      .catch((error) => {
        console.error("Error cropping the image:", error);
      });
  }

  function updateImageTitle(container, index, width, height) {
    const title = container.querySelector(".image-title");
    title.textContent = `Image ${index} (${width}x${height})`;
  }

  function closeModal() {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }

  modalCloseButton.addEventListener("click", closeModal);

  cropSizeSelector.addEventListener("change", updateOverlay);

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
      case "1000x400":
        aspectRatio = 1000 / 400;
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
      const img = container.querySelector("img");
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      updateImageTitle(container, index + 1, width, height);
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
    const outputWidthInput = document.getElementById("outputWidth").parentElement;
    const outputHeightInput = document.getElementById("outputHeight").parentElement;
    const instructionText = document.getElementById("headerInstruction");

    if (handlingOption.value === "headerBackground") {
      outputWidthInput.style.display = "none";
      outputHeightInput.style.display = "none";
      instructionText.textContent = "Please crop your images to the header background size by using the crop button located next to your image.";
      instructionText.style.display = "block";
      instructionText.style.color = "black";
    } else if (handlingOption.value === "square") {
      outputWidthInput.style.display = "none";
      outputHeightInput.style.display = "none";
      instructionText.textContent = "Please crop your images to the 1:1 square size by using the crop button located next to your image.";
      instructionText.style.display = "block";
      instructionText.style.color = "black";
    } else {
      outputWidthInput.style.display = "block";
      outputHeightInput.style.display = "block";
      instructionText.style.display = "none";
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
    if (handlingOption.value === "headerBackground" || handlingOption.value === "square") {
      let allImagesMatch = true;
      let imagesProcessed = 0;

      selectedFiles.forEach((file, index) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = function () {
          let expectedRatio;
          if (handlingOption.value === "headerBackground") {
            expectedRatio = 1000 / 400;
          } else if (handlingOption.value === "square") {
            expectedRatio = 1;
          }

          const aspectRatio = img.naturalWidth / img.naturalHeight;
          if (Math.abs(aspectRatio - expectedRatio) > 0.01) {
            allImagesMatch = false;
          }
          imagesProcessed++;

          if (imagesProcessed === selectedFiles.length) {
            if (!allImagesMatch) {
              let alertMessage =
                handlingOption.value === "headerBackground"
                  ? "Please use the crop tool to crop all images to the Header Background size."
                  : "Please use the crop tool to crop all images to a 1:1 Square size.";
              alert(alertMessage);
              return;
            }

            submitVideoCreationForm();
          }
        };
      });
    } else {
      submitVideoCreationForm();
    }
  });

  function submitVideoCreationForm() {
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
        clearExistingVideoDimensions();
        fetchVideoDimensions(videoUrl);
        processingNotification.style.display = "none";
      })
      .catch(() => {
        processingNotification.style.display = "none";
      });
  }

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

  function clearExistingVideoDimensions() {
    const existingDimensions = videoContainerTitle.querySelectorAll("span");
    existingDimensions.forEach((span) => span.remove());
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
//   const cropButton = document.getElementById("cropButton");
//   const handle = overlay.querySelector(".resize-handle");
//   let selectedFiles = [];
//   let durations = [];
//   let aspectRatio = null;
//   let isResizing = false;
//   let canDrag = false;
//   let scaleX, scaleY;

//   handlingOption.value = "headerBackground";

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

//       img.onload = function () {
//         const width = img.naturalWidth;
//         const height = img.naturalHeight;
//         updateImageTitle(container, currentIndex + 1, width, height);
//       };

//       const buttonTitleContainer = document.createElement("div");
//       buttonTitleContainer.classList.add("button-title-container");

//       const title = document.createElement("p");
//       title.classList.add("image-title");

//       const cropButton = document.createElement("button");
//       cropButton.classList.add("image-slideshow-crop-button");
//       cropButton.addEventListener("click", () => openCropModal(file, currentIndex + 1, container, img));

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

//   function openCropModal(file, index, container, img) {
//     const updatedFile = selectedFiles[container.getAttribute("data-index")];

//     modalImage.src = URL.createObjectURL(updatedFile);
//     modalTitle.textContent = `Image ${index}`;
//     modal.style.display = "flex";

//     modalImage.onload = function () {
//       scaleX = modalImage.naturalWidth / modalImage.getBoundingClientRect().width;
//       scaleY = modalImage.naturalHeight / modalImage.getBoundingClientRect().height;

//       setTimeout(() => {
//         modal.classList.add("show");
//         initializeOverlay();

//         const cropSizeContainer = cropSizeSelector.parentElement;

//         const customOption = cropSizeSelector.querySelector('option[value="custom"]');
//         if (customOption) {
//           customOption.remove();
//         }

//         if (handlingOption.value === "headerBackground") {
//           cropSizeSelector.value = "1000x400";
//           cropSizeContainer.style.display = "none";
//           updateOverlay();
//         } else if (handlingOption.value === "square") {
//           cropSizeSelector.value = "1:1";
//           cropSizeContainer.style.display = "none";
//           updateOverlay();
//         } else {
//           cropSizeContainer.style.display = "block";
//         }
//       }, 10);
//     };

//     cropButton.onclick = function () {
//       cropImage(updatedFile, container, img);
//     };
//   }

//   function cropImage(file, container, img) {
//     const modalRect = modalImage.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();

//     const scaleX = modalImage.naturalWidth / modalRect.width;
//     const scaleY = modalImage.naturalHeight / modalRect.height;

//     const cropWidth = overlayRect.width * scaleX;
//     const cropHeight = overlayRect.height * scaleY;
//     const cropLeft = (overlayRect.left - modalRect.left) * scaleX;
//     const cropTop = (overlayRect.top - modalRect.top) * scaleY;

//     if (cropWidth <= 0 || cropHeight <= 0 || cropLeft < 0 || cropTop < 0) {
//       alert("Invalid crop dimensions");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("image", file);
//     formData.append("width", Math.round(cropWidth));
//     formData.append("height", Math.round(cropHeight));
//     formData.append("left", Math.round(cropLeft));
//     formData.append("top", Math.round(cropTop));

//     fetch("/crop-image", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => response.blob())
//       .then((blob) => {
//         const url = window.URL.createObjectURL(blob);
//         img.src = url;

//         const index = container.getAttribute("data-index");
//         selectedFiles[index] = new File([blob], file.name, { type: blob.type });

//         updateImageTitle(container, index + 1, img.naturalWidth, img.naturalHeight);
//         closeModal();
//       })
//       .catch((error) => {
//         console.error("Error cropping the image:", error);
//       });
//   }

//   function updateImageTitle(container, index, width, height) {
//     const title = container.querySelector(".image-title");
//     title.textContent = `Image ${index} (${width}x${height})`;
//   }

//   function closeModal() {
//     modal.classList.remove("show");
//     setTimeout(() => {
//       modal.style.display = "none";
//     }, 300);
//   }

//   modalCloseButton.addEventListener("click", closeModal);

//   cropSizeSelector.addEventListener("change", updateOverlay);

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
//       case "1000x400":
//         aspectRatio = 1000 / 400;
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
//     handle.style.display = "block";

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

//       if (aspectRatio) {
//         if (newWidth / newHeight > aspectRatio) {
//           newHeight = newWidth / aspectRatio;
//         } else {
//           newWidth = newHeight * aspectRatio;
//         }
//       }

//       if (newWidth + elementRect.left > containerRect.right) {
//         newWidth = containerRect.right - elementRect.left;
//         newHeight = newWidth / (aspectRatio || 1);
//       }
//       if (newHeight + elementRect.top > containerRect.bottom) {
//         newHeight = containerRect.bottom - elementRect.top;
//         newWidth = newHeight * (aspectRatio || 1);
//       }

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
//       const img = container.querySelector("img");
//       const width = img.naturalWidth;
//       const height = img.naturalHeight;
//       updateImageTitle(container, index + 1, width, height);
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
//     const outputWidthInput = document.getElementById("outputWidth").parentElement;
//     const outputHeightInput = document.getElementById("outputHeight").parentElement;
//     const instructionText = document.getElementById("headerInstruction");

//     if (handlingOption.value === "headerBackground") {
//       outputWidthInput.style.display = "none";
//       outputHeightInput.style.display = "none";
//       instructionText.textContent = "Please crop your images to the header background size by using the crop button located next to your image.";
//       instructionText.style.display = "block";
//       instructionText.style.color = "black";
//     } else if (handlingOption.value === "square") {
//       outputWidthInput.style.display = "none";
//       outputHeightInput.style.display = "none";
//       instructionText.textContent = "Please crop your images to the 1:1 square size by using the crop button located next to your image.";
//       instructionText.style.display = "block";
//       instructionText.style.color = "black";
//     } else {
//       outputWidthInput.style.display = "block";
//       outputHeightInput.style.display = "block";
//       instructionText.style.display = "none";
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
//     if (handlingOption.value === "headerBackground" || handlingOption.value === "square") {
//       let allImagesMatch = true;
//       let imagesProcessed = 0;

//       selectedFiles.forEach((file, index) => {
//         const img = new Image();
//         img.src = URL.createObjectURL(file);
//         img.onload = function () {
//           let expectedRatio;
//           if (handlingOption.value === "headerBackground") {
//             expectedRatio = 1000 / 400;
//           } else if (handlingOption.value === "square") {
//             expectedRatio = 1;
//           }

//           const aspectRatio = img.naturalWidth / img.naturalHeight;
//           if (Math.abs(aspectRatio - expectedRatio) > 0.01) {
//             allImagesMatch = false;
//           }
//           imagesProcessed++;

//           if (imagesProcessed === selectedFiles.length) {
//             if (!allImagesMatch) {
//               let alertMessage =
//                 handlingOption.value === "headerBackground"
//                   ? "Please use the crop tool to crop all images to the Header Background size."
//                   : "Please use the crop tool to crop all images to a 1:1 Square size.";
//               alert(alertMessage);
//               return;
//             }

//             submitVideoCreationForm();
//           }
//         };
//       });
//     } else {
//       submitVideoCreationForm();
//     }
//   });

//   function submitVideoCreationForm() {
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
//         clearExistingVideoDimensions();
//         fetchVideoDimensions(videoUrl);
//         processingNotification.style.display = "none";
//       })
//       .catch(() => {
//         processingNotification.style.display = "none";
//       });
//   }

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

//   function clearExistingVideoDimensions() {
//     const existingDimensions = videoContainerTitle.querySelectorAll("span");
//     existingDimensions.forEach((span) => span.remove());
//   }
// });

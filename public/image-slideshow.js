document.addEventListener("DOMContentLoaded", function () {
  const addImageButton = document.getElementById("addImageButton");
  const imageContainer = document.getElementById("imageContainer");
  const createVideoButton = document.getElementById("createVideoButton");
  const processingNotification = document.getElementById("processingNotification");
  const videoContainerTitle = document.querySelector(".video-container h3");
  const handlingOption = document.getElementById("handlingOption");
  const modal = document.getElementById("cropModal");
  const modalImageContainer = document.getElementById("modalImageContainer");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalCloseButton = document.getElementById("modalCloseButton");
  const overlay = document.getElementById("overlay");
  const cropButton = document.getElementById("cropButton");
  const handle = overlay.querySelector(".resize-handle");
  const instructionText = document.getElementById("headerInstruction");

  const ratioAlertModal = document.getElementById("ratioAlertModal");
  const ratioAlertOkButton = document.getElementById("ratioAlertOkButton");
  const ratioAlertMessage = document.getElementById("ratioAlertMessage");

  let selectedFiles = [];
  let durations = [];
  let aspectRatio = null;
  let isResizing = false;
  let canDrag = false;
  let scaleX, scaleY;

  handlingOption.value = "headerBackground";

  function updateHandlingOptionUI() {
    if (handlingOption.value === "headerBackground") {
      instructionText.textContent = "Please crop your images to the header background size by using the crop button located next to your image.";
      instructionText.style.display = "block";
    } else if (handlingOption.value === "square") {
      instructionText.textContent = "Please crop your images to the 1:1 square size by using the crop button located next to your image.";
      instructionText.style.display = "block";
    } else {
      instructionText.style.display = "none";
    }
  }

  updateHandlingOptionUI();

  handlingOption.addEventListener("change", updateHandlingOptionUI);

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

      const cropButtonElement = document.createElement("button");
      cropButtonElement.classList.add("image-slideshow-crop-button");
      cropButtonElement.addEventListener("click", () => openCropModal(container, img));

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

      buttonTitleContainer.appendChild(cropButtonElement);
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

  function openCropModal(container, img) {
    const index = parseInt(container.getAttribute("data-index"), 10);
    const file = selectedFiles[index];

    modalImage.src = URL.createObjectURL(file);
    modalTitle.textContent = `Image ${index + 1}`;
    modal.style.display = "flex";

    modalImage.onload = function () {
      scaleX = modalImage.naturalWidth / modalImage.getBoundingClientRect().width;
      scaleY = modalImage.naturalHeight / modalImage.getBoundingClientRect().height;

      setTimeout(() => {
        modal.classList.add("show");
        initializeOverlay();
      }, 10);
    };

    cropButton.onclick = function () {
      cropImage(container, img);
    };
  }

  function cropImage(container, img) {
    const modalRect = modalImageContainer.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    const scaleXFactor = modalImage.naturalWidth / modalRect.width;
    const scaleYFactor = modalImage.naturalHeight / modalRect.height;

    const cropWidth = overlayRect.width * scaleXFactor;
    const cropHeight = overlayRect.height * scaleYFactor;
    const cropLeft = (overlayRect.left - modalRect.left) * scaleXFactor;
    const cropTop = (overlayRect.top - modalRect.top) * scaleYFactor;

    if (cropWidth <= 0 || cropHeight <= 0 || cropLeft < 0 || cropTop < 0) {
      openRatioAlertModal();
      return;
    }

    const index = parseInt(container.getAttribute("data-index"), 10);
    const file = selectedFiles[index];

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
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error cropping the image.");
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        img.src = url;

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

  function openRatioAlertModal() {
    ratioAlertMessage.textContent =
      handlingOption.value === "headerBackground" ? "Please use the crop tool to crop all images to the Header Background size." : "Please use the crop tool to crop all images to a 1:1 Square size.";

    ratioAlertModal.style.display = "flex";
    setTimeout(() => {
      ratioAlertModal.classList.add("show");
    }, 10);
  }

  function closeRatioAlertModal() {
    ratioAlertModal.classList.remove("show");
    setTimeout(() => {
      ratioAlertModal.style.display = "none";
    }, 300);
  }

  ratioAlertOkButton.addEventListener("click", closeRatioAlertModal);

  modalCloseButton.addEventListener("click", closeModal);

  function initializeOverlay() {
    const modalRect = modalImageContainer.getBoundingClientRect();
    const { width, height } = modalImageContainer.getBoundingClientRect();
    let overlayWidth, overlayHeight;

    if (handlingOption.value === "headerBackground") {
      aspectRatio = 1000 / 400;
      overlayWidth = width;
      overlayHeight = overlayWidth / aspectRatio;
    } else if (handlingOption.value === "square") {
      aspectRatio = 1;
      overlayWidth = Math.min(width, height);
      overlayHeight = overlayWidth;
    } else {
      aspectRatio = null;
      overlayWidth = width * 0.8;
      overlayHeight = height * 0.8;
    }

    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    overlay.style.top = `${(height - overlayHeight) / 2}px`;
    overlay.style.left = `${(width - overlayWidth) / 2}px`;
    overlay.style.display = "block";
    makeDraggable(overlay, modalImageContainer);
    makeResizable(overlay, modalImageContainer);
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
          if (index >= 0 && index < selectedFiles.length) {
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
              openRatioAlertModal();
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
    const selectedHandlingOption = handlingOption.value;

    const transitionOption = document.getElementById("transitionOption").value;

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

    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    formData.append("durations", JSON.stringify(durations));
    formData.append("handlingOption", selectedHandlingOption);
    formData.append("transitionOption", transitionOption);

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
//   const modal = document.getElementById("cropModal");
//   const modalImageContainer = document.getElementById("modalImageContainer");
//   const modalImage = document.getElementById("modalImage");
//   const modalTitle = document.getElementById("modalTitle");
//   const modalCloseButton = document.getElementById("modalCloseButton");
//   const overlay = document.getElementById("overlay");
//   const cropButton = document.getElementById("cropButton");
//   const handle = overlay.querySelector(".resize-handle");
//   const instructionText = document.getElementById("headerInstruction");

//   const ratioAlertModal = document.getElementById("ratioAlertModal");
//   const ratioAlertOkButton = document.getElementById("ratioAlertOkButton");
//   const ratioAlertMessage = document.getElementById("ratioAlertMessage");

//   let selectedFiles = [];
//   let durations = [];
//   let aspectRatio = null;
//   let isResizing = false;
//   let canDrag = false;
//   let scaleX, scaleY;

//   handlingOption.value = "headerBackground";

//   function updateHandlingOptionUI() {
//     if (handlingOption.value === "headerBackground") {
//       instructionText.textContent = "Please crop your images to the header background size by using the crop button located next to your image.";
//       instructionText.style.display = "block";
//     } else if (handlingOption.value === "square") {
//       instructionText.textContent = "Please crop your images to the 1:1 square size by using the crop button located next to your image.";
//       instructionText.style.display = "block";
//     } else {
//       instructionText.style.display = "none";
//     }
//   }

//   updateHandlingOptionUI();

//   handlingOption.addEventListener("change", updateHandlingOptionUI);

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

//       const cropButtonElement = document.createElement("button");
//       cropButtonElement.classList.add("image-slideshow-crop-button");
//       cropButtonElement.addEventListener("click", () => openCropModal(container, img));

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

//       buttonTitleContainer.appendChild(cropButtonElement);
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

//   function openCropModal(container, img) {
//     const index = parseInt(container.getAttribute("data-index"), 10);
//     const file = selectedFiles[index];

//     modalImage.src = URL.createObjectURL(file);
//     modalTitle.textContent = `Image ${index + 1}`;
//     modal.style.display = "flex";

//     modalImage.onload = function () {
//       scaleX = modalImage.naturalWidth / modalImage.getBoundingClientRect().width;
//       scaleY = modalImage.naturalHeight / modalImage.getBoundingClientRect().height;

//       setTimeout(() => {
//         modal.classList.add("show");
//         initializeOverlay();
//       }, 10);
//     };

//     cropButton.onclick = function () {
//       cropImage(container, img);
//     };
//   }

//   function cropImage(container, img) {
//     const modalRect = modalImageContainer.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();

//     const scaleXFactor = modalImage.naturalWidth / modalRect.width;
//     const scaleYFactor = modalImage.naturalHeight / modalRect.height;

//     const cropWidth = overlayRect.width * scaleXFactor;
//     const cropHeight = overlayRect.height * scaleYFactor;
//     const cropLeft = (overlayRect.left - modalRect.left) * scaleXFactor;
//     const cropTop = (overlayRect.top - modalRect.top) * scaleYFactor;

//     if (cropWidth <= 0 || cropHeight <= 0 || cropLeft < 0 || cropTop < 0) {
//       openRatioAlertModal();
//       return;
//     }

//     const index = parseInt(container.getAttribute("data-index"), 10);
//     const file = selectedFiles[index];

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
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Error cropping the image.");
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         const url = window.URL.createObjectURL(blob);
//         img.src = url;

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

//   function openRatioAlertModal() {
//     ratioAlertMessage.textContent =
//       handlingOption.value === "headerBackground" ? "Please use the crop tool to crop all images to the Header Background size." : "Please use the crop tool to crop all images to a 1:1 Square size.";

//     ratioAlertModal.style.display = "flex";
//     setTimeout(() => {
//       ratioAlertModal.classList.add("show");
//     }, 10);
//   }

//   function closeRatioAlertModal() {
//     ratioAlertModal.classList.remove("show");
//     setTimeout(() => {
//       ratioAlertModal.style.display = "none";
//     }, 300);
//   }

//   ratioAlertOkButton.addEventListener("click", closeRatioAlertModal);

//   modalCloseButton.addEventListener("click", closeModal);

//   function initializeOverlay() {
//     const modalRect = modalImageContainer.getBoundingClientRect();
//     const { width, height } = modalImageContainer.getBoundingClientRect();
//     let overlayWidth, overlayHeight;

//     if (handlingOption.value === "headerBackground") {
//       aspectRatio = 1000 / 400;
//       overlayWidth = width;
//       overlayHeight = overlayWidth / aspectRatio;
//     } else if (handlingOption.value === "square") {
//       aspectRatio = 1;
//       overlayWidth = Math.min(width, height);
//       overlayHeight = overlayWidth;
//     } else {
//       aspectRatio = null;
//       overlayWidth = width * 0.8;
//       overlayHeight = height * 0.8;
//     }

//     overlay.style.width = `${overlayWidth}px`;
//     overlay.style.height = `${overlayHeight}px`;
//     overlay.style.top = `${(height - overlayHeight) / 2}px`;
//     overlay.style.left = `${(width - overlayWidth) / 2}px`;
//     overlay.style.display = "block";
//     makeDraggable(overlay, modalImageContainer);
//     makeResizable(overlay, modalImageContainer);
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
//           if (index >= 0 && index < selectedFiles.length) {
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
//               openRatioAlertModal();
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
//     const selectedHandlingOption = handlingOption.value;

//     const transitionOption = document.getElementById("transitionOption").value;

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

//     selectedFiles.forEach((file) => {
//       formData.append("images", file);
//     });

//     formData.append("durations", JSON.stringify(durations));
//     formData.append("handlingOption", selectedHandlingOption);
//     formData.append("transitionOption", transitionOption);

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

// document.addEventListener("DOMContentLoaded", function () {
//   const addImageButton = document.getElementById("addImageButton");
//   const imageContainer = document.getElementById("imageContainer");
//   const createVideoButton = document.getElementById("createVideoButton");
//   const processingNotification = document.getElementById("processingNotification");
//   const videoContainerTitle = document.querySelector(".video-container h3");
//   const handlingOption = document.getElementById("handlingOption");
//   const modal = document.getElementById("cropModal");
//   const modalImageContainer = document.getElementById("modalImageContainer");
//   const modalImage = document.getElementById("modalImage");
//   const modalTitle = document.getElementById("modalTitle");
//   const modalCloseButton = document.getElementById("modalCloseButton");
//   const overlay = document.getElementById("overlay");
//   const cropSizeSelector = document.getElementById("cropSizeSelector");
//   const cropButton = document.getElementById("cropButton");
//   const handle = overlay.querySelector(".resize-handle");
//   const instructionText = document.getElementById("headerInstruction");

//   const ratioAlertModal = document.getElementById("ratioAlertModal");
//   const ratioAlertOkButton = document.getElementById("ratioAlertOkButton");
//   const ratioAlertMessage = document.getElementById("ratioAlertMessage");

//   let selectedFiles = [];
//   let durations = [];
//   let aspectRatio = null;
//   let isResizing = false;
//   let canDrag = false;
//   let scaleX, scaleY;

//   handlingOption.value = "headerBackground";

//   function updateHandlingOptionUI() {
//     if (handlingOption.value === "headerBackground") {
//       instructionText.textContent = "Please crop your images to the header background size by using the crop button located next to your image.";
//       instructionText.style.display = "block";
//     } else if (handlingOption.value === "square") {
//       instructionText.textContent = "Please crop your images to the 1:1 square size by using the crop button located next to your image.";
//       instructionText.style.display = "block";
//     } else {
//       instructionText.style.display = "none";
//     }
//   }

//   updateHandlingOptionUI();

//   handlingOption.addEventListener("change", updateHandlingOptionUI);

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

//       const cropButtonElement = document.createElement("button");
//       cropButtonElement.classList.add("image-slideshow-crop-button");
//       cropButtonElement.addEventListener("click", () => openCropModal(container, img));

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

//       buttonTitleContainer.appendChild(cropButtonElement);
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

//   function openCropModal(container, img) {
//     const index = parseInt(container.getAttribute("data-index"), 10);
//     const file = selectedFiles[index];

//     modalImage.src = URL.createObjectURL(file);
//     modalTitle.textContent = `Image ${index + 1}`;
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
//       cropImage(container, img);
//     };
//   }

//   function cropImage(container, img) {
//     const modalRect = modalImageContainer.getBoundingClientRect();
//     const overlayRect = overlay.getBoundingClientRect();

//     const scaleXFactor = modalImage.naturalWidth / modalRect.width;
//     const scaleYFactor = modalImage.naturalHeight / modalRect.height;

//     const cropWidth = overlayRect.width * scaleXFactor;
//     const cropHeight = overlayRect.height * scaleYFactor;
//     const cropLeft = (overlayRect.left - modalRect.left) * scaleXFactor;
//     const cropTop = (overlayRect.top - modalRect.top) * scaleYFactor;

//     if (cropWidth <= 0 || cropHeight <= 0 || cropLeft < 0 || cropTop < 0) {
//       openRatioAlertModal();
//       return;
//     }

//     const index = parseInt(container.getAttribute("data-index"), 10);
//     const file = selectedFiles[index];

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
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Error cropping the image.");
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         const url = window.URL.createObjectURL(blob);
//         img.src = url;

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

//   function openRatioAlertModal() {
//     ratioAlertMessage.textContent =
//       handlingOption.value === "headerBackground" ? "Please use the crop tool to crop all images to the Header Background size." : "Please use the crop tool to crop all images to a 1:1 Square size.";

//     ratioAlertModal.style.display = "flex";
//     setTimeout(() => {
//       ratioAlertModal.classList.add("show");
//     }, 10);
//   }

//   function closeRatioAlertModal() {
//     ratioAlertModal.classList.remove("show");
//     setTimeout(() => {
//       ratioAlertModal.style.display = "none";
//     }, 300);
//   }

//   ratioAlertOkButton.addEventListener("click", closeRatioAlertModal);

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
//           if (index >= 0 && index < selectedFiles.length) {
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
//               openRatioAlertModal();
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
//     const selectedHandlingOption = handlingOption.value;

//     const transitionOption = document.getElementById("transitionOption").value;

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

//     selectedFiles.forEach((file) => {
//       formData.append("images", file);
//     });

//     formData.append("durations", JSON.stringify(durations));
//     formData.append("handlingOption", selectedHandlingOption);
//     formData.append("transitionOption", transitionOption);

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

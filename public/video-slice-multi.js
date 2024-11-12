document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("slicerForm");
  const displayedVideo1 = document.getElementById("displayedVideo1");
  const displayedVideo2 = document.getElementById("displayedVideo2");
  const displayedVideo3 = document.getElementById("displayedVideo3");
  const processedVideo = document.getElementById("processedVideo");
  const processedGif = document.getElementById("processedGif");
  const videoInput1 = document.getElementById("video1");
  const videoInput2 = document.getElementById("video2");
  const videoInput3 = document.getElementById("video3");
  const notification = document.getElementById("processingNotification");
  const numVideos = document.getElementById("numVideos");
  const videoUploadSection2 = document.getElementById("videoUploadSection2");
  const videoUploadSection3 = document.getElementById("videoUploadSection3");
  const uploadedVideoSection1 = document.getElementById("uploadedVideoSection1");
  const uploadedVideoSection2 = document.getElementById("uploadedVideoSection2");
  const uploadedVideoSection3 = document.getElementById("uploadedVideoSection3");
  const outputWidth = document.getElementById("outputWidth");
  const outputHeight = document.getElementById("outputHeight");
  const overlayColor = document.getElementById("overlayColor");
  const overlayOpacity = document.getElementById("overlayOpacity");
  const colorValue = document.getElementById("colorValue");
  const opacityValue = document.getElementById("opacityValue");
  const enableOverlay = document.getElementById("enableOverlay");
  const overlayControls = document.getElementById("overlayControls");
  const enableGradientOverlay = document.getElementById("enableGradientOverlay");
  const gradientControls = document.getElementById("gradientControls");
  const gradientColor = document.getElementById("gradientColor");
  const gradientColorValue = document.getElementById("gradientColorValue");
  const enableSlowVideo = document.getElementById("enableSlowVideo");
  const slowControls = document.getElementById("slowControls");
  const slowFactor = document.getElementById("slowFactor");
  const slowFactorValue = document.getElementById("slowFactorValue");
  const enableGifConversion = document.getElementById("enableGifConversion");
  const gifControls = document.getElementById("gifControls");
  const gifFps = document.getElementById("gifFps");
  const gifQuality = document.getElementById("gifQuality");

  const mp4ConversionModal = document.getElementById("mp4ConversionModal");
  const modalOverlay = document.getElementById("modalOverlay");
  const confirmMp4Convert = document.getElementById("confirmMp4Convert");
  const cancelMp4Convert = document.getElementById("cancelMp4Convert");
  const closeMp4Modal = document.getElementById("closeMp4Modal");

  let fileToConvert = null;
  let targetVideoElement = null;
  let targetInputElement = null;

  let minWidth = Infinity;
  let minHeight = Infinity;

  const formatBytes = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + "mb";
  };

  const updateDimensions = () => {
    minWidth = Infinity;
    minHeight = Infinity;
    const videos = [displayedVideo1, displayedVideo2, displayedVideo3];

    videos.forEach((video) => {
      if (video.readyState >= 1) {
        if (video.videoWidth < minWidth) {
          minWidth = video.videoWidth;
        }
        if (video.videoHeight < minHeight) {
          minHeight = video.videoHeight;
        }
      }
    });

    if (minWidth !== Infinity && minHeight !== Infinity) {
      outputWidth.value = minWidth;
      outputWidth.max = minWidth;
      outputHeight.value = minHeight;
      outputHeight.max = minHeight;
      outputWidth.disabled = false;
      outputHeight.disabled = false;
    } else {
      outputWidth.value = "";
      outputHeight.value = "";
      outputWidth.disabled = false;
      outputHeight.disabled = false;
    }
  };

  const showMp4ConversionModal = (file, videoElement, inputElement) => {
    mp4ConversionModal.classList.add("show");
    modalOverlay.classList.add("show");
    fileToConvert = file;
    targetVideoElement = videoElement;
    targetInputElement = inputElement;
  };

  const hideMp4ConversionModal = () => {
    mp4ConversionModal.classList.remove("show");
    modalOverlay.classList.remove("show");
  };

  cancelMp4Convert.addEventListener("click", hideMp4ConversionModal);
  closeMp4Modal.addEventListener("click", hideMp4ConversionModal);
  modalOverlay.addEventListener("click", hideMp4ConversionModal);

  confirmMp4Convert.addEventListener("click", () => {
    hideMp4ConversionModal();
    if (fileToConvert) {
      startVideoConversion(fileToConvert, targetVideoElement, targetInputElement);
    } else {
      alert("No file selected for conversion.");
    }
  });

  const startVideoConversion = (file, videoElement, inputElement) => {
    if (!file) {
      console.error("No file to convert.");
      alert("No file selected for conversion.");
      return;
    }

    notification.style.display = "block";

    const formData = new FormData();
    formData.append("video", file, file.name);

    fetch("/SliceMultiConvertToMp4", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error converting video");
        }
        return response.blob();
      })
      .then((convertedBlob) => {
        notification.style.display = "none";

        const convertedUrl = URL.createObjectURL(convertedBlob);
        videoElement.src = convertedUrl;
        videoElement.parentElement.style.display = "block";
        videoElement.dataset.fileSize = convertedBlob.size;

        const convertedFile = new File([convertedBlob], "converted.mp4", {
          type: "video/mp4",
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(convertedFile);
        inputElement.files = dataTransfer.files;

        videoElement.onloadedmetadata = () => {
          updateDimensions();
          updateVideoInfo(videoElement);

          const duration = videoElement.duration;
          const sliderId = videoElement.id === "displayedVideo1" ? "slider1" : videoElement.id === "displayedVideo2" ? "slider2" : "slider3";
          const sliceStartId = videoElement.id === "displayedVideo1" ? "slice1Start1" : videoElement.id === "displayedVideo2" ? "slice1Start2" : "slice1Start3";
          const sliceEndId = videoElement.id === "displayedVideo1" ? "slice1End1" : videoElement.id === "displayedVideo2" ? "slice1End2" : "slice1End3";
          const displayStartId = videoElement.id === "displayedVideo1" ? "displayStart1" : videoElement.id === "displayedVideo2" ? "displayStart2" : "displayStart3";
          const displayEndId = videoElement.id === "displayedVideo1" ? "displayEnd1" : videoElement.id === "displayedVideo2" ? "displayEnd2" : "displayEnd3";

          const slider = document.getElementById(sliderId);
          const displayStart = document.getElementById(displayStartId);
          const displayEnd = document.getElementById(displayEndId);

          if (!slider.noUiSlider) {
            noUiSlider.create(slider, {
              start: [0, duration],
              connect: true,
              range: {
                min: 0,
                max: duration,
              },
              step: 0.1,
              tooltips: [true, true],
              format: {
                to: (value) => value.toFixed(1),
                from: (value) => Number(value),
              },
            });

            slider.noUiSlider.on("update", (values) => {
              const start = parseFloat(values[0]);
              const end = parseFloat(values[1]);
              document.getElementById(sliceStartId).value = start;
              document.getElementById(sliceEndId).value = end;
              displayStart.value = start.toFixed(1);
              displayEnd.value = end.toFixed(1);
              if (videoElement.paused) {
                videoElement.currentTime = start;
              }
            });
          } else {
            slider.noUiSlider.updateOptions({
              range: {
                min: 0,
                max: duration,
              },
              start: [0, duration],
            });
          }

          displayStart.removeEventListener("input", displayStart._debouncedHandler);
          displayEnd.removeEventListener("input", displayEnd._debouncedHandler);

          displayStart._debouncedHandler = debounce(handleInputStart.bind(null, slider, displayStartId, sliceStartId), 300);
          displayEnd._debouncedHandler = debounce(handleInputEnd.bind(null, slider, displayEndId, sliceEndId), 300);

          displayStart.addEventListener("input", displayStart._debouncedHandler);
          displayEnd.addEventListener("input", displayEnd._debouncedHandler);
        };
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error("Error converting video:", error);
        alert("Error converting video. Please try again.");
      });
  };

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const handleInputStart = (slider, displayStartId, sliceStartId, e) => {
    let newStart = parseFloat(e.target.value);
    let currentEnd = parseFloat(slider.noUiSlider.get()[1]);

    if (isNaN(newStart)) newStart = 0;
    newStart = Math.max(0, Math.min(newStart, currentEnd - 0.1));
    newStart = parseFloat(newStart.toFixed(1));

    slider.noUiSlider.set([newStart, null]);
  };

  const handleInputEnd = (slider, displayEndId, sliceEndId, e) => {
    let newEnd = parseFloat(e.target.value);
    let currentStart = parseFloat(slider.noUiSlider.get()[0]);

    if (isNaN(newEnd)) newEnd = slider.noUiSlider.options.range.max;
    newEnd = Math.min(slider.noUiSlider.options.range.max, Math.max(newEnd, currentStart + 0.1));
    newEnd = parseFloat(newEnd.toFixed(1));

    slider.noUiSlider.set([null, newEnd]);
  };

  const loadVideo = (event, videoElement, sliderId, sliceStartId, sliceEndId, displayStartId, displayEndId) => {
    const file = event.target.files[0];
    if (file) {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      if (fileExtension !== "mp4") {
        showMp4ConversionModal(file, videoElement, event.target);
      } else {
        videoElement.src = URL.createObjectURL(file);
        videoElement.parentElement.style.display = "block";
        videoElement.dataset.fileSize = file.size;

        videoElement.onloadedmetadata = () => {
          updateDimensions();
          updateVideoInfo(videoElement, file.size);

          const duration = videoElement.duration;
          const slider = document.getElementById(sliderId);
          const displayStart = document.getElementById(displayStartId);
          const displayEnd = document.getElementById(displayEndId);

          if (!slider.noUiSlider) {
            noUiSlider.create(slider, {
              start: [0, duration],
              connect: true,
              range: {
                min: 0,
                max: duration,
              },
              step: 0.1,
              tooltips: [true, true],
              format: {
                to: (value) => value.toFixed(1),
                from: (value) => Number(value),
              },
            });

            slider.noUiSlider.on("update", (values) => {
              const start = parseFloat(values[0]);
              const end = parseFloat(values[1]);
              document.getElementById(sliceStartId).value = start;
              document.getElementById(sliceEndId).value = end;
              displayStart.value = start.toFixed(1);
              displayEnd.value = end.toFixed(1);
              if (videoElement.paused) {
                videoElement.currentTime = start;
              }
            });
          } else {
            slider.noUiSlider.updateOptions({
              range: {
                min: 0,
                max: duration,
              },
              start: [0, duration],
            });
          }

          displayStart.removeEventListener("input", displayStart._debouncedHandler);
          displayEnd.removeEventListener("input", displayEnd._debouncedHandler);

          displayStart._debouncedHandler = debounce(handleInputStart.bind(null, slider, displayStartId, sliceStartId), 300);
          displayEnd._debouncedHandler = debounce(handleInputEnd.bind(null, slider, displayEndId, sliceEndId), 300);

          displayStart.addEventListener("input", displayStart._debouncedHandler);
          displayEnd.addEventListener("input", displayEnd._debouncedHandler);
        };
      }
    }
  };

  const updateVideoInfo = (videoElement, fileSize = null) => {
    const videoId = videoElement.id;
    let videoNumber = "";
    if (videoId === "displayedVideo1") videoNumber = "1";
    else if (videoId === "displayedVideo2") videoNumber = "2";
    else if (videoId === "displayedVideo3") videoNumber = "3";

    const dimensionsSpan = document.getElementById(`video${videoNumber}Dimensions`);
    const sizeSpan = document.getElementById(`video${videoNumber}Size`);

    if (videoElement.readyState >= 1) {
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      dimensionsSpan.textContent = `${width}x${height}`;

      let sizeInBytes = fileSize ? fileSize : videoElement.dataset.fileSize ? parseInt(videoElement.dataset.fileSize) : 0;
      const sizeInMB = formatBytes(sizeInBytes);
      sizeSpan.textContent = `(${sizeInMB})`;
    } else {
      dimensionsSpan.textContent = "";
      sizeSpan.textContent = "";
    }
  };

  const updateVideoSections = () => {
    const selectedValue = parseInt(numVideos.value, 10);
    videoUploadSection2.style.display = selectedValue >= 2 ? "block" : "none";
    videoUploadSection3.style.display = selectedValue === 3 ? "block" : "none";
    uploadedVideoSection2.style.display = selectedValue >= 2 ? "block" : "none";
    uploadedVideoSection3.style.display = selectedValue === 3 ? "block" : "none";
  };

  numVideos.addEventListener("change", updateVideoSections);
  updateVideoSections();

  videoInput1.addEventListener("change", (event) => loadVideo(event, displayedVideo1, "slider1", "slice1Start1", "slice1End1", "displayStart1", "displayEnd1"));
  videoInput2.addEventListener("change", (event) => loadVideo(event, displayedVideo2, "slider2", "slice1Start2", "slice1End2", "displayStart2", "displayEnd2"));
  videoInput3.addEventListener("change", (event) => loadVideo(event, displayedVideo3, "slider3", "slice1Start3", "slice1End3", "displayStart3", "displayEnd3"));

  overlayColor.addEventListener("input", () => {
    colorValue.textContent = overlayColor.value.toUpperCase();
  });

  overlayOpacity.addEventListener("input", () => {
    opacityValue.textContent = overlayOpacity.value;
  });

  gradientColor.addEventListener("input", () => {
    gradientColorValue.textContent = gradientColor.value.toUpperCase();
  });

  enableOverlay.addEventListener("change", () => {
    overlayControls.style.display = enableOverlay.checked ? "block" : "none";
    if (enableOverlay.checked) {
      enableGradientOverlay.checked = false;
      gradientControls.style.display = "none";
    }
  });

  enableGradientOverlay.addEventListener("change", () => {
    gradientControls.style.display = enableGradientOverlay.checked ? "block" : "none";
    if (enableGradientOverlay.checked) {
      enableOverlay.checked = false;
      overlayControls.style.display = "none";
    }
  });

  enableSlowVideo.addEventListener("change", () => {
    slowControls.style.display = enableSlowVideo.checked ? "block" : "none";
  });

  enableGifConversion.addEventListener("change", () => {
    gifControls.style.display = enableGifConversion.checked ? "block" : "none";
  });

  slowFactor.addEventListener("input", () => {
    slowFactorValue.textContent = slowFactor.value + "x";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    notification.style.display = "block";
    const formData = new FormData(form);

    const sliceStart1 = parseFloat(document.getElementById("slice1Start1").value);
    const sliceEnd1 = parseFloat(document.getElementById("slice1End1").value);
    formData.set("slice1Start1", sliceStart1);
    formData.set("slice1End1", sliceEnd1);

    if (numVideos.value >= 2) {
      const sliceStart2 = parseFloat(document.getElementById("slice1Start2").value);
      const sliceEnd2 = parseFloat(document.getElementById("slice1End2").value);
      formData.set("slice1Start2", sliceStart2);
      formData.set("slice1End2", sliceEnd2);
    }

    if (numVideos.value == 3) {
      const sliceStart3 = parseFloat(document.getElementById("slice1Start3").value);
      const sliceEnd3 = parseFloat(document.getElementById("slice1End3").value);
      formData.set("slice1Start3", sliceStart3);
      formData.set("slice1End3", sliceEnd3);
    }

    if (!enableOverlay.checked) {
      formData.delete("overlayColor");
      formData.delete("overlayOpacity");
    }

    if (!enableGradientOverlay.checked) {
      formData.delete("gradientColor");
      formData.delete("gradientDirection");
    }

    if (!enableSlowVideo.checked) {
      formData.delete("slowFactor");
    }

    if (!enableGifConversion.checked) {
      formData.delete("gifFps");
      formData.delete("gifQuality");
    }

    fetch("/slice-multi", { method: "POST", body: formData })
      .then((response) => {
        const contentType = response.headers.get("content-type");
        return response.blob().then((blob) => ({ blob, contentType }));
      })
      .then(({ blob, contentType }) => {
        notification.style.display = "none";
        if (contentType === "image/gif") {
          processedVideo.style.display = "none";
          processedGif.src = URL.createObjectURL(blob);
          processedGif.style.display = "block";
        } else {
          processedGif.style.display = "none";
          processedVideo.src = URL.createObjectURL(blob);
          processedVideo.style.display = "block";
        }
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error("Failed to process videos.", error);
      });
  });

  const synchronizeVideoWithSlider = (videoElement, sliceStartId, sliceEndId) => {
    const sliceStart = () => parseFloat(document.getElementById(sliceStartId).value);
    const sliceEnd = () => parseFloat(document.getElementById(sliceEndId).value);

    videoElement.addEventListener("play", () => {
      const currentTime = videoElement.currentTime;
      const startTime = sliceStart();
      const endTime = sliceEnd();

      if (currentTime < startTime || currentTime > endTime) {
        videoElement.currentTime = startTime;
      }
    });

    videoElement.addEventListener("timeupdate", () => {
      if (videoElement.currentTime >= sliceEnd()) {
        videoElement.pause();
      }
    });

    videoElement.addEventListener("seeking", () => {
      const currentTime = videoElement.currentTime;
      const startTime = sliceStart();
      const endTime = sliceEnd();

      if (currentTime < startTime) {
        videoElement.currentTime = startTime;
      } else if (currentTime > endTime) {
        videoElement.currentTime = endTime;
      }
    });
  };

  synchronizeVideoWithSlider(displayedVideo1, "slice1Start1", "slice1End1");
  synchronizeVideoWithSlider(displayedVideo2, "slice1Start2", "slice1End2");
  synchronizeVideoWithSlider(displayedVideo3, "slice1Start3", "slice1End3");
});

// document.addEventListener("DOMContentLoaded", function () {
//   const form = document.getElementById("slicerForm");
//   const displayedVideo1 = document.getElementById("displayedVideo1");
//   const displayedVideo2 = document.getElementById("displayedVideo2");
//   const displayedVideo3 = document.getElementById("displayedVideo3");
//   const processedVideo = document.getElementById("processedVideo");
//   const processedGif = document.getElementById("processedGif");
//   const videoInput1 = document.getElementById("video1");
//   const videoInput2 = document.getElementById("video2");
//   const videoInput3 = document.getElementById("video3");
//   const notification = document.getElementById("processingNotification");
//   const numVideos = document.getElementById("numVideos");
//   const videoUploadSection2 = document.getElementById("videoUploadSection2");
//   const videoUploadSection3 = document.getElementById("videoUploadSection3");
//   const uploadedVideoSection1 = document.getElementById("uploadedVideoSection1");
//   const uploadedVideoSection2 = document.getElementById("uploadedVideoSection2");
//   const uploadedVideoSection3 = document.getElementById("uploadedVideoSection3");
//   const outputWidth = document.getElementById("outputWidth");
//   const outputHeight = document.getElementById("outputHeight");
//   const overlayColor = document.getElementById("overlayColor");
//   const overlayOpacity = document.getElementById("overlayOpacity");
//   const colorValue = document.getElementById("colorValue");
//   const opacityValue = document.getElementById("opacityValue");
//   const enableOverlay = document.getElementById("enableOverlay");
//   const overlayControls = document.getElementById("overlayControls");
//   const enableGradientOverlay = document.getElementById("enableGradientOverlay");
//   const gradientControls = document.getElementById("gradientControls");
//   const gradientColor = document.getElementById("gradientColor");
//   const gradientColorValue = document.getElementById("gradientColorValue");
//   const enableSlowVideo = document.getElementById("enableSlowVideo");
//   const slowControls = document.getElementById("slowControls");
//   const slowFactor = document.getElementById("slowFactor");
//   const slowFactorValue = document.getElementById("slowFactorValue");
//   const enableGifConversion = document.getElementById("enableGifConversion");
//   const gifControls = document.getElementById("gifControls");
//   const gifFps = document.getElementById("gifFps");
//   const gifQuality = document.getElementById("gifQuality");

//   const mp4ConversionModal = document.getElementById("mp4ConversionModal");
//   const modalOverlay = document.getElementById("modalOverlay");
//   const confirmMp4Convert = document.getElementById("confirmMp4Convert");
//   const cancelMp4Convert = document.getElementById("cancelMp4Convert");
//   const closeMp4Modal = document.getElementById("closeMp4Modal");

//   let fileToConvert = null;
//   let targetVideoElement = null;
//   let targetInputElement = null;

//   let minWidth = Infinity;
//   let minHeight = Infinity;

//   const updateDimensions = () => {
//     minWidth = Infinity;
//     minHeight = Infinity;
//     const videos = [displayedVideo1, displayedVideo2, displayedVideo3];

//     videos.forEach((video) => {
//       if (video.readyState >= 1) {
//         if (video.videoWidth < minWidth) {
//           minWidth = video.videoWidth;
//         }
//         if (video.videoHeight < minHeight) {
//           minHeight = video.videoHeight;
//         }
//       }
//     });

//     if (minWidth !== Infinity && minHeight !== Infinity) {
//       outputWidth.value = minWidth;
//       outputWidth.max = minWidth;
//       outputHeight.value = minHeight;
//       outputHeight.max = minHeight;
//       outputWidth.disabled = false;
//       outputHeight.disabled = false;
//     } else {
//       outputWidth.value = "";
//       outputHeight.value = "";
//       outputWidth.disabled = false;
//       outputHeight.disabled = false;
//     }
//   };

//   const showMp4ConversionModal = (file, videoElement, inputElement) => {
//     mp4ConversionModal.classList.add("show");
//     modalOverlay.classList.add("show");
//     fileToConvert = file;
//     targetVideoElement = videoElement;
//     targetInputElement = inputElement;
//   };

//   const hideMp4ConversionModal = () => {
//     mp4ConversionModal.classList.remove("show");
//     modalOverlay.classList.remove("show");
//   };

//   cancelMp4Convert.addEventListener("click", hideMp4ConversionModal);
//   closeMp4Modal.addEventListener("click", hideMp4ConversionModal);
//   modalOverlay.addEventListener("click", hideMp4ConversionModal);

//   confirmMp4Convert.addEventListener("click", () => {
//     hideMp4ConversionModal();
//     if (fileToConvert) {
//       startVideoConversion(fileToConvert, targetVideoElement, targetInputElement);
//     } else {
//       alert("No file selected for conversion.");
//     }
//   });

//   const startVideoConversion = (file, videoElement, inputElement) => {
//     if (!file) {
//       console.error("No file to convert.");
//       alert("No file selected for conversion.");
//       return;
//     }

//     notification.style.display = "block"; // Show the processing notification

//     const formData = new FormData();
//     formData.append("video", file, file.name);

//     fetch("/SliceMultiConvertToMp4", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Error converting video");
//         }
//         return response.blob();
//       })
//       .then((convertedBlob) => {
//         notification.style.display = "none"; // Hide the notification

//         const convertedUrl = URL.createObjectURL(convertedBlob);
//         videoElement.src = convertedUrl;
//         videoElement.parentElement.style.display = "block";

//         const convertedFile = new File([convertedBlob], "converted.mp4", {
//           type: "video/mp4",
//         });

//         const dataTransfer = new DataTransfer();
//         dataTransfer.items.add(convertedFile);
//         inputElement.files = dataTransfer.files;

//         videoElement.onloadedmetadata = () => {
//           updateDimensions();
//           const duration = videoElement.duration;
//           const sliderId = videoElement.id === "displayedVideo1" ? "slider1" : videoElement.id === "displayedVideo2" ? "slider2" : "slider3";
//           const sliceStartId = videoElement.id === "displayedVideo1" ? "slice1Start1" : videoElement.id === "displayedVideo2" ? "slice1Start2" : "slice1Start3";
//           const sliceEndId = videoElement.id === "displayedVideo1" ? "slice1End1" : videoElement.id === "displayedVideo2" ? "slice1End2" : "slice1End3";
//           const displayStartId = videoElement.id === "displayedVideo1" ? "displayStart1" : videoElement.id === "displayedVideo2" ? "displayStart2" : "displayStart3";
//           const displayEndId = videoElement.id === "displayedVideo1" ? "displayEnd1" : videoElement.id === "displayedVideo2" ? "displayEnd2" : "displayEnd3";

//           const slider = document.getElementById(sliderId);
//           const displayStart = document.getElementById(displayStartId);
//           const displayEnd = document.getElementById(displayEndId);

//           if (!slider.noUiSlider) {
//             noUiSlider.create(slider, {
//               start: [0, duration],
//               connect: true,
//               range: {
//                 min: 0,
//                 max: duration,
//               },
//               step: 0.1,
//               tooltips: [true, true],
//               format: {
//                 to: (value) => value.toFixed(1),
//                 from: (value) => Number(value),
//               },
//             });

//             slider.noUiSlider.on("update", (values) => {
//               const start = parseFloat(values[0]);
//               const end = parseFloat(values[1]);
//               document.getElementById(sliceStartId).value = start;
//               document.getElementById(sliceEndId).value = end;
//               displayStart.value = start.toFixed(1);
//               displayEnd.value = end.toFixed(1);
//               if (videoElement.paused) {
//                 videoElement.currentTime = start;
//               }
//             });
//           } else {
//             slider.noUiSlider.updateOptions({
//               range: {
//                 min: 0,
//                 max: duration,
//               },
//               start: [0, duration],
//             });
//           }

//           // Remove existing event listeners to prevent duplication
//           displayStart.removeEventListener("input", displayStart._debouncedHandler);
//           displayEnd.removeEventListener("input", displayEnd._debouncedHandler);

//           // Add debounced input event listeners
//           displayStart._debouncedHandler = debounce(handleInputStart.bind(null, slider, displayStartId, sliceStartId), 300);
//           displayEnd._debouncedHandler = debounce(handleInputEnd.bind(null, slider, displayEndId, sliceEndId), 300);

//           displayStart.addEventListener("input", displayStart._debouncedHandler);
//           displayEnd.addEventListener("input", displayEnd._debouncedHandler);
//         };
//       })
//       .catch((error) => {
//         notification.style.display = "none"; // Hide the notification
//         console.error("Error converting video:", error);
//         alert("Error converting video. Please try again.");
//       });
//   };

//   // Debounce function to limit the rate of function execution
//   function debounce(func, wait) {
//     let timeout;
//     return function (...args) {
//       const later = () => {
//         clearTimeout(timeout);
//         func(...args);
//       };
//       clearTimeout(timeout);
//       timeout = setTimeout(later, wait);
//     };
//   }

//   const handleInputStart = (slider, displayStartId, sliceStartId, e) => {
//     let newStart = parseFloat(e.target.value);
//     let currentEnd = parseFloat(slider.noUiSlider.get()[1]);

//     if (isNaN(newStart)) newStart = 0;
//     newStart = Math.max(0, Math.min(newStart, currentEnd - 0.1));
//     newStart = parseFloat(newStart.toFixed(1));

//     slider.noUiSlider.set([newStart, null]);
//   };

//   const handleInputEnd = (slider, displayEndId, sliceEndId, e) => {
//     let newEnd = parseFloat(e.target.value);
//     let currentStart = parseFloat(slider.noUiSlider.get()[0]);

//     if (isNaN(newEnd)) newEnd = slider.noUiSlider.options.range.max;
//     newEnd = Math.min(slider.noUiSlider.options.range.max, Math.max(newEnd, currentStart + 0.1));
//     newEnd = parseFloat(newEnd.toFixed(1));

//     slider.noUiSlider.set([null, newEnd]);
//   };

//   const loadVideo = (event, videoElement, sliderId, sliceStartId, sliceEndId, displayStartId, displayEndId) => {
//     const file = event.target.files[0];
//     if (file) {
//       const fileExtension = file.name.split(".").pop().toLowerCase();
//       if (fileExtension !== "mp4") {
//         showMp4ConversionModal(file, videoElement, event.target);
//       } else {
//         videoElement.src = URL.createObjectURL(file);
//         videoElement.parentElement.style.display = "block";
//         videoElement.onloadedmetadata = () => {
//           updateDimensions();
//           const duration = videoElement.duration;
//           const slider = document.getElementById(sliderId);
//           const displayStart = document.getElementById(displayStartId);
//           const displayEnd = document.getElementById(displayEndId);

//           if (!slider.noUiSlider) {
//             noUiSlider.create(slider, {
//               start: [0, duration],
//               connect: true,
//               range: {
//                 min: 0,
//                 max: duration,
//               },
//               step: 0.1,
//               tooltips: [true, true],
//               format: {
//                 to: (value) => value.toFixed(1),
//                 from: (value) => Number(value),
//               },
//             });

//             slider.noUiSlider.on("update", (values) => {
//               const start = parseFloat(values[0]);
//               const end = parseFloat(values[1]);
//               document.getElementById(sliceStartId).value = start;
//               document.getElementById(sliceEndId).value = end;
//               displayStart.value = start.toFixed(1);
//               displayEnd.value = end.toFixed(1);
//               if (videoElement.paused) {
//                 videoElement.currentTime = start;
//               }
//             });
//           } else {
//             slider.noUiSlider.updateOptions({
//               range: {
//                 min: 0,
//                 max: duration,
//               },
//               start: [0, duration],
//             });
//           }

//           // Remove existing event listeners to prevent duplication
//           displayStart.removeEventListener("input", displayStart._debouncedHandler);
//           displayEnd.removeEventListener("input", displayEnd._debouncedHandler);

//           // Add debounced input event listeners
//           displayStart._debouncedHandler = debounce(handleInputStart.bind(null, slider, displayStartId, sliceStartId), 300);
//           displayEnd._debouncedHandler = debounce(handleInputEnd.bind(null, slider, displayEndId, sliceEndId), 300);

//           displayStart.addEventListener("input", displayStart._debouncedHandler);
//           displayEnd.addEventListener("input", displayEnd._debouncedHandler);
//         };
//       }
//     }
//   };

//   const updateVideoSections = () => {
//     const selectedValue = parseInt(numVideos.value, 10);
//     videoUploadSection2.style.display = selectedValue >= 2 ? "block" : "none";
//     videoUploadSection3.style.display = selectedValue === 3 ? "block" : "none";
//     uploadedVideoSection2.style.display = selectedValue >= 2 ? "block" : "none";
//     uploadedVideoSection3.style.display = selectedValue === 3 ? "block" : "none";
//   };

//   numVideos.addEventListener("change", updateVideoSections);
//   updateVideoSections();

//   // Initial Event Listeners with Debounced Inputs
//   videoInput1.addEventListener("change", (event) => loadVideo(event, displayedVideo1, "slider1", "slice1Start1", "slice1End1", "displayStart1", "displayEnd1"));
//   videoInput2.addEventListener("change", (event) => loadVideo(event, displayedVideo2, "slider2", "slice1Start2", "slice1End2", "displayStart2", "displayEnd2"));
//   videoInput3.addEventListener("change", (event) => loadVideo(event, displayedVideo3, "slider3", "slice1Start3", "slice1End3", "displayStart3", "displayEnd3"));

//   // Overlay and Other Controls Event Listeners (No changes needed here)
//   overlayColor.addEventListener("input", () => {
//     colorValue.textContent = overlayColor.value.toUpperCase();
//   });

//   overlayOpacity.addEventListener("input", () => {
//     opacityValue.textContent = overlayOpacity.value;
//   });

//   gradientColor.addEventListener("input", () => {
//     gradientColorValue.textContent = gradientColor.value.toUpperCase();
//   });

//   enableOverlay.addEventListener("change", () => {
//     overlayControls.style.display = enableOverlay.checked ? "block" : "none";
//     if (enableOverlay.checked) {
//       enableGradientOverlay.checked = false;
//       gradientControls.style.display = "none";
//     }
//   });

//   enableGradientOverlay.addEventListener("change", () => {
//     gradientControls.style.display = enableGradientOverlay.checked ? "block" : "none";
//     if (enableGradientOverlay.checked) {
//       enableOverlay.checked = false;
//       overlayControls.style.display = "none";
//     }
//   });

//   enableSlowVideo.addEventListener("change", () => {
//     slowControls.style.display = enableSlowVideo.checked ? "block" : "none";
//   });

//   enableGifConversion.addEventListener("change", () => {
//     gifControls.style.display = enableGifConversion.checked ? "block" : "none";
//   });

//   slowFactor.addEventListener("input", () => {
//     slowFactorValue.textContent = slowFactor.value + "x";
//   });

//   form.addEventListener("submit", (event) => {
//     event.preventDefault();
//     notification.style.display = "block";
//     const formData = new FormData(form);

//     const sliceStart1 = parseFloat(document.getElementById("slice1Start1").value);
//     const sliceEnd1 = parseFloat(document.getElementById("slice1End1").value);
//     formData.set("slice1Start1", sliceStart1);
//     formData.set("slice1End1", sliceEnd1);

//     if (numVideos.value >= 2) {
//       const sliceStart2 = parseFloat(document.getElementById("slice1Start2").value);
//       const sliceEnd2 = parseFloat(document.getElementById("slice1End2").value);
//       formData.set("slice1Start2", sliceStart2);
//       formData.set("slice1End2", sliceEnd2);
//     }

//     if (numVideos.value == 3) {
//       const sliceStart3 = parseFloat(document.getElementById("slice1Start3").value);
//       const sliceEnd3 = parseFloat(document.getElementById("slice1End3").value);
//       formData.set("slice1Start3", sliceStart3);
//       formData.set("slice1End3", sliceEnd3);
//     }

//     if (!enableOverlay.checked) {
//       formData.delete("overlayColor");
//       formData.delete("overlayOpacity");
//     }

//     if (!enableGradientOverlay.checked) {
//       formData.delete("gradientColor");
//       formData.delete("gradientDirection");
//     }

//     if (!enableSlowVideo.checked) {
//       formData.delete("slowFactor");
//     }

//     if (!enableGifConversion.checked) {
//       formData.delete("gifFps");
//       formData.delete("gifQuality");
//     }

//     fetch("/slice-multi", { method: "POST", body: formData })
//       .then((response) => {
//         const contentType = response.headers.get("content-type");
//         return response.blob().then((blob) => ({ blob, contentType }));
//       })
//       .then(({ blob, contentType }) => {
//         notification.style.display = "none";
//         if (contentType === "image/gif") {
//           processedVideo.style.display = "none";
//           processedGif.src = URL.createObjectURL(blob);
//           processedGif.style.display = "block";
//         } else {
//           processedGif.style.display = "none";
//           processedVideo.src = URL.createObjectURL(blob);
//           processedVideo.style.display = "block";
//         }
//       })
//       .catch((error) => {
//         notification.style.display = "none";
//         console.error("Failed to process videos.", error);
//       });
//   });

//   const synchronizeVideoWithSlider = (videoElement, sliceStartId, sliceEndId) => {
//     const sliceStart = () => parseFloat(document.getElementById(sliceStartId).value);
//     const sliceEnd = () => parseFloat(document.getElementById(sliceEndId).value);

//     videoElement.addEventListener("play", () => {
//       const currentTime = videoElement.currentTime;
//       const startTime = sliceStart();
//       const endTime = sliceEnd();

//       if (currentTime < startTime || currentTime > endTime) {
//         videoElement.currentTime = startTime;
//       }
//     });

//     videoElement.addEventListener("timeupdate", () => {
//       if (videoElement.currentTime >= sliceEnd()) {
//         videoElement.pause();
//       }
//     });

//     videoElement.addEventListener("seeking", () => {
//       const currentTime = videoElement.currentTime;
//       const startTime = sliceStart();
//       const endTime = sliceEnd();

//       if (currentTime < startTime) {
//         videoElement.currentTime = startTime;
//       } else if (currentTime > endTime) {
//         videoElement.currentTime = endTime;
//       }
//     });
//   };

//   synchronizeVideoWithSlider(displayedVideo1, "slice1Start1", "slice1End1");
//   synchronizeVideoWithSlider(displayedVideo2, "slice1Start2", "slice1End2");
//   synchronizeVideoWithSlider(displayedVideo3, "slice1Start3", "slice1End3");
// });

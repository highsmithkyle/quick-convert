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

  let minWidth = Infinity;
  let minHeight = Infinity;

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

  const loadVideo = (event, videoElement, sliderId, sliceStartId, sliceEndId, displayStartId, displayEndId) => {
    const file = event.target.files[0];
    if (file) {
      videoElement.src = URL.createObjectURL(file);
      videoElement.parentElement.style.display = "block";
      videoElement.onloadedmetadata = () => {
        updateDimensions();
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

        displayStart.addEventListener("input", (e) => {
          let newStart = parseFloat(e.target.value);
          let currentEnd = parseFloat(slider.noUiSlider.get()[1]);

          if (isNaN(newStart)) newStart = 0;
          newStart = Math.max(0, Math.min(newStart, currentEnd - 0.1));
          newStart = parseFloat(newStart.toFixed(1));

          slider.noUiSlider.set([newStart, null]);
        });

        displayEnd.addEventListener("input", (e) => {
          let newEnd = parseFloat(e.target.value);
          let currentStart = parseFloat(slider.noUiSlider.get()[0]);

          if (isNaN(newEnd)) newEnd = duration;
          newEnd = Math.min(duration, Math.max(newEnd, currentStart + 0.1));
          newEnd = parseFloat(newEnd.toFixed(1));

          slider.noUiSlider.set([null, newEnd]);
        });
      };
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

//   const loadVideo = (event, videoElement, sliderId, sliceStartId, sliceEndId) => {
//     const file = event.target.files[0];
//     if (file) {
//       videoElement.src = URL.createObjectURL(file);
//       videoElement.parentElement.style.display = "block";
//       videoElement.onloadedmetadata = () => {
//         updateDimensions();
//         const duration = videoElement.duration;
//         const slider = document.getElementById(sliderId);
//         if (!slider.noUiSlider) {
//           noUiSlider.create(slider, {
//             start: [0, duration],
//             connect: true,
//             range: {
//               min: 0,
//               max: duration,
//             },
//             step: 0.1,
//             tooltips: [true, true],
//             format: {
//               to: (value) => value.toFixed(1),
//               from: (value) => Number(value),
//             },
//           });

//           slider.noUiSlider.on("update", (values) => {
//             const start = parseFloat(values[0]);
//             const end = parseFloat(values[1]);
//             document.getElementById(sliceStartId).value = start;
//             document.getElementById(sliceEndId).value = end;
//             if (videoElement.paused) {
//               videoElement.currentTime = start;
//             }
//           });
//         } else {
//           slider.noUiSlider.updateOptions({
//             range: {
//               min: 0,
//               max: duration,
//             },
//             start: [0, duration],
//           });
//         }
//       };
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

//   videoInput1.addEventListener("change", (event) => loadVideo(event, displayedVideo1, "slider1", "slice1Start1", "slice1End1"));
//   videoInput2.addEventListener("change", (event) => loadVideo(event, displayedVideo2, "slider2", "slice1Start2", "slice1End2"));
//   videoInput3.addEventListener("change", (event) => loadVideo(event, displayedVideo3, "slider3", "slice1Start3", "slice1End3"));

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
//   const videoSection2 = document.getElementById("videoUploadSection2");
//   const videoSection3 = document.getElementById("videoUploadSection3");
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
//   const customSize = document.getElementById("customSize");
//   const customSizeContainer = document.getElementById("customSizeContainer");

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

//     if (minWidth !== Infinity && minHeight !== Infinity && !customSize.checked) {
//       outputWidth.value = minWidth;
//       outputWidth.max = minWidth;
//       outputHeight.value = minHeight;
//       outputHeight.max = minHeight;
//       outputWidth.disabled = true;
//       outputHeight.disabled = true;
//       console.log(`Updated Output Dimensions: Width=${minWidth}, Height=${minHeight}`);
//     } else if (!customSize.checked) {
//       outputWidth.value = "";
//       outputHeight.value = "";
//       outputWidth.disabled = true;
//       outputHeight.disabled = true;
//     }
//   };

//   const loadVideo = (event, videoElement, sliderId, sliceStartId, sliceEndId) => {
//     const file = event.target.files[0];
//     if (file) {
//       videoElement.src = URL.createObjectURL(file);
//       videoElement.parentElement.style.display = "block";
//       console.log(`Loaded video: ${file.name}`);
//       videoElement.onloadedmetadata = () => {
//         updateDimensions();
//         const duration = videoElement.duration;
//         console.log(`Video Duration: ${duration} seconds`);

//         const slider = document.getElementById(sliderId);
//         if (!slider.noUiSlider) {
//           noUiSlider.create(slider, {
//             start: [0, duration],
//             connect: true,
//             range: {
//               min: 0,
//               max: duration,
//             },
//             step: 0.1,
//             tooltips: [true, true],
//             format: {
//               to: function (value) {
//                 return value.toFixed(1);
//               },
//               from: function (value) {
//                 return Number(value);
//               },
//             },
//           });

//           slider.noUiSlider.on("update", function (values, handle) {
//             const start = parseFloat(values[0]);
//             const end = parseFloat(values[1]);
//             document.getElementById(sliceStartId).value = start;
//             document.getElementById(sliceEndId).value = end;
//             console.log(`Slider Updated [${sliderId}]: Start=${start}, End=${end}`);

//             if (videoElement.paused) {
//               videoElement.currentTime = start;
//             }
//           });
//         } else {
//           slider.noUiSlider.updateOptions({
//             range: {
//               min: 0,
//               max: duration,
//             },
//             start: [0, duration],
//           });
//           console.log(`Updated slider range for ${sliderId}: 0 to ${duration}`);
//         }
//       };
//     }
//   };

//   numVideos.addEventListener("change", function (event) {
//     const value = event.target.value;
//     videoSection2.style.display = value >= 2 ? "block" : "none";
//     videoSection3.style.display = value == 3 ? "block" : "none";

//     console.log(`Number of Videos Selected: ${value}`);
//   });

//   videoInput1.addEventListener("change", (event) => loadVideo(event, displayedVideo1, "slider1", "slice1Start1", "slice1End1"));
//   videoInput2.addEventListener("change", (event) => loadVideo(event, displayedVideo2, "slider2", "slice1Start2", "slice1End2"));
//   videoInput3.addEventListener("change", (event) => loadVideo(event, displayedVideo3, "slider3", "slice1Start3", "slice1End3"));

//   overlayColor.addEventListener("input", function () {
//     colorValue.textContent = overlayColor.value.toUpperCase();
//     console.log(`Overlay Color Changed: ${overlayColor.value.toUpperCase()}`);
//   });

//   overlayOpacity.addEventListener("input", function () {
//     opacityValue.textContent = overlayOpacity.value;
//     console.log(`Overlay Opacity Changed: ${overlayOpacity.value}`);
//   });

//   gradientColor.addEventListener("input", function () {
//     gradientColorValue.textContent = gradientColor.value.toUpperCase();
//     console.log(`Gradient Color Changed: ${gradientColor.value.toUpperCase()}`);
//   });

//   enableOverlay.addEventListener("change", function () {
//     overlayControls.style.display = enableOverlay.checked ? "block" : "none";
//     if (enableOverlay.checked) {
//       enableGradientOverlay.checked = false;
//       gradientControls.style.display = "none";
//     }
//     console.log(`Enable Overlay: ${enableOverlay.checked}`);
//   });

//   enableGradientOverlay.addEventListener("change", function () {
//     gradientControls.style.display = enableGradientOverlay.checked ? "block" : "none";
//     if (enableGradientOverlay.checked) {
//       enableOverlay.checked = false;
//       overlayControls.style.display = "none";
//     }
//     console.log(`Enable Gradient Overlay: ${enableGradientOverlay.checked}`);
//   });

//   enableSlowVideo.addEventListener("change", function () {
//     slowControls.style.display = enableSlowVideo.checked ? "block" : "none";
//     console.log(`Enable Slow Video: ${enableSlowVideo.checked}`);
//   });

//   enableGifConversion.addEventListener("change", function () {
//     gifControls.style.display = enableGifConversion.checked ? "block" : "none";
//     console.log(`Enable GIF Conversion: ${enableGifConversion.checked}`);
//   });

//   slowFactor.addEventListener("input", function () {
//     slowFactorValue.textContent = slowFactor.value + "x";
//     console.log(`Slow Factor Changed: ${slowFactor.value}x`);
//   });

//   customSize.addEventListener("change", function () {
//     if (customSize.checked) {
//       customSizeContainer.style.display = "block";
//       outputWidth.disabled = false;
//       outputHeight.disabled = false;
//     } else {
//       customSizeContainer.style.display = "none";
//       outputWidth.disabled = true;
//       outputHeight.disabled = true;
//       updateDimensions();
//     }
//     console.log(`Custom Size Enabled: ${customSize.checked}`);
//   });

//   form.addEventListener("submit", function (event) {
//     event.preventDefault();
//     notification.style.display = "block";
//     console.log("Form submission started.");

//     const formData = new FormData(this);

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

//     console.log("Submitting Form Data:");
//     for (let pair of formData.entries()) {
//       console.log(`${pair[0]}: ${pair[1]}`);
//     }

//     fetch("/slice-multi", { method: "POST", body: formData })
//       .then((response) => {
//         const contentType = response.headers.get("content-type");
//         return response.blob().then((blob) => ({ blob, contentType }));
//       })
//       .then(({ blob, contentType }) => {
//         notification.style.display = "none";
//         console.log("Form submission successful.");

//         if (contentType === "image/gif") {
//           processedVideo.style.display = "none";
//           processedGif.src = URL.createObjectURL(blob);
//           processedGif.style.display = "block";
//           console.log("GIF processed and displayed.");
//         } else {
//           processedGif.style.display = "none";
//           processedVideo.src = URL.createObjectURL(blob);
//           processedVideo.style.display = "block";
//           console.log("Video processed and displayed.");
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

//     videoElement.addEventListener("play", function () {
//       const currentTime = videoElement.currentTime;
//       const startTime = sliceStart();
//       const endTime = sliceEnd();

//       if (currentTime < startTime || currentTime > endTime) {
//         videoElement.currentTime = startTime;
//       }
//     });

//     videoElement.addEventListener("timeupdate", function () {
//       if (videoElement.currentTime >= sliceEnd()) {
//         videoElement.pause();
//         console.log(`Video reached end of slice at ${sliceEnd()} seconds`);
//       }
//     });

//     videoElement.addEventListener("seeking", function () {
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

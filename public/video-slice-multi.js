document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("slicerForm");
  const uploadedVideo1 = document.getElementById("uploadedVideo1");
  const uploadedVideo2 = document.getElementById("uploadedVideo2");
  const uploadedVideo3 = document.getElementById("uploadedVideo3");
  const processedVideo = document.getElementById("processedVideo");
  const processedGif = document.getElementById("processedGif");
  const videoInput1 = document.getElementById("video1");
  const videoInput2 = document.getElementById("video2");
  const videoInput3 = document.getElementById("video3");
  const notification = document.getElementById("processingNotification");
  const numVideos = document.getElementById("numVideos");
  const videoSection2 = document.getElementById("videoSection2");
  const videoSection3 = document.getElementById("videoSection3");
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
    const videos = [uploadedVideo1, uploadedVideo2, uploadedVideo3];

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
    }
  };

  const loadVideo = (event, videoElement) => {
    const file = event.target.files[0];
    if (file) {
      videoElement.src = URL.createObjectURL(file);
      videoElement.parentElement.style.display = "block";
      videoElement.onloadedmetadata = updateDimensions;
    }
  };

  numVideos.addEventListener("change", function (event) {
    const value = event.target.value;
    videoSection2.style.display = value >= 2 ? "block" : "none";
    videoSection3.style.display = value == 3 ? "block" : "none";
    uploadedVideoSection2.style.display = value >= 2 ? "block" : "none";
    uploadedVideoSection3.style.display = value == 3 ? "block" : "none";
  });

  videoInput1.addEventListener("change", (event) => loadVideo(event, uploadedVideo1));
  videoInput2.addEventListener("change", (event) => loadVideo(event, uploadedVideo2));
  videoInput3.addEventListener("change", (event) => loadVideo(event, uploadedVideo3));

  overlayColor.addEventListener("input", function () {
    colorValue.textContent = overlayColor.value.toUpperCase();
  });

  overlayOpacity.addEventListener("input", function () {
    opacityValue.textContent = overlayOpacity.value;
  });

  gradientColor.addEventListener("input", function () {
    gradientColorValue.textContent = gradientColor.value.toUpperCase();
  });

  enableOverlay.addEventListener("change", function () {
    overlayControls.style.display = enableOverlay.checked ? "block" : "none";
    if (enableOverlay.checked) {
      enableGradientOverlay.checked = false;
      gradientControls.style.display = "none";
    }
  });

  enableGradientOverlay.addEventListener("change", function () {
    gradientControls.style.display = enableGradientOverlay.checked ? "block" : "none";
    if (enableGradientOverlay.checked) {
      enableOverlay.checked = false;
      overlayControls.style.display = "none";
    }
  });

  enableSlowVideo.addEventListener("change", function () {
    slowControls.style.display = enableSlowVideo.checked ? "block" : "none";
  });

  enableGifConversion.addEventListener("change", function () {
    gifControls.style.display = enableGifConversion.checked ? "block" : "none";
  });

  slowFactor.addEventListener("input", function () {
    slowFactorValue.textContent = slowFactor.value;
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    notification.style.display = "block";
    const formData = new FormData(this);

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
      .catch(() => {
        notification.style.display = "none";
        console.error("Failed to process videos.");
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const form = document.getElementById("slicerForm");
//   const uploadedVideo1 = document.getElementById("uploadedVideo1");
//   const uploadedVideo2 = document.getElementById("uploadedVideo2");
//   const uploadedVideo3 = document.getElementById("uploadedVideo3");
//   const processedVideo = document.getElementById("processedVideo");
//   const videoInput1 = document.getElementById("video1");
//   const videoInput2 = document.getElementById("video2");
//   const videoInput3 = document.getElementById("video3");
//   const notification = document.getElementById("processingNotification");
//   const numVideos = document.getElementById("numVideos");
//   const videoSection2 = document.getElementById("videoSection2");
//   const videoSection3 = document.getElementById("videoSection3");
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
//     const videos = [uploadedVideo1, uploadedVideo2, uploadedVideo3];

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
//     }
//   };

//   const loadVideo = (event, videoElement) => {
//     const file = event.target.files[0];
//     if (file) {
//       videoElement.src = URL.createObjectURL(file);
//       videoElement.parentElement.style.display = "block";
//       videoElement.onloadedmetadata = updateDimensions;
//     }
//   };

//   numVideos.addEventListener("change", function (event) {
//     const value = event.target.value;
//     videoSection2.style.display = value >= 2 ? "block" : "none";
//     videoSection3.style.display = value == 3 ? "block" : "none";
//     uploadedVideoSection2.style.display = value >= 2 ? "block" : "none";
//     uploadedVideoSection3.style.display = value == 3 ? "block" : "none";
//   });

//   videoInput1.addEventListener("change", (event) => loadVideo(event, uploadedVideo1));
//   videoInput2.addEventListener("change", (event) => loadVideo(event, uploadedVideo2));
//   videoInput3.addEventListener("change", (event) => loadVideo(event, uploadedVideo3));

//   overlayColor.addEventListener("input", function () {
//     colorValue.textContent = overlayColor.value.toUpperCase();
//   });

//   overlayOpacity.addEventListener("input", function () {
//     opacityValue.textContent = overlayOpacity.value;
//   });

//   gradientColor.addEventListener("input", function () {
//     gradientColorValue.textContent = gradientColor.value.toUpperCase();
//   });

//   enableOverlay.addEventListener("change", function () {
//     overlayControls.style.display = enableOverlay.checked ? "block" : "none";
//     if (enableOverlay.checked) {
//       enableGradientOverlay.checked = false;
//       gradientControls.style.display = "none";
//     }
//   });

//   enableGradientOverlay.addEventListener("change", function () {
//     gradientControls.style.display = enableGradientOverlay.checked ? "block" : "none";
//     if (enableGradientOverlay.checked) {
//       enableOverlay.checked = false;
//       overlayControls.style.display = "none";
//     }
//   });

//   enableSlowVideo.addEventListener("change", function () {
//     slowControls.style.display = enableSlowVideo.checked ? "block" : "none";
//   });

//   enableGifConversion.addEventListener("change", function () {
//     gifControls.style.display = enableGifConversion.checked ? "block" : "none";
//   });

//   slowFactor.addEventListener("input", function () {
//     slowFactorValue.textContent = slowFactor.value;
//   });

//   form.addEventListener("submit", function (event) {
//     event.preventDefault();
//     notification.style.display = "block";
//     const formData = new FormData(this);

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
//       .then((response) => response.blob())
//       .then((blob) => {
//         notification.style.display = "none";
//         processedVideo.src = URL.createObjectURL(blob);
//         processedVideo.parentElement.style.display = "block";
//       })
//       .catch(() => {
//         notification.style.display = "none";
//         console.error("Failed to process videos.");
//       });
//   });
// });

// document.addEventListener("DOMContentLoaded", function () {
//   const form = document.getElementById("slicerForm");
//   const uploadedVideo1 = document.getElementById("uploadedVideo1");
//   const uploadedVideo2 = document.getElementById("uploadedVideo2");
//   const uploadedVideo3 = document.getElementById("uploadedVideo3");
//   const processedVideo = document.getElementById("processedVideo");
//   const processedGif = document.getElementById("processedGif");
//   const videoInput1 = document.getElementById("video1");
//   const videoInput2 = document.getElementById("video2");
//   const videoInput3 = document.getElementById("video3");
//   const notification = document.getElementById("processingNotification");
//   const numVideos = document.getElementById("numVideos");
//   const videoSection2 = document.getElementById("videoSection2");
//   const videoSection3 = document.getElementById("videoSection3");
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
//   const slowVideoControls = document.getElementById("slowVideoControls");
//   const slowFactor = document.getElementById("slowFactor");
//   const slowFactorValue = document.getElementById("slowFactorValue");
//   const enableGifConversion = document.getElementById("enableGifConversion");
//   const gifControls = document.getElementById("gifControls");
//   const gifFps = document.getElementById("gifFps");
//   const gifQuality = document.getElementById("gifQuality");
//   const gifQualityValue = document.getElementById("gifQualityValue");

//   let minWidth = Infinity;
//   let minHeight = Infinity;

//   const updateDimensions = () => {
//     minWidth = Infinity;
//     minHeight = Infinity;
//     const videos = [uploadedVideo1, uploadedVideo2, uploadedVideo3];

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
//     }
//   };

//   const loadVideo = (event, videoElement) => {
//     const file = event.target.files[0];
//     if (file) {
//       videoElement.src = URL.createObjectURL(file);
//       videoElement.parentElement.style.display = "block";
//       videoElement.onloadedmetadata = updateDimensions;
//     }
//   };

//   numVideos.addEventListener("change", function (event) {
//     const value = event.target.value;
//     videoSection2.style.display = value >= 2 ? "block" : "none";
//     videoSection3.style.display = value == 3 ? "block" : "none";
//     uploadedVideoSection2.style.display = value >= 2 ? "block" : "none";
//     uploadedVideoSection3.style.display = value == 3 ? "block" : "none";
//   });

//   videoInput1.addEventListener("change", (event) => loadVideo(event, uploadedVideo1));
//   videoInput2.addEventListener("change", (event) => loadVideo(event, uploadedVideo2));
//   videoInput3.addEventListener("change", (event) => loadVideo(event, uploadedVideo3));

//   overlayColor.addEventListener("input", function () {
//     colorValue.textContent = overlayColor.value.toUpperCase();
//   });

//   overlayOpacity.addEventListener("input", function () {
//     opacityValue.textContent = overlayOpacity.value;
//   });

//   gradientColor.addEventListener("input", function () {
//     gradientColorValue.textContent = gradientColor.value.toUpperCase();
//   });

//   slowFactor.addEventListener("input", function () {
//     slowFactorValue.textContent = `${this.value}x`;
//   });

//   gifQuality.addEventListener("input", function () {
//     gifQualityValue.textContent = this.value;
//   });

//   enableOverlay.addEventListener("change", function () {
//     overlayControls.style.display = enableOverlay.checked ? "block" : "none";
//     if (enableOverlay.checked) {
//       enableGradientOverlay.checked = false;
//       gradientControls.style.display = "none";
//       enableSlowVideo.checked = false;
//       slowVideoControls.style.display = "none";
//       enableGifConversion.checked = false;
//       gifControls.style.display = "none";
//     }
//   });

//   enableGradientOverlay.addEventListener("change", function () {
//     gradientControls.style.display = enableGradientOverlay.checked ? "block" : "none";
//     if (enableGradientOverlay.checked) {
//       enableOverlay.checked = false;
//       overlayControls.style.display = "none";
//       enableSlowVideo.checked = false;
//       slowVideoControls.style.display = "none";
//       enableGifConversion.checked = false;
//       gifControls.style.display = "none";
//     }
//   });

//   enableSlowVideo.addEventListener("change", function () {
//     slowVideoControls.style.display = enableSlowVideo.checked ? "block" : "none";
//     if (enableSlowVideo.checked) {
//       enableOverlay.checked = false;
//       overlayControls.style.display = "none";
//       enableGradientOverlay.checked = false;
//       gradientControls.style.display = "none";
//       enableGifConversion.checked = false;
//       gifControls.style.display = "none";
//     }
//   });

//   enableGifConversion.addEventListener("change", function () {
//     gifControls.style.display = enableGifConversion.checked ? "block" : "none";
//     if (enableGifConversion.checked) {
//       enableOverlay.checked = false;
//       overlayControls.style.display = "none";
//       enableGradientOverlay.checked = false;
//       gradientControls.style.display = "none";
//       enableSlowVideo.checked = false;
//       slowVideoControls.style.display = "none";
//     }
//   });

//   form.addEventListener("submit", function (event) {
//     event.preventDefault();
//     notification.style.display = "block";
//     const formData = new FormData(this);

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
//       .then((response) => response.blob())
//       .then((blob) => {
//         notification.style.display = "none";
//         if (enableGifConversion.checked) {
//           processedGif.src = URL.createObjectURL(blob);
//           processedGif.style.display = "block";
//           processedVideo.style.display = "none";
//         } else {
//           processedVideo.src = URL.createObjectURL(blob);
//           processedVideo.style.display = "block";
//           processedGif.style.display = "none";
//         }
//       })
//       .catch(() => {
//         notification.style.display = "none";
//         console.error("Failed to process videos.");
//       });
//   });
// });

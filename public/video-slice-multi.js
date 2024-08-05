document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("slicerForm");
  const uploadedVideo1 = document.getElementById("uploadedVideo1");
  const uploadedVideo2 = document.getElementById("uploadedVideo2");
  const uploadedVideo3 = document.getElementById("uploadedVideo3");
  const processedVideo = document.getElementById("processedVideo");
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

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    notification.style.display = "block";
    const formData = new FormData(this);

    fetch("/slice-multi", { method: "POST", body: formData })
      .then((response) => response.blob())
      .then((blob) => {
        notification.style.display = "none";
        processedVideo.src = URL.createObjectURL(blob);
        processedVideo.parentElement.style.display = "block";
      })
      .catch(() => {
        notification.style.display = "none";
        console.error("Failed to process videos.");
      });
  });
});

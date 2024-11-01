document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("testUploadForm");
  const videoInput = document.getElementById("testVideoInput");
  const convertedVideo = document.getElementById("convertedVideo");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const file = videoInput.files[0];
    if (!file) {
      alert("Please select a video file.");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

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
        const convertedUrl = URL.createObjectURL(convertedBlob);
        convertedVideo.src = convertedUrl;
        convertedVideo.style.display = "block";
      })
      .catch((error) => {
        console.error("Error converting video:", error);
        alert("Error converting video. Please check the console for more details.");
      });
  });
});

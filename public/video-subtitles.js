document.addEventListener("DOMContentLoaded", function () {
  const uploadFormVideo = document.getElementById("uploadFormVideo");
  const videoInput = document.getElementById("video");
  const uploadedVideo = document.getElementById("uploadedVideo");
  const subtitledVideo = document.getElementById("subtitledVideo");
  const transcript = document.getElementById("transcript");
  const processingNotification = document.getElementById("processingNotification");
  const colorPicker = document.getElementById("fontColor");
  const colorValueDisplay = document.getElementById("colorValue");
  const outlineColorPicker = document.getElementById("outlineColor");
  const outlineColorValueDisplay = document.getElementById("outlineColorValue");
  const advancedOptionsCheckbox = document.getElementById("advancedOptions");
  const advancedOptionsGroup = document.getElementById("advancedOptionsGroup");
  const subtitlePosition = document.getElementById("subtitlePosition");

  videoInput.addEventListener("change", function () {
    const file = videoInput.files[0];
    if (file) {
      uploadedVideo.src = URL.createObjectURL(file);
      uploadedVideo.load();
      uploadedVideo.onloadeddata = function () {
        uploadedVideo.parentElement.style.display = "block";
      };
    }
  });

  colorPicker.addEventListener("input", function () {
    colorValueDisplay.textContent = colorPicker.value.toUpperCase();
  });

  outlineColorPicker.addEventListener("input", function () {
    outlineColorValueDisplay.textContent = outlineColorPicker.value.toUpperCase();
  });

  function updateLabels() {
    const borderStyle = document.getElementById("borderStyle").value;
    const fontColorLabel = document.getElementById("fontColorLabel");
    const outlineColorLabel = document.getElementById("outlineColorLabel");

    if (borderStyle == "1") {
      fontColorLabel.textContent = "Subtitle Color:";
      outlineColorLabel.textContent = "Outline Color:";
    } else {
      fontColorLabel.textContent = "Subtitle Color:";
      outlineColorLabel.textContent = "Background Color:";
    }
  }

  document.getElementById("borderStyle").addEventListener("change", updateLabels);

  updateLabels();

  advancedOptionsCheckbox.addEventListener("change", function () {
    advancedOptionsGroup.style.display = advancedOptionsCheckbox.checked ? "block" : "none";
  });

  uploadFormVideo.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!videoInput.files[0]) {
      alert("Please select a video file to upload.");
      return;
    }

    processingNotification.style.display = "block";
    const formData = new FormData();
    formData.append("video", videoInput.files[0]);
    formData.append("fontSize", document.getElementById("fontSize").value);
    formData.append("fontFamily", document.getElementById("fontFamily").value);
    formData.append("fontColor", document.getElementById("fontColor").value);
    formData.append("borderStyle", document.getElementById("borderStyle").value);
    formData.append("outlineColor", document.getElementById("outlineColor").value);
    formData.append("subtitlePosition", subtitlePosition.value);
    if (advancedOptionsCheckbox.checked) {
      formData.append("maxWordsPerLine", document.getElementById("maxWordsPerLine").value);
      formData.append("maxDurationPerLine", document.getElementById("maxDurationPerLine").value);
      formData.append("bufferTime", document.getElementById("bufferTime").value);
    }

    fetch("/transcribe-video", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        processingNotification.style.display = "none";
        console.log("Server response:", data);
        if (data.message === "Video processed with subtitles" && data.videoUrl) {
          subtitledVideo.src = data.videoUrl;
          subtitledVideo.load();
          subtitledVideo.onloadeddata = function () {
            subtitledVideo.style.display = "block";
            transcript.textContent = "Transcription and subtitles should be visible in the video player.";
          };
        } else {
          transcript.textContent = "No transcription available or video not processed.";
        }
      })
      .catch((error) => {
        processingNotification.style.display = "none";
        alert("This video cannot be transcribed, please try another video."); // Display an alert for transcription errors
        console.error("Fetch error:", error);
        transcript.textContent = "Failed to transcribe video.";
      });
  });
});

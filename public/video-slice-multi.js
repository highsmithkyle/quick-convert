document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("slicerForm");
  const uploadedVideo1 = document.getElementById("uploadedVideo1");
  const uploadedVideo2 = document.getElementById("uploadedVideo2");
  const processedVideo = document.getElementById("processedVideo");
  const videoInput1 = document.getElementById("video1");
  const videoInput2 = document.getElementById("video2");
  const notification = document.getElementById("processingNotification");

  videoInput1.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo1.src = URL.createObjectURL(file);
      uploadedVideo1.parentElement.style.display = "block";
    }
  });

  videoInput2.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo2.src = URL.createObjectURL(file);
      uploadedVideo2.parentElement.style.display = "block";
    }
  });

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

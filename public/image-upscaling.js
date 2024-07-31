document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormUpscale = document.getElementById("uploadFormUpscale");
  const notification = document.getElementById("processingNotification");
  const upscalePercentageSlider = document.getElementById("upscale_percentage");
  const percentageDisplay = document.getElementById("percentage_display");

  function updatePercentageDisplay(value) {
    percentageDisplay.textContent = value + "%";
  }

  window.updatePercentageDisplay = updatePercentageDisplay;

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = document.getElementById("uploadedImage");
        img.src = e.target.result;
        img.onload = function () {
          const originalWidth = img.naturalWidth;
          const originalHeight = img.naturalHeight;
          upscalePercentageSlider.addEventListener("input", function () {
            updatePercentageDisplay(this.value);
          });
        };
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  uploadFormUpscale.addEventListener("submit", function (e) {
    e.preventDefault();
    const scale = upscalePercentageSlider.value / 100;
    const scaledWidth = Math.round(document.getElementById("uploadedImage").naturalWidth * scale);
    const scaledHeight = Math.round(document.getElementById("uploadedImage").naturalHeight * scale);

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);
    formData.append("target_width", scaledWidth);
    formData.append("target_height", scaledHeight);

    notification.style.display = "block";

    fetch("/upscale-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Server responded with " + response.status);
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        document.getElementById("processedImage").src = url;
        notification.style.display = "none";
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to upscale the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

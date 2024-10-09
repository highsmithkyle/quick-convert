document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadForm = document.getElementById("uploadForm");
  const notification = document.getElementById("processingNotification");

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("uploadedImage").src = e.target.result;
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(this);

    notification.style.display = "block";
    fetch("/remove-background", {
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
        alert("Failed to process the image. " + err.message);
        notification.style.display = "none";
      });
  });
});

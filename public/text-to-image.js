document.addEventListener("DOMContentLoaded", function () {
  const textToImageForm = document.getElementById("textToImageForm");
  const notification = document.getElementById("processingNotification");

  textToImageForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    notification.style.display = "block";

    fetch("http://localhost:3000/text-to-image", {
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
        document.getElementById("generatedImage").src = url;
        notification.style.display = "none";
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Failed to generate image from text. " + err.message);
        notification.style.display = "none";
      });
  });
});

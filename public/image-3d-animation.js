document.addEventListener("DOMContentLoaded", function () {
  const uploadFormAnimation = document.getElementById("uploadFormAnimation");
  const notification = document.getElementById("processingNotification");
  const downloadButtonContainer = document.getElementById("downloadButtonContainer");

  uploadFormAnimation.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    console.log("Submitting form with data:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    notification.style.display = "block";

    const response = await fetch("/generate-animation", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const url = data.downloadUrl;
      document.getElementById("processedAnimation").src = url;
      notification.style.display = "none";

      downloadButtonContainer.innerHTML = "";

      const downloadButton = document.createElement("button");
      downloadButton.textContent = "Download Animation";
      downloadButton.className = "download-button";
      downloadButton.addEventListener("click", function () {
        const a = document.createElement("a");
        a.href = url;
        a.download = "3d_animation.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      downloadButtonContainer.appendChild(downloadButton);
      downloadButtonContainer.style.display = "block";
    } else {
      const errorText = await response.text();
      alert(`Failed to generate animation: ${errorText}`);
      notification.style.display = "none";
    }
  });

  const imageUrlInput = document.getElementById("inputImageUrl");
  imageUrlInput.addEventListener("input", function () {
    document.getElementById("uploadedImage").src = this.value;
  });
});

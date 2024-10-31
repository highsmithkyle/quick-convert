document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("youtubeDownloaderForm");
  const notification = document.getElementById("notification");
  const downloadLinkContainer = document.getElementById("downloadLinkContainer");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    downloadLinkContainer.innerHTML = "";
    const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
    const format = document.getElementById("formatSelect").value;

    if (!youtubeUrl) {
      alert("Please enter a YouTube URL.");
      return;
    }

    notification.style.display = "block";

    fetch("/download-youtube", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ youtubeUrl, format }),
    })
      .then((response) => response.json())
      .then((data) => {
        notification.style.display = "none";
        if (data.success) {
          const downloadLink = document.createElement("a");
          downloadLink.href = data.downloadUrl;
          downloadLink.textContent = "Download Your File";
          downloadLink.download = data.filename;
          downloadLink.className = "download-link";
          downloadLinkContainer.appendChild(downloadLink);
        } else {
          alert(data.message || "An error occurred.");
        }
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error("Error:", error);
        alert("An error occurred while processing your request.");
      });
  });
});

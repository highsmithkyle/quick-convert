document.getElementById("fetchFormatsForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const url = document.getElementById("url").value;
  const processingNotification = document.getElementById("processingNotification");
  const downloadForm = document.getElementById("downloadForm");
  const formatSelect = document.getElementById("format");

  processingNotification.style.display = "block";
  downloadForm.style.display = "none";
  formatSelect.innerHTML = "";

  try {
    const response = await fetch("/get-formats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const formats = await response.json();
      formats.forEach((format) => {
        const option = document.createElement("option");
        option.value = format.itag;
        option.textContent = `${format.container} (${format.qualityLabel || format.resolution})`;
        formatSelect.appendChild(option);
      });

      downloadForm.style.display = "block";
    } else {
      console.error("Failed to fetch formats:", await response.text());
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    processingNotification.style.display = "none";
  }
});

document.getElementById("downloadForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const url = document.getElementById("url").value;
  const format = document.getElementById("format").value;
  const processingNotification = document.getElementById("processingNotification");
  const downloadLink = document.getElementById("downloadLink");

  processingNotification.style.display = "block";

  try {
    const response = await fetch("/download-youtube", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, format }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      downloadLink.href = downloadUrl;
      downloadLink.style.display = "inline";
      downloadLink.click();
    } else {
      console.error("Download failed:", await response.text());
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    processingNotification.style.display = "none";
  }
});

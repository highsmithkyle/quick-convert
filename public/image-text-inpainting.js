document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const inpaintButton = document.getElementById("inpaintButton");
  const textPromptInput = document.getElementById("textPrompt");
  const brushSizeSlider = document.getElementById("brushSize");
  const canvas = document.getElementById("imageCanvas");
  const ctx = canvas.getContext("2d");
  let img = new Image();
  let currentBlob = null;
  let brushSize = brushSizeSlider.value;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  brushSizeSlider.oninput = function () {
    brushSize = this.value;
  };

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      currentBlob = this.files[0];
      loadAndDrawImage(this.files[0]);
    }
  });

  function loadAndDrawImage(blob) {
    const reader = new FileReader();
    reader.onload = function (event) {
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(blob);
  }

  canvas.addEventListener("mousedown", function (e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
    lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener("mousemove", function (e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = brushSize;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  });

  canvas.addEventListener("mouseup", () => (isDrawing = false));
  canvas.addEventListener("mouseout", () => (isDrawing = false));

  inpaintButton.addEventListener("click", function () {
    const textPrompt = textPromptInput.value;
    if (!textPrompt) {
      alert("Please provide a description of what should replace the selected area.");
      return;
    }

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    maskCtx.drawImage(canvas, 0, 0);
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = data[i] === 255 ? 255 : 0;
    }
    maskCtx.putImageData(imageData, 0, 0);

    maskCanvas.toBlob(function (maskBlob) {
      const formData = new FormData();
      formData.append("image_file", currentBlob);
      formData.append("mask_file", maskBlob, "mask.png");
      formData.append("text_prompt", textPrompt);

      document.getElementById("processingNotification").style.display = "block";

      fetch("/text-inpainting", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.blob())
        .then((blob) => {
          currentBlob = blob;
          loadAndDrawImage(blob);
          document.getElementById("processingNotification").style.display = "none";
        })
        .catch((e) => {
          console.error("Error:", e);
          alert("Failed to process the image. " + e.message);
          document.getElementById("processingNotification").style.display = "none";
        });
    }, "image/png");
  });
});

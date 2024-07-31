document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("image");
  const uploadFormUpscaleNew = document.getElementById("uploadFormUpscaleNew");
  const notification = document.getElementById("processingNotification");

  imageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = document.getElementById("uploadedImage");
        img.src = e.target.result;
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  uploadFormUpscaleNew.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);

    notification.style.display = "block";

    fetch("/upscale-image-new", {
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

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("image");
//   const uploadFormUpscaleNew = document.getElementById("uploadFormUpscaleNew");
//   const notification = document.getElementById("processingNotification");

//   imageInput.addEventListener("change", function () {
//     if (this.files && this.files[0]) {
//       var reader = new FileReader();
//       reader.onload = function (e) {
//         var img = document.getElementById("uploadedImage");
//         img.src = e.target.result;
//       };
//       reader.readAsDataURL(this.files[0]);
//     }
//   });

//   uploadFormUpscaleNew.addEventListener("submit", function (e) {
//     e.preventDefault();

//     const formData = new FormData();
//     formData.append("image", imageInput.files[0]);

//     notification.style.display = "block";

//     fetch("/upscale-image-new", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Server responded with " + response.status);
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         const url = window.URL.createObjectURL(blob);
//         document.getElementById("processedImage").src = url;
//         notification.style.display = "none";
//       })
//       .catch((err) => {
//         console.error("Error:", err);
//         alert("Failed to upscale the image. " + err.message);
//         notification.style.display = "none";
//       });
//   });
// });

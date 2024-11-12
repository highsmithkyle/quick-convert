document.addEventListener("DOMContentLoaded", function () {
  const textToImageForm = document.getElementById("textToImageForm");
  const promptInput = document.getElementById("prompt");
  const generatedImage = document.getElementById("generatedImage");
  const processingNotification = document.getElementById("processingNotification");
  const videoContainer = document.getElementById("videoContainer");

  textToImageForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const prompt = promptInput.value.trim();

    if (!prompt) {
      alert("Please enter a valid text prompt.");
      return;
    }

    // Prepare the form data
    const formData = new FormData();
    formData.append("prompt", prompt);

    // Show processing notification
    processingNotification.style.display = "block";

    // Send POST request to the server
    fetch("/text-to-image", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        processingNotification.style.display = "none";
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(text || "Server responded with an error.");
          });
        }
        return response.blob();
      })
      .then((blob) => {
        const imageUrl = URL.createObjectURL(blob);
        generatedImage.src = imageUrl;
        generatedImage.alt = "Generated Image";

        // Optionally: Add alt text or other attributes based on the prompt
        generatedImage.title = prompt;

        // Display the image container if not already visible
        videoContainer.style.display = "grid";

        textToImageForm.reset();
      })
      .catch((error) => {
        processingNotification.style.display = "none";
        console.error("Error:", error);
        alert("Failed to generate image: " + error.message);
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const textToImageForm = document.getElementById("textToImageForm");
//   const promptInput = document.getElementById("prompt");
//   const generatedImage = document.getElementById("generatedImage");
//   const processingNotification = document.getElementById("processingNotification");

//   textToImageForm.addEventListener("submit", function (e) {
//     e.preventDefault();

//     const prompt = promptInput.value.trim();

//     if (!prompt) {
//       alert("Please enter a valid text prompt.");
//       return;
//     }

//     // Prepare the form data
//     const formData = new FormData();
//     formData.append("prompt", prompt);

//     // Show processing notification
//     processingNotification.style.display = "block";

//     // Send POST request to the server
//     fetch("/text-to-image", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         processingNotification.style.display = "none";
//         if (!response.ok) {
//           return response.text().then((text) => {
//             throw new Error(text || "Server responded with an error.");
//           });
//         }
//         return response.blob();
//       })
//       .then((blob) => {
//         const imageUrl = URL.createObjectURL(blob);
//         generatedImage.src = imageUrl;

//         textToImageForm.reset();
//       })
//       .catch((error) => {
//         processingNotification.style.display = "none";
//         console.error("Error:", error);
//         alert("Failed to generate image: " + error.message);
//       });
//   });
// });

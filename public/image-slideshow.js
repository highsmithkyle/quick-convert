document.addEventListener("DOMContentLoaded", function () {
  const addImageButton = document.getElementById("addImageButton");
  const imagesInput = document.getElementById("images");
  const imageContainer = document.getElementById("imageContainer");

  // Add click event to the "Add Image" box
  addImageButton.addEventListener("click", function () {
    imagesInput.click(); // Trigger the file input dialog
  });

  // Handle file uploads and create containers for each image
  imagesInput.addEventListener("change", function (event) {
    const files = event.target.files;

    Array.from(files).forEach((file, index) => {
      const container = document.createElement("div");
      container.classList.add("image-container");

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.classList.add("slideshow-image");

      const title = document.createElement("p");
      title.textContent = `Image ${index + 1}`;
      title.classList.add("image-title");

      // Wrap the duration label and input together in a span
      const durationContainer = document.createElement("span");
      durationContainer.classList.add("duration-container");

      const durationLabel = document.createElement("label");
      durationLabel.textContent = "Duration: ";
      durationLabel.classList.add("duration-label");

      const durationInput = document.createElement("input");
      durationInput.type = "number";
      durationInput.name = `duration${index}`;
      durationInput.min = "1";
      durationInput.value = "3"; // Default duration
      durationInput.classList.add("duration-input");

      const durationSuffix = document.createElement("span");
      durationSuffix.textContent = "s"; // The "s" for seconds
      durationSuffix.classList.add("suffix");

      // Append label, input, and "s" to the span
      durationContainer.appendChild(durationLabel);
      durationContainer.appendChild(durationInput);
      durationContainer.appendChild(durationSuffix);

      // Add everything to the container
      container.appendChild(title);
      container.appendChild(img);
      container.appendChild(durationContainer);

      imageContainer.insertBefore(container, addImageButton);
    });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const addImageButton = document.getElementById("addImageButton");
//   const imagesInput = document.getElementById("images");
//   const imageContainer = document.getElementById("imageContainer");

//   // Add click event to the "Add Image" box
//   addImageButton.addEventListener("click", function () {
//     imagesInput.click(); // Trigger the file input dialog
//   });

//   // Handle file uploads and create containers for each image
//   imagesInput.addEventListener("change", function (event) {
//     const files = event.target.files;

//     Array.from(files).forEach((file, index) => {
//       const container = document.createElement("div");
//       container.classList.add("image-container");

//       const img = document.createElement("img");
//       img.src = URL.createObjectURL(file);
//       img.classList.add("slideshow-image");

//       const title = document.createElement("p");
//       title.textContent = `Image ${index + 1}`;
//       title.classList.add("image-title");

//       const durationLabel = document.createElement("label");
//       durationLabel.textContent = "Duration (s)";
//       durationLabel.classList.add("duration-label");

//       const durationInput = document.createElement("input");
//       durationInput.type = "number";
//       durationInput.name = `duration${index}`;
//       durationInput.min = "1";
//       durationInput.value = "3"; // Default duration
//       durationInput.classList.add("duration-input");

//       container.appendChild(title);
//       container.appendChild(img);
//       container.appendChild(durationLabel);
//       container.appendChild(durationInput);

//       imageContainer.insertBefore(container, addImageButton);
//     });
//   });
// });

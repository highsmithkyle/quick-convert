document.addEventListener("DOMContentLoaded", function () {
  const addImageButton = document.getElementById("addImageButton");
  const imageContainer = document.getElementById("imageContainer");
  const createVideoButton = document.getElementById("createVideoButton");
  const processingNotification = document.getElementById("processingNotification");
  let selectedFiles = [];
  let durations = [];

  addImageButton.addEventListener("click", function () {
    const imagesInput = document.createElement("input");
    imagesInput.type = "file";
    imagesInput.accept = "image/*";
    imagesInput.multiple = true;
    imagesInput.style.display = "none";
    imagesInput.click();

    imagesInput.addEventListener("change", function (event) {
      const files = event.target.files;

      Array.from(files).forEach((file) => {
        selectedFiles.push(file);
        durations.push(3); // Default duration for each image

        const container = document.createElement("div");
        container.classList.add("image-container");

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.classList.add("slideshow-image");

        const title = document.createElement("p");
        title.textContent = `Image ${selectedFiles.length}`;
        title.classList.add("image-title");

        const durationContainer = document.createElement("span");
        durationContainer.classList.add("duration-container");

        const durationLabel = document.createElement("label");
        durationLabel.textContent = "Duration: ";

        const durationInput = document.createElement("input");
        durationInput.type = "number";
        durationInput.min = "1";
        durationInput.value = "3";
        durationInput.classList.add("duration-input");

        const durationSuffix = document.createElement("span");
        durationSuffix.textContent = "s";

        durationInput.addEventListener("change", function () {
          const index = Array.prototype.indexOf.call(imageContainer.children, container) - 1;
          durations[index] = durationInput.value; // Update corresponding duration
          console.log("Updated duration at index:", index, "to", durationInput.value);
        });

        durationContainer.appendChild(durationLabel);
        durationContainer.appendChild(durationInput);
        durationContainer.appendChild(durationSuffix);

        const closeButton = document.createElement("div");
        closeButton.classList.add("close-button");
        closeButton.addEventListener("click", function () {
          // Get the index of the image to remove
          const index = Array.prototype.indexOf.call(imageContainer.children, container) - 1;

          if (index >= 0 && index < selectedFiles.length) {
            // Remove the selected file and corresponding duration
            selectedFiles.splice(index, 1);
            durations.splice(index, 1);

            // Remove the DOM element
            container.remove();

            // Update titles and any other relevant state
            updateTitles();

            console.log("Image removed at index:", index);
            console.log("Updated selectedFiles:", selectedFiles);
            console.log("Updated durations:", durations);
          }
        });

        container.appendChild(closeButton);
        container.appendChild(title);
        container.appendChild(img);
        container.appendChild(durationContainer);

        imageContainer.insertBefore(container, addImageButton);
      });

      initializeSortable();
    });
  });

  function updateTitles() {
    const containers = document.querySelectorAll(".image-container:not(.add-image-container)");
    containers.forEach((container, index) => {
      const title = container.querySelector(".image-title");
      title.textContent = `Image ${index + 1}`;
    });
  }

  function initializeSortable() {
    new Sortable(imageContainer, {
      animation: 150,
      ghostClass: "dragging",
      onEnd: function () {
        const containers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);
        const newSelectedFiles = [];
        const newDurations = [];

        containers.forEach((container) => {
          const imageIndex = container.querySelector(".image-title").textContent.split(" ")[1] - 1;
          if (selectedFiles[imageIndex]) {
            newSelectedFiles.push(selectedFiles[imageIndex]);
            newDurations.push(durations[imageIndex]);
          }
        });

        // Update the selectedFiles and durations after reordering
        selectedFiles = newSelectedFiles;
        durations = newDurations;

        console.log("Updated selectedFiles after reorder:", selectedFiles);
        console.log("Updated durations after reorder:", durations);

        updateTitles();
      },
    });
  }

  createVideoButton.addEventListener("click", function () {
    const imageContainers = document.querySelectorAll(".image-container:not(.add-image-container)");
    const formData = new FormData();

    if (selectedFiles.length === 0) {
      alert("No images selected.");
      return;
    }

    processingNotification.style.display = "block";

    imageContainers.forEach((container, index) => {
      formData.append("images", selectedFiles[index]);
      formData.append(`duration${index}`, durations[index]);
    });

    formData.append("durations", JSON.stringify(durations));

    console.log("Sending files and durations:", selectedFiles, durations);

    fetch("/create-video", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        const videoUrl = data.videoPath;
        const videoElement = document.getElementById("processedVideo");
        videoElement.src = videoUrl;
        videoElement.style.display = "block";

        processingNotification.style.display = "none";
      })
      .catch((error) => {
        console.error("Error creating video:", error);
        processingNotification.style.display = "none";
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const addImageButton = document.getElementById("addImageButton");
//   const imageContainer = document.getElementById("imageContainer");
//   const createVideoButton = document.getElementById("createVideoButton");
//   const processingNotification = document.getElementById("processingNotification");
//   let selectedFiles = [];
//   let durations = [];

//   addImageButton.addEventListener("click", function () {
//     const imagesInput = document.createElement("input");
//     imagesInput.type = "file";
//     imagesInput.accept = "image/*";
//     imagesInput.multiple = true;
//     imagesInput.style.display = "none";
//     imagesInput.click();

//     imagesInput.addEventListener("change", function (event) {
//       const files = event.target.files;

//       Array.from(files).forEach((file) => {
//         selectedFiles.push(file);
//         durations.push(3); // Default duration for each image

//         const container = document.createElement("div");
//         container.classList.add("image-container");

//         const img = document.createElement("img");
//         img.src = URL.createObjectURL(file);
//         img.classList.add("slideshow-image");

//         const title = document.createElement("p");
//         title.textContent = `Image ${selectedFiles.length}`;
//         title.classList.add("image-title");

//         const durationContainer = document.createElement("span");
//         durationContainer.classList.add("duration-container");

//         const durationLabel = document.createElement("label");
//         durationLabel.textContent = "Duration: ";

//         const durationInput = document.createElement("input");
//         durationInput.type = "number";
//         durationInput.min = "1";
//         durationInput.value = "3";
//         durationInput.classList.add("duration-input");

//         const durationSuffix = document.createElement("span");
//         durationSuffix.textContent = "s";

//         durationInput.addEventListener("change", function () {
//           const index = Array.prototype.indexOf.call(imageContainer.children, container) - 1;
//           durations[index] = durationInput.value; // Update corresponding duration
//           console.log("Updated duration at index:", index, "to", durationInput.value);
//         });

//         durationContainer.appendChild(durationLabel);
//         durationContainer.appendChild(durationInput);
//         durationContainer.appendChild(durationSuffix);

//         const closeButton = document.createElement("div");
//         closeButton.classList.add("close-button");
//         closeButton.addEventListener("click", function () {
//           // Get the index of the image to remove
//           const index = Array.prototype.indexOf.call(imageContainer.children, container) - 1;

//           if (index >= 0 && index < selectedFiles.length) {
//             // Remove the selected file and corresponding duration
//             selectedFiles.splice(index, 1);
//             durations.splice(index, 1);

//             // Remove the DOM element
//             container.remove();

//             // Update titles and any other relevant state
//             updateTitles();

//             console.log("Image removed at index:", index);
//             console.log("Updated selectedFiles:", selectedFiles);
//             console.log("Updated durations:", durations);
//           }
//         });

//         container.appendChild(closeButton);
//         container.appendChild(title);
//         container.appendChild(img);
//         container.appendChild(durationContainer);

//         imageContainer.insertBefore(container, addImageButton);
//       });

//       initializeSortable();
//     });
//   });

//   function updateTitles() {
//     const containers = document.querySelectorAll(".image-container:not(.add-image-container)");
//     containers.forEach((container, index) => {
//       const title = container.querySelector(".image-title");
//       title.textContent = `Image ${index + 1}`;
//     });
//   }

//   function initializeSortable() {
//     new Sortable(imageContainer, {
//       animation: 150,
//       ghostClass: "dragging",
//       onEnd: function () {
//         const containers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);
//         const newSelectedFiles = [];
//         const newDurations = [];

//         containers.forEach((container, newIndex) => {
//           const imageIndex = container.querySelector(".image-title").textContent.split(" ")[1] - 1;
//           if (selectedFiles[imageIndex]) {
//             newSelectedFiles.push(selectedFiles[imageIndex]);
//             newDurations.push(durations[imageIndex]);
//           }
//         });

//         // Update the selectedFiles and durations after reordering
//         selectedFiles = newSelectedFiles;
//         durations = newDurations;

//         console.log("Updated selectedFiles after reorder:", selectedFiles);
//         console.log("Updated durations after reorder:", durations);

//         updateTitles();
//       },
//     });
//   }
//   function initializeSortable() {
//     new Sortable(imageContainer, {
//       animation: 150,
//       ghostClass: "dragging",
//       onEnd: function () {
//         const containers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);
//         const newSelectedFiles = [];
//         const newDurations = [];

//         containers.forEach((container, newIndex) => {
//           const imageIndex = container.querySelector(".image-title").textContent.split(" ")[1] - 1;
//           if (selectedFiles[imageIndex]) {
//             newSelectedFiles.push(selectedFiles[imageIndex]);
//             newDurations.push(durations[imageIndex]);
//           }
//         });

//         // Update the selectedFiles and durations after reordering
//         selectedFiles = newSelectedFiles;
//         durations = newDurations;

//         console.log("Updated selectedFiles after reorder:", selectedFiles);
//         console.log("Updated durations after reorder:", durations);

//         updateTitles();
//       },
//     });
//   }

//   createVideoButton.addEventListener("click", function () {
//     const imageContainers = document.querySelectorAll(".image-container:not(.add-image-container)");
//     const formData = new FormData();

//     if (selectedFiles.length === 0) {
//       alert("No images selected.");
//       return;
//     }

//     processingNotification.style.display = "block";

//     imageContainers.forEach((container, index) => {
//       formData.append("images", selectedFiles[index]);
//       formData.append(`duration${index}`, durations[index]);
//     });

//     formData.append("durations", JSON.stringify(durations));

//     console.log("Sending files and durations:", selectedFiles, durations);

//     fetch("/create-video", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         const videoUrl = data.videoPath;
//         const videoElement = document.getElementById("processedVideo");
//         videoElement.src = videoUrl;
//         videoElement.style.display = "block";

//         processingNotification.style.display = "none";
//       })
//       .catch((error) => {
//         console.error("Error creating video:", error);
//         processingNotification.style.display = "none";
//       });
//   });
// });

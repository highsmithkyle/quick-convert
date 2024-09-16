document.addEventListener("DOMContentLoaded", function () {
  const addImageButton = document.getElementById("addImageButton");
  const imageContainer = document.getElementById("imageContainer");
  const createVideoButton = document.getElementById("createVideoButton");
  const processingNotification = document.getElementById("processingNotification");
  const videoContainerTitle = document.querySelector(".video-container h3"); // Reference to the video container title
  let videoInfoElement; // Element to hold video dimensions
  let selectedFiles = [];
  let durations = [];

  // Function to update the UI and arrays when adding images
  function addImages(files) {
    Array.from(files).forEach((file) => {
      selectedFiles.push(file);
      durations.push(3); // Default duration

      const container = document.createElement("div");
      container.classList.add("image-container");
      container.setAttribute("data-index", selectedFiles.length - 1); // Set the index to track the element

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.classList.add("slideshow-image");

      const title = document.createElement("p");
      title.classList.add("image-title");

      // Load image to get dimensions
      const imageElement = new Image();
      imageElement.onload = function () {
        title.textContent = `Image ${selectedFiles.length} (${imageElement.width}x${imageElement.height})`;
      };
      imageElement.src = URL.createObjectURL(file);

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
        const index = parseInt(container.getAttribute("data-index"), 10);
        if (index >= 0 && index < durations.length) {
          durations[index] = parseInt(durationInput.value, 10);
          console.log("Updated duration at index:", index, "to", durationInput.value);
          logState("After duration change");
        }
      });

      durationContainer.appendChild(durationLabel);
      durationContainer.appendChild(durationInput);
      durationContainer.appendChild(durationSuffix);

      const closeButton = document.createElement("div");
      closeButton.classList.add("close-button");
      closeButton.addEventListener("click", function () {
        const index = parseInt(container.getAttribute("data-index"), 10);

        if (index >= 0 && index < selectedFiles.length) {
          selectedFiles.splice(index, 1);
          durations.splice(index, 1);

          container.remove();
          updateTitles();
          logState("After image removal");
        }
      });

      container.appendChild(closeButton);
      container.appendChild(title);
      container.appendChild(img);
      container.appendChild(durationContainer);

      imageContainer.insertBefore(container, addImageButton);
    });

    logState("After adding images");
    initializeSortable();
  }

  // Function to update image titles
  function updateTitles() {
    const containers = document.querySelectorAll(".image-container:not(.add-image-container)");
    containers.forEach((container, index) => {
      const title = container.querySelector(".image-title");
      const img = container.querySelector("img");

      const imageElement = new Image();
      imageElement.onload = function () {
        title.textContent = `Image ${index + 1} (${imageElement.width}x${imageElement.height})`;
      };
      imageElement.src = img.src;

      container.setAttribute("data-index", index); // Update data-index attribute
    });
  }

  // Initialize sortable functionality
  function initializeSortable() {
    new Sortable(imageContainer, {
      animation: 150,
      ghostClass: "dragging",
      onEnd: function () {
        const newOrderContainers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);

        // Rebuild selectedFiles and durations arrays in the new order
        const newSelectedFiles = [];
        const newDurations = [];

        newOrderContainers.forEach((container) => {
          const index = parseInt(container.getAttribute("data-index"), 10);
          if (index >= 0) {
            const durationInput = container.querySelector(".duration-input");
            newSelectedFiles.push(selectedFiles[index]);
            newDurations.push(parseInt(durationInput.value, 10));
          }
        });

        selectedFiles = newSelectedFiles;
        durations = newDurations;

        logState("After reorder");
        updateTitles();
      },
    });
  }

  addImageButton.addEventListener("click", function () {
    const imagesInput = document.createElement("input");
    imagesInput.type = "file";
    imagesInput.accept = "image/*";
    imagesInput.multiple = true;
    imagesInput.style.display = "none";
    imagesInput.click();

    imagesInput.addEventListener("change", function (event) {
      const files = event.target.files;
      addImages(files);
    });
  });

  createVideoButton.addEventListener("click", function () {
    const imageContainers = document.querySelectorAll(".image-container:not(.add-image-container)");

    // Refresh durations before proceeding
    durations = Array.from(imageContainers).map((container) => {
      const durationInput = container.querySelector(".duration-input");
      return parseInt(durationInput.value, 10);
    });

    if (selectedFiles.length !== durations.length) {
      alert("Mismatch between number of images and durations.");
      console.error("Mismatch: selectedFiles length =", selectedFiles.length, "durations length =", durations.length);
      logState("Before creating video (Mismatch found)");
      return;
    }

    console.log("Final durations to be sent:", durations);

    const formData = new FormData();
    processingNotification.style.display = "block";

    selectedFiles.forEach((file, index) => {
      formData.append("images", file);
      formData.append(`duration${index}`, durations[index]);
    });

    formData.append("durations", JSON.stringify(durations));

    fetch("/create-video", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to create video");
        }
        return response.json();
      })
      .then((data) => {
        const videoUrl = data.videoPath;
        const videoElement = document.getElementById("processedVideo");
        videoElement.src = videoUrl;
        videoElement.style.display = "block";

        // Fetch video dimensions
        fetchVideoDimensions(videoUrl);

        // Clear processing notification
        processingNotification.style.display = "none";

        console.log("Video created successfully!");
      })
      .catch((error) => {
        console.error("Error creating video:", error);
        processingNotification.style.display = "none";
      });
  });

  // Function to fetch and display video dimensions
  function fetchVideoDimensions(videoUrl) {
    if (!videoInfoElement) {
      videoInfoElement = document.createElement("span");
      videoInfoElement.style.fontWeight = "normal"; // Ensure the text is not bold
      videoContainerTitle.parentNode.insertBefore(videoInfoElement, videoContainerTitle.nextSibling);
    }

    const videoElement = document.createElement("video");
    videoElement.src = videoUrl;

    videoElement.onloadedmetadata = function () {
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;

      // Update the video info element with dimensions
      videoInfoElement.textContent = ` (${width}x${height})`;
    };
  }

  // Function to log the state of selectedFiles and durations arrays
  function logState(message) {
    console.log(`\n${message}:`);
    console.log("Current selectedFiles:", selectedFiles);
    console.log("Current durations:", durations);
    console.log("Current number of image containers:", document.querySelectorAll(".image-container:not(.add-image-container)").length);
  }
});

// document.addEventListener("DOMContentLoaded", function () {
//   const addImageButton = document.getElementById("addImageButton");
//   const imageContainer = document.getElementById("imageContainer");
//   const createVideoButton = document.getElementById("createVideoButton");
//   const processingNotification = document.getElementById("processingNotification");
//   let selectedFiles = [];
//   let durations = [];

//   // Function to update the UI and arrays when adding images
//   function addImages(files) {
//     Array.from(files).forEach((file) => {
//       selectedFiles.push(file);
//       durations.push(3); // Default duration

//       const container = document.createElement("div");
//       container.classList.add("image-container");
//       container.setAttribute("data-index", selectedFiles.length - 1); // Set the index to track the element

//       const img = document.createElement("img");
//       img.src = URL.createObjectURL(file);
//       img.classList.add("slideshow-image");

//       const title = document.createElement("p");
//       title.textContent = `Image ${selectedFiles.length}`;
//       title.classList.add("image-title");

//       const durationContainer = document.createElement("span");
//       durationContainer.classList.add("duration-container");

//       const durationLabel = document.createElement("label");
//       durationLabel.textContent = "Duration: ";

//       const durationInput = document.createElement("input");
//       durationInput.type = "number";
//       durationInput.min = "1";
//       durationInput.value = "3";
//       durationInput.classList.add("duration-input");

//       const durationSuffix = document.createElement("span");
//       durationSuffix.textContent = "s";

//       durationInput.addEventListener("change", function () {
//         const index = parseInt(container.getAttribute("data-index"), 10);
//         if (index >= 0 && index < durations.length) {
//           durations[index] = parseInt(durationInput.value, 10);
//           console.log("Updated duration at index:", index, "to", durationInput.value);
//           logState("After duration change");
//         }
//       });

//       durationContainer.appendChild(durationLabel);
//       durationContainer.appendChild(durationInput);
//       durationContainer.appendChild(durationSuffix);

//       const closeButton = document.createElement("div");
//       closeButton.classList.add("close-button");
//       closeButton.addEventListener("click", function () {
//         const index = parseInt(container.getAttribute("data-index"), 10);

//         if (index >= 0 && index < selectedFiles.length) {
//           selectedFiles.splice(index, 1);
//           durations.splice(index, 1);

//           container.remove();
//           updateTitles();
//           logState("After image removal");
//         }
//       });

//       container.appendChild(closeButton);
//       container.appendChild(title);
//       container.appendChild(img);
//       container.appendChild(durationContainer);

//       imageContainer.insertBefore(container, addImageButton);
//     });

//     logState("After adding images");
//     initializeSortable();
//   }

//   // Function to update image titles
//   function updateTitles() {
//     const containers = document.querySelectorAll(".image-container:not(.add-image-container)");
//     containers.forEach((container, index) => {
//       const title = container.querySelector(".image-title");
//       title.textContent = `Image ${index + 1}`;
//       container.setAttribute("data-index", index); // Update data-index attribute
//     });
//   }

//   // Initialize sortable functionality
//   function initializeSortable() {
//     new Sortable(imageContainer, {
//       animation: 150,
//       ghostClass: "dragging",
//       onEnd: function () {
//         const newOrderContainers = Array.from(imageContainer.children).filter((el) => el !== addImageButton);

//         // Rebuild selectedFiles and durations arrays in the new order
//         const newSelectedFiles = [];
//         const newDurations = [];

//         newOrderContainers.forEach((container) => {
//           const index = parseInt(container.getAttribute("data-index"), 10);
//           if (index >= 0) {
//             const durationInput = container.querySelector(".duration-input");
//             newSelectedFiles.push(selectedFiles[index]);
//             newDurations.push(parseInt(durationInput.value, 10));
//           }
//         });

//         selectedFiles = newSelectedFiles;
//         durations = newDurations;

//         logState("After reorder");
//         updateTitles();
//       },
//     });
//   }

//   addImageButton.addEventListener("click", function () {
//     const imagesInput = document.createElement("input");
//     imagesInput.type = "file";
//     imagesInput.accept = "image/*";
//     imagesInput.multiple = true;
//     imagesInput.style.display = "none";
//     imagesInput.click();

//     imagesInput.addEventListener("change", function (event) {
//       const files = event.target.files;
//       addImages(files);
//     });
//   });

//   createVideoButton.addEventListener("click", function () {
//     const imageContainers = document.querySelectorAll(".image-container:not(.add-image-container)");

//     // Refresh durations before proceeding
//     durations = Array.from(imageContainers).map((container) => {
//       const durationInput = container.querySelector(".duration-input");
//       return parseInt(durationInput.value, 10);
//     });

//     if (selectedFiles.length !== durations.length) {
//       alert("Mismatch between number of images and durations.");
//       console.error("Mismatch: selectedFiles length =", selectedFiles.length, "durations length =", durations.length);
//       logState("Before creating video (Mismatch found)");
//       return;
//     }

//     console.log("Final durations to be sent:", durations);

//     const formData = new FormData();
//     processingNotification.style.display = "block";

//     selectedFiles.forEach((file, index) => {
//       formData.append("images", file);
//       formData.append(`duration${index}`, durations[index]);
//     });

//     formData.append("durations", JSON.stringify(durations));

//     fetch("/create-video", {
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Failed to create video");
//         }
//         return response.json();
//       })
//       .then((data) => {
//         const videoUrl = data.videoPath;
//         const videoElement = document.getElementById("processedVideo");
//         videoElement.src = videoUrl;
//         videoElement.style.display = "block";

//         // Clear processing notification
//         processingNotification.style.display = "none";

//         console.log("Video created successfully!");
//       })
//       .catch((error) => {
//         console.error("Error creating video:", error);
//         processingNotification.style.display = "none";
//       });
//   });

//   // Function to log the state of selectedFiles and durations arrays
//   function logState(message) {
//     console.log(`\n${message}:`);
//     console.log("Current selectedFiles:", selectedFiles);
//     console.log("Current durations:", durations);
//     console.log("Current number of image containers:", document.querySelectorAll(".image-container:not(.add-image-container)").length);
//   }
// });

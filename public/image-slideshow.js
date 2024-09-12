document.addEventListener("DOMContentLoaded", function () {
  const addImageButton = document.getElementById("addImageButton");
  const imageContainer = document.getElementById("imageContainer");
  const createVideoButton = document.getElementById("createVideoButton");
  const processingNotification = document.getElementById("processingNotification");
  let selectedFiles = [];

  addImageButton.addEventListener("click", function () {
    const imagesInput = document.createElement("input");
    imagesInput.type = "file";
    imagesInput.accept = "image/*";
    imagesInput.multiple = true;
    imagesInput.style.display = "none";
    imagesInput.click();

    imagesInput.addEventListener("change", function (event) {
      const files = event.target.files;

      Array.from(files).forEach((file, index) => {
        selectedFiles.push(file);

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
        durationInput.name = `duration${selectedFiles.length - 1}`;
        durationInput.min = "1";
        durationInput.value = "3";
        durationInput.classList.add("duration-input");

        const durationSuffix = document.createElement("span");
        durationSuffix.textContent = "s";

        durationContainer.appendChild(durationLabel);
        durationContainer.appendChild(durationInput);
        durationContainer.appendChild(durationSuffix);

        const closeButton = document.createElement("div");
        closeButton.classList.add("close-button");
        closeButton.addEventListener("click", function () {
          const index = Array.prototype.indexOf.call(imageContainer.children, container) - 1;
          selectedFiles.splice(index, 1);
          container.remove();
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

  function initializeSortable() {
    new Sortable(imageContainer, {
      animation: 150,
      ghostClass: "dragging",
      onEnd: function (event) {
        const containers = document.querySelectorAll(".image-container");
        const newSelectedFiles = [];

        containers.forEach((container, index) => {
          const title = container.querySelector(".image-title");
          if (title) {
            title.textContent = `Image ${index + 1}`;
          }

          const imageIndex = Array.prototype.indexOf.call(imageContainer.children, container) - 1;
          newSelectedFiles.push(selectedFiles[imageIndex]);
        });

        selectedFiles = newSelectedFiles;
      },
    });
  }

  createVideoButton.addEventListener("click", function () {
    const imageContainers = document.querySelectorAll(".image-container");
    const durations = [];
    const formData = new FormData();

    processingNotification.style.display = "block";

    imageContainers.forEach((container, index) => {
      const duration = container.querySelector(".duration-input").value;
      durations.push(duration);
      formData.append("images", selectedFiles[index]);
    });

    formData.append("durations", JSON.stringify(durations));

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

//   addImageButton.addEventListener("click", function () {
//     const imagesInput = document.createElement("input");
//     imagesInput.type = "file";
//     imagesInput.accept = "image/*";
//     imagesInput.multiple = true;
//     imagesInput.style.display = "none";
//     imagesInput.click();

//     imagesInput.addEventListener("change", function (event) {
//       const files = event.target.files;

//       Array.from(files).forEach((file, index) => {
//         selectedFiles.push(file);

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
//         durationInput.name = `duration${selectedFiles.length - 1}`;
//         durationInput.min = "1";
//         durationInput.value = "3";
//         durationInput.classList.add("duration-input");

//         const durationSuffix = document.createElement("span");
//         durationSuffix.textContent = "s";

//         durationContainer.appendChild(durationLabel);
//         durationContainer.appendChild(durationInput);
//         durationContainer.appendChild(durationSuffix);

//         const closeButton = document.createElement("div");
//         closeButton.classList.add("close-button");
//         closeButton.addEventListener("click", function () {
//           const index = Array.prototype.indexOf.call(imageContainer.children, container) - 1;
//           selectedFiles.splice(index, 1);
//           container.remove();
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

//   function initializeSortable() {
//     new Sortable(imageContainer, {
//       animation: 150,
//       ghostClass: "dragging",
//       onEnd: function (event) {
//         const containers = document.querySelectorAll(".image-container");
//         const newSelectedFiles = [];

//         containers.forEach((container, index) => {
//           const title = container.querySelector(".image-title");
//           if (title) {
//             title.textContent = `Image ${index + 1}`;
//           }

//           const imageIndex = Array.prototype.indexOf.call(imageContainer.children, container) - 1;
//           newSelectedFiles.push(selectedFiles[imageIndex]);
//         });

//         selectedFiles = newSelectedFiles;
//       },
//     });
//   }

//   createVideoButton.addEventListener("click", function () {
//     const imageContainers = document.querySelectorAll(".image-container");
//     const durations = [];
//     const formData = new FormData();

//     processingNotification.style.display = "block";

//     imageContainers.forEach((container, index) => {
//       const duration = container.querySelector(".duration-input").value;
//       durations.push(duration);
//       formData.append("images", selectedFiles[index]);
//     });

//     formData.append("durations", JSON.stringify(durations));

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

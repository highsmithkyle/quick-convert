document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("slicerForm");
  const uploadedVideo1 = document.getElementById("uploadedVideo1");
  const uploadedVideo2 = document.getElementById("uploadedVideo2");
  const uploadedVideo3 = document.getElementById("uploadedVideo3");
  const processedVideo = document.getElementById("processedVideo");
  const videoInput1 = document.getElementById("video1");
  const videoInput2 = document.getElementById("video2");
  const videoInput3 = document.getElementById("video3");
  const notification = document.getElementById("processingNotification");
  const numVideos = document.getElementById("numVideos");
  const videoSection2 = document.getElementById("videoSection2");
  const videoSection3 = document.getElementById("videoSection3");
  const uploadedVideoSection2 = document.getElementById("uploadedVideoSection2");
  const uploadedVideoSection3 = document.getElementById("uploadedVideoSection3");
  const addTransition = document.getElementById("addTransition"); // New line to get the checkbox element

  numVideos.addEventListener("change", function (event) {
    const value = event.target.value;
    videoSection2.style.display = value >= 2 ? "block" : "none";
    videoSection3.style.display = value == 3 ? "block" : "none";
    uploadedVideoSection2.style.display = value >= 2 ? "block" : "none";
    uploadedVideoSection3.style.display = value == 3 ? "block" : "none";
  });

  videoInput1.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo1.src = URL.createObjectURL(file);
      uploadedVideo1.parentElement.style.display = "block";
    }
  });

  videoInput2.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo2.src = URL.createObjectURL(file);
      uploadedVideo2.parentElement.style.display = "block";
    }
  });

  videoInput3.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      uploadedVideo3.src = URL.createObjectURL(file);
      uploadedVideo3.parentElement.style.display = "block";
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    notification.style.display = "block";
    const formData = new FormData(this);

    // Add the checkbox value to the FormData
    formData.append("addTransition", addTransition.checked);

    fetch("/slice-multi", { method: "POST", body: formData })
      .then((response) => response.blob())
      .then((blob) => {
        notification.style.display = "none";
        processedVideo.src = URL.createObjectURL(blob);
        processedVideo.parentElement.style.display = "block";
      })
      .catch(() => {
        notification.style.display = "none";
        console.error("Failed to process videos.");
      });
  });
});

// document.addEventListener("DOMContentLoaded", function () {
//   const form = document.getElementById("slicerForm");
//   const uploadedVideo1 = document.getElementById("uploadedVideo1");
//   const uploadedVideo2 = document.getElementById("uploadedVideo2");
//   const uploadedVideo3 = document.getElementById("uploadedVideo3");
//   const processedVideo = document.getElementById("processedVideo");
//   const videoInput1 = document.getElementById("video1");
//   const videoInput2 = document.getElementById("video2");
//   const videoInput3 = document.getElementById("video3");
//   const notification = document.getElementById("processingNotification");
//   const numVideos = document.getElementById("numVideos");
//   const videoSection2 = document.getElementById("videoSection2");
//   const videoSection3 = document.getElementById("videoSection3");
//   const uploadedVideoSection2 = document.getElementById("uploadedVideoSection2");
//   const uploadedVideoSection3 = document.getElementById("uploadedVideoSection3");

//   numVideos.addEventListener("change", function (event) {
//     const value = event.target.value;
//     videoSection2.style.display = value >= 2 ? "block" : "none";
//     videoSection3.style.display = value == 3 ? "block" : "none";
//     uploadedVideoSection2.style.display = value >= 2 ? "block" : "none";
//     uploadedVideoSection3.style.display = value == 3 ? "block" : "none";
//   });

//   videoInput1.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       uploadedVideo1.src = URL.createObjectURL(file);
//       uploadedVideo1.parentElement.style.display = "block";
//     }
//   });

//   videoInput2.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       uploadedVideo2.src = URL.createObjectURL(file);
//       uploadedVideo2.parentElement.style.display = "block";
//     }
//   });

//   videoInput3.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       uploadedVideo3.src = URL.createObjectURL(file);
//       uploadedVideo3.parentElement.style.display = "block";
//     }
//   });

//   form.addEventListener("submit", function (event) {
//     event.preventDefault();
//     notification.style.display = "block";
//     const formData = new FormData(this);

//     fetch("/slice-multi", { method: "POST", body: formData })
//       .then((response) => response.blob())
//       .then((blob) => {
//         notification.style.display = "none";
//         processedVideo.src = URL.createObjectURL(blob);
//         processedVideo.parentElement.style.display = "block";
//       })
//       .catch(() => {
//         notification.style.display = "none";
//         console.error("Failed to process videos.");
//       });
//   });
// });

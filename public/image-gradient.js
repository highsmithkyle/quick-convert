document.addEventListener("DOMContentLoaded", function () {
  const gradientTypeInput = document.getElementById("gradientType");
  const colorLabel1 = document.getElementById("colorLabel1");
  const colorLabel2 = document.getElementById("colorLabel2");
  const topColorInput = document.getElementById("topColor");
  const topColorValueDisplay = document.getElementById("topColorValue");
  const bottomColorInput = document.getElementById("bottomColor");
  const bottomColorValueDisplay = document.getElementById("bottomColorValue");
  const sizeInput = document.getElementById("size");
  const createGradientButton = document.getElementById("createGradientButton");
  const notification = document.getElementById("processingNotification");
  const gradientPreview = document.getElementById("gradientPreview");
  const helpText = document.getElementById("helpText");
  const tooltip = document.getElementById("tooltip");
  const showSampleEmailCheckbox = document.getElementById("showSampleEmail");
  const sampleEmail = document.getElementById("sampleEmail");
  const switchColorsButton = document.getElementById("switchColorsButton");

  gradientTypeInput.addEventListener("change", updatePreview);
  topColorInput.addEventListener("input", updatePreview);
  bottomColorInput.addEventListener("input", updatePreview);
  sizeInput.addEventListener("change", updatePreview);

  topColorInput.addEventListener("input", function () {
    topColorValueDisplay.textContent = topColorInput.value.toUpperCase();
  });

  bottomColorInput.addEventListener("input", function () {
    bottomColorValueDisplay.textContent = bottomColorInput.value.toUpperCase();
  });

  helpText.addEventListener("mouseover", function () {
    tooltip.style.display = "block";
  });

  helpText.addEventListener("mouseout", function () {
    tooltip.style.display = "none";
  });

  showSampleEmailCheckbox.addEventListener("change", function () {
    if (showSampleEmailCheckbox.checked) {
      sampleEmail.style.display = "block";
    } else {
      sampleEmail.style.display = "none";
    }
  });

  switchColorsButton.addEventListener("click", function () {
    const topColor = topColorInput.value;
    const bottomColor = bottomColorInput.value;

    topColorInput.value = bottomColor;
    bottomColorInput.value = topColor;

    topColorValueDisplay.textContent = bottomColor.toUpperCase();
    bottomColorValueDisplay.textContent = topColor.toUpperCase();

    updatePreview();
  });

  createGradientButton.addEventListener("click", function () {
    notification.style.display = "block";

    const gradientType = gradientTypeInput.value;
    const topColor = topColorInput.value.slice(1); // Remove the #
    const bottomColor = bottomColorInput.value.slice(1); // Remove the #
    const size = sizeInput.value;

    fetch("/createGradientImage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gradientType,
        topColor,
        bottomColor,
        size,
      }),
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        notification.style.display = "none";
        window.location.href = url;
      })
      .catch((error) => {
        notification.style.display = "none";
        console.error("Failed to create gradient image:", error);
      });
  });

  function updatePreview() {
    const gradientType = gradientTypeInput.value;
    const topColor = topColorInput.value;
    const bottomColor = bottomColorInput.value;
    const size = sizeInput.value;

    let dimensions;
    switch (size) {
      case "small":
        dimensions = { width: 600, height: 1000 };
        break;
      case "medium":
        dimensions = { width: 600, height: 1500 };
        break;
      case "large":
        dimensions = { width: 600, height: 2000 };
        break;
      default:
        dimensions = { width: 600, height: 1000 };
    }

    gradientPreview.style.width = `${dimensions.width}px`;
    gradientPreview.style.height = `${dimensions.height}px`;

    let gradient;
    if (gradientType === "radial") {
      gradient = `radial-gradient(circle, ${topColor}, ${bottomColor})`;
      colorLabel1.textContent = "Inside Color:";
      colorLabel2.textContent = "Outside Color:";
    } else {
      gradient = `linear-gradient(${topColor}, ${bottomColor})`;
      colorLabel1.textContent = "Top Color:";
      colorLabel2.textContent = "Bottom Color:";
    }

    gradientPreview.style.background = gradient;
  }

  // Initial preview update
  updatePreview();
});

// document.addEventListener("DOMContentLoaded", function () {
//   const gradientTypeInput = document.getElementById("gradientType");
//   const colorLabel1 = document.getElementById("colorLabel1");
//   const colorLabel2 = document.getElementById("colorLabel2");
//   const topColorInput = document.getElementById("topColor");
//   const topColorValueDisplay = document.getElementById("topColorValue");
//   const bottomColorInput = document.getElementById("bottomColor");
//   const bottomColorValueDisplay = document.getElementById("bottomColorValue");
//   const sizeInput = document.getElementById("size");
//   const createGradientButton = document.getElementById("createGradientButton");
//   const notification = document.getElementById("processingNotification");
//   const gradientPreview = document.getElementById("gradientPreview");
//   const helpText = document.getElementById("helpText");
//   const tooltip = document.getElementById("tooltip");
//   const showSampleEmailCheckbox = document.getElementById("showSampleEmail");
//   const sampleEmail = document.getElementById("sampleEmail");

//   gradientTypeInput.addEventListener("change", updatePreview);
//   topColorInput.addEventListener("input", updatePreview);
//   bottomColorInput.addEventListener("input", updatePreview);
//   sizeInput.addEventListener("change", updatePreview);

//   topColorInput.addEventListener("input", function () {
//     topColorValueDisplay.textContent = topColorInput.value.toUpperCase();
//   });

//   bottomColorInput.addEventListener("input", function () {
//     bottomColorValueDisplay.textContent = bottomColorInput.value.toUpperCase();
//   });

//   helpText.addEventListener("mouseover", function () {
//     tooltip.style.display = "block";
//   });

//   helpText.addEventListener("mouseout", function () {
//     tooltip.style.display = "none";
//   });

//   showSampleEmailCheckbox.addEventListener("change", function () {
//     if (showSampleEmailCheckbox.checked) {
//       sampleEmail.style.display = "block";
//     } else {
//       sampleEmail.style.display = "none";
//     }
//   });

//   createGradientButton.addEventListener("click", function () {
//     notification.style.display = "block";

//     const gradientType = gradientTypeInput.value;
//     const topColor = topColorInput.value.slice(1); // Remove the #
//     const bottomColor = bottomColorInput.value.slice(1); // Remove the #
//     const size = sizeInput.value;

//     fetch("/createGradientImage", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         gradientType,
//         topColor,
//         bottomColor,
//         size,
//       }),
//     })
//       .then((response) => response.blob())
//       .then((blob) => {
//         const url = URL.createObjectURL(blob);
//         notification.style.display = "none";
//         window.location.href = url;
//       })
//       .catch((error) => {
//         notification.style.display = "none";
//         console.error("Failed to create gradient image:", error);
//       });
//   });

//   function updatePreview() {
//     const gradientType = gradientTypeInput.value;
//     const topColor = topColorInput.value;
//     const bottomColor = bottomColorInput.value;
//     const size = sizeInput.value;

//     let dimensions;
//     switch (size) {
//       case "small":
//         dimensions = { width: 600, height: 1000 };
//         break;
//       case "medium":
//         dimensions = { width: 600, height: 1500 };
//         break;
//       case "large":
//         dimensions = { width: 600, height: 2000 };
//         break;
//       default:
//         dimensions = { width: 600, height: 1000 };
//     }

//     gradientPreview.style.width = `${dimensions.width}px`;
//     gradientPreview.style.height = `${dimensions.height}px`;

//     let gradient;
//     if (gradientType === "radial") {
//       gradient = `radial-gradient(circle, ${topColor}, ${bottomColor})`;
//       colorLabel1.textContent = "Inside Color:";
//       colorLabel2.textContent = "Outside Color:";
//     } else {
//       gradient = `linear-gradient(${topColor}, ${bottomColor})`;
//       colorLabel1.textContent = "Top Color:";
//       colorLabel2.textContent = "Bottom Color:";
//     }

//     gradientPreview.style.background = gradient;
//   }

//   // Initial preview update
//   updatePreview();
// });

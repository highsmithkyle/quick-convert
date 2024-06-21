document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    const uploadedImage = document.getElementById('uploadedImage');
    const recoloredImage = document.getElementById('recoloredImage');
    const targetColorInput = document.getElementById('targetColor');
    const colorValueDisplay = document.getElementById('colorValue');
    const notification = document.getElementById('processingNotification');
    const recolorButton = document.getElementById('recolorButton');

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedImage.src = URL.createObjectURL(file);
            uploadedImage.style.display = 'block';
        }
    });

    targetColorInput.addEventListener('input', function() {
        colorValueDisplay.textContent = targetColorInput.value.toUpperCase();
    });

    recolorButton.addEventListener('click', function() {
        if (!uploadedImage.src) {
            console.log('No image available to recolor.');
            return;
        }
        notification.style.display = 'block';

        fetch(uploadedImage.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('image', blob);
                formData.append('targetColor', targetColorInput.value.replace('#', ''));
                return fetch('/recolorImage', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                recoloredImage.src = URL.createObjectURL(blob);
                recoloredImage.style.display = 'block';
            })
            .catch(error => {
                notification.style.display = 'none';
                console.error('Failed to recolor image:', error);
            });
    });
});



// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('imageInput');
//     const uploadedImage = document.getElementById('uploadedImage');
//     const recoloredImage = document.getElementById('recoloredImage');
//     const targetColorInput = document.getElementById('targetColor');
//     const colorValueDisplay = document.getElementById('colorValue');
//     const notification = document.getElementById('processingNotification');
//     const recolorButton = document.getElementById('recolorButton');
//     const dominantColorDiv = document.getElementById('dominantColor');

//     imageInput.addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (file) {
//             uploadedImage.src = URL.createObjectURL(file);
//             uploadedImage.onload = function() {
//                 const colorThief = new ColorThief();
//                 const colors = colorThief.getPalette(uploadedImage, 6);
//                 dominantColorDiv.innerHTML = ''; 
//                 colors.forEach(color => {
//                     const colorDiv = document.createElement('div');
//                     const hexColor = rgbToHex(color[0], color[1], color[2]);
//                     colorDiv.style.backgroundColor = hexColor;
//                     colorDiv.style.width = '50px';
//                     colorDiv.style.height = '50px';
//                     colorDiv.style.cursor = 'pointer';
//                     colorDiv.onclick = () => {
//                         targetColorInput.value = hexColor;
//                         colorValueDisplay.textContent = hexColor.toUpperCase();
//                     };
//                     dominantColorDiv.appendChild(colorDiv);
//                 });
//             };
//         }
//     });

//     targetColorInput.addEventListener('input', function() {
//         colorValueDisplay.textContent = targetColorInput.value.toUpperCase();
//     });

//     recolorButton.addEventListener('click', function() {
//         if (!uploadedImage.src) {
//             console.log('No image available to recolor.');
//             return;
//         }
//         notification.style.display = 'block';

//         fetch(uploadedImage.src)
//             .then(response => response.blob())
//             .then(blob => {
//                 const formData = new FormData();
//                 formData.append('image', blob);
//                 formData.append('targetColor', targetColorInput.value.replace('#', ''));
//                 return fetch('/recolorImage', { method: 'POST', body: formData });
//             })
//             .then(response => response.blob())
//             .then(blob => {
//                 notification.style.display = 'none';
//                 recoloredImage.src = URL.createObjectURL(blob);
//                 recoloredImage.style.display = 'block';
//             })
//             .catch(error => {
//                 notification.style.display = 'none';
//                 console.error('Failed to recolor image:', error);
//             });
//     });

  
//     function rgbToHex(r, g, b) {
//         return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
//     }
// });


// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('imageInput');
//     const uploadedImage = document.getElementById('uploadedImage');
//     const recoloredImage = document.getElementById('recoloredImage');
//     const sourceColor = document.getElementById('sourceColor');
//     const targetColor = document.getElementById('targetColor');
//     const notification = document.getElementById('processingNotification');
//     const recolorButton = document.getElementById('recolorButton');

//     imageInput.addEventListener('change', function(event) {
//         const file = event.target.files[0];
//         if (file) {
//             uploadedImage.src = URL.createObjectURL(file);
//         }
//     });

//     recolorButton.addEventListener('click', function() {
//         if (!uploadedImage.src) {
//             console.log('No image available to recolor.');
//             return;
//         }
//         notification.style.display = 'block';

//         fetch(uploadedImage.src)
//             .then(response => response.blob())
//             .then(blob => {
//                 const formData = new FormData();
//                 formData.append('image', blob);
//                 formData.append('sourceColor', sourceColor.value.replace('#', ''));
//                 formData.append('targetColor', targetColor.value.replace('#', ''));
//                 return fetch('/recolorImage', { method: 'POST', body: formData });
//             })
//             .then(response => response.blob())
//             .then(blob => {
//                 notification.style.display = 'none';
//                 recoloredImage.src = URL.createObjectURL(blob);
//                 recoloredImage.style.display = 'block';
//             })
//             .catch(error => {
//                 notification.style.display = 'none';
//                 console.error('Failed to recolor image:', error);
//             });
//     });
// });

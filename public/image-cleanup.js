document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const cleanupButton = document.getElementById('cleanupButton');
    const modeSelect = document.getElementById('mode');
    const brushSizeSlider = document.getElementById('brushSize');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    let img = new Image();
    let currentBlob = null;
    let brushSize = brushSizeSlider.value;

    brushSizeSlider.oninput = function() {
        brushSize = this.value;
    };

    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            currentBlob = this.files[0];
            loadAndDrawImage(this.files[0]);
        }
    });

    function loadAndDrawImage(blob) {
        const reader = new FileReader();
        reader.onload = function(event) {
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(blob);
    }

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('mousedown', function(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousemove', function(e) {
        if (isDrawing) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = brushSize;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            lastX = x;
            lastY = y;
        }
    });

    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    cleanupButton.addEventListener('click', function() {
        const mode = modeSelect.value;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(canvas, 0, 0);
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i + 3] = data[i] === 255 ? 255 : 0; // Set the mask transparency based on white
        }
        maskCtx.putImageData(imageData, 0, 0);

        maskCanvas.toBlob(function(maskBlob) {
            const formData = new FormData();
            formData.append('image_file', currentBlob);
            formData.append('mask_file', maskBlob, 'mask.png');
            formData.append('mode', mode);

            document.getElementById('processingNotification').style.display = 'block';

            fetch('/cleanup-image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.blob())
            .then(blob => {
                currentBlob = blob;
                loadAndDrawImage(blob);
                document.getElementById('processingNotification').style.display = 'none';
            })
            .catch(e => {
                console.error('Error:', e);
                alert('Failed to process the image. ' + e.message);
                document.getElementById('processingNotification').style.display = 'none';
            });
        }, 'image/png');
    });
});


// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const cleanupButton = document.getElementById('cleanupButton');
//     const modeSelect = document.getElementById('mode');
//     const brushSizeSlider = document.getElementById('brushSize');
//     const canvas = document.getElementById('imageCanvas');
//     const ctx = canvas.getContext('2d');
//     let img = new Image();
//     let currentBlob = null;
//     let brushSize = brushSizeSlider.value;

//     brushSizeSlider.oninput = function() {
//         brushSize = this.value;
//     };

//     imageInput.addEventListener('change', function() {
//         if (this.files && this.files[0]) {
//             currentBlob = this.files[0];
//             loadAndDrawImage(this.files[0]);
//         }
//     });

//     function loadAndDrawImage(blob) {
//         const reader = new FileReader();
//         reader.onload = function(event) {
//             img.onload = function() {
//                 canvas.width = img.width;
//                 canvas.height = img.height;
//                 ctx.drawImage(img, 0, 0);
//             };
//             img.src = event.target.result;
//         };
//         reader.readAsDataURL(blob);
//     }

//     let isDrawing = false;
//     let lastX = 0;
//     let lastY = 0;

//     canvas.addEventListener('mousedown', function(e) {
//         isDrawing = true;
//         const rect = canvas.getBoundingClientRect();
//         lastX = e.clientX - rect.left;
//         lastY = e.clientY - rect.top;
//     });

//     canvas.addEventListener('mousemove', function(e) {
//         if (isDrawing) {
//             const rect = canvas.getBoundingClientRect();
//             const x = e.clientX - rect.left;
//             const y = e.clientY - rect.top;
//             ctx.strokeStyle = 'white';
//             ctx.lineWidth = brushSize;
//             ctx.lineJoin = 'round';
//             ctx.lineCap = 'round';
//             ctx.beginPath();
//             ctx.moveTo(lastX, lastY);
//             ctx.lineTo(x, y);
//             ctx.stroke();
//             lastX = x;
//             lastY = y;
//         }
//     });

//     canvas.addEventListener('mouseup', () => isDrawing = false);
//     canvas.addEventListener('mouseout', () => isDrawing = false);

//     cleanupButton.addEventListener('click', function() {
//         const mode = modeSelect.value;
//         const maskCanvas = document.createElement('canvas');
//         maskCanvas.width = canvas.width;
//         maskCanvas.height = canvas.height;
//         const maskCtx = maskCanvas.getContext('2d');
//         maskCtx.drawImage(canvas, 0, 0);
//         const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
//         const data = imageData.data;
//         for (let i = 0; i < data.length; i += 4) {
//             data[i + 3] = data[i] === 255 ? 255 : 0; // Set the mask transparency based on white
//         }
//         maskCtx.putImageData(imageData, 0, 0);

//         maskCanvas.toBlob(function(maskBlob) {
//             const formData = new FormData();
//             formData.append('image_file', currentBlob);
//             formData.append('mask_file', maskBlob, 'mask.png');
//             formData.append('mode', mode);

//             document.getElementById('processingNotification').style.display = 'block';

//             fetch('/cleanup-image', {
//                 method: 'POST',
//                 body: formData
//             })
//             .then(response => response.blob())
//             .then(blob => {
//                 currentBlob = blob;
//                 loadAndDrawImage(blob);
//                 document.getElementById('processingNotification').style.display = 'none';
//             })
//             .catch(e => {
//                 console.error('Error:', e);
//                 alert('Failed to process the image. ' + e.message);
//                 document.getElementById('processingNotification').style.display = 'none';
//             });
//         }, 'image/png');
//     });
// });


// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const cleanupButton = document.getElementById('cleanupButton');
//     const modeSelect = document.getElementById('mode');
//     const canvas = document.getElementById('imageCanvas');
//     const ctx = canvas.getContext('2d');
//     let img = new Image();
//     let currentBlob = null;  // Store the current image as a blob

//     imageInput.addEventListener('change', function() {
//         if (this.files && this.files[0]) {
//             const file = this.files[0];
//             currentBlob = file;  // Update the currentBlob to the newly uploaded file
//             loadAndDrawImage(file);
//             document.getElementById('processedImage').style.display = 'none';
//         }
//     });

//     function loadAndDrawImage(blob) {
//         const reader = new FileReader();
//         reader.onload = function(event) {
//             img.onload = function() {
//                 canvas.width = img.width;
//                 canvas.height = img.height;
//                 ctx.drawImage(img, 0, 0);
//             };
//             img.src = event.target.result;
//         };
//         reader.readAsDataURL(blob);
//     }

//     canvas.addEventListener('mousedown', startDrawing);
//     canvas.addEventListener('mousemove', draw);
//     canvas.addEventListener('mouseup', () => isDrawing = false);
//     canvas.addEventListener('mouseout', () => isDrawing = false);

//     cleanupButton.addEventListener('click', function() {
//         const mode = modeSelect.value;
//         const maskCanvas = document.createElement('canvas');
//         maskCanvas.width = canvas.width;
//         maskCanvas.height = canvas.height;
//         const maskCtx = maskCanvas.getContext('2d');
//         maskCtx.drawImage(canvas, 0, 0);
//         const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
//         const data = imageData.data;
//         for (let i = 0; i < data.length; i += 4) {
//             data[i + 3] = data[i] === 255 ? 255 : 0;  // Set the mask transparency based on white
//         }
//         maskCtx.putImageData(imageData, 0, 0);

//         maskCanvas.toBlob(function(maskBlob) {
//             const formData = new FormData();
//             formData.append('image_file', currentBlob);  // Use the current blob
//             formData.append('mask_file', maskBlob, 'mask.png');
//             formData.append('mode', mode);

//             document.getElementById('processingNotification').style.display = 'block';

//             fetch('/cleanup-image', {
//                 method: 'POST',
//                 body: formData
//             })
//             .then(response => response.blob())
//             .then(blob => {
//                 currentBlob = blob;  // Update currentBlob to the newly cleaned image
//                 const url = window.URL.createObjectURL(blob);
//                 loadAndDrawImage(blob);  // Load and draw the new image
//                 document.getElementById('processedImage').src = url;
//                 document.getElementById('processedImage').style.display = 'block';
//                 document.getElementById('processingNotification').style.display = 'none';
//             })
//             .catch(e => {
//                 console.error('Error:', e);
//                 alert('Failed to process the image. ' + e.message);
//                 document.getElementById('processingNotification').style.display = 'none';
//             });
//         }, 'image/png');
//     });

//     let isDrawing = false;
//     let lastX = 0;
//     let lastY = 0;

//     function startDrawing(e) {
//         isDrawing = true;
//         const rect = canvas.getBoundingClientRect();
//         lastX = e.clientX - rect.left;
//         lastY = e.clientY - rect.top;
//     }

//     function draw(e) {
//         if (!isDrawing) return;
//         const rect = canvas.getBoundingClientRect();
//         const x = e.clientX - rect.left;
//         const y = e.clientY - rect.top;
//         ctx.strokeStyle = 'white';
//         ctx.lineWidth = 10;
//         ctx.lineJoin = 'round';
//         ctx.lineCap = 'round';
//         ctx.beginPath();
//         ctx.moveTo(lastX, lastY);
//         ctx.lineTo(x, y);
//         ctx.stroke();
//         lastX = x;
//         lastY = y;
//     }
// });



// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const cleanupButton = document.getElementById('cleanupButton');
//     const modeSelect = document.getElementById('mode');
//     const canvas = document.getElementById('imageCanvas');
//     const ctx = canvas.getContext('2d');
//     let img = new Image();

//     imageInput.addEventListener('change', function() {
//         if (this.files && this.files[0]) {
//             const file = this.files[0];
//             const reader = new FileReader();
//             reader.onload = function(event) {
//                 img.onload = function() {
//                     canvas.width = img.width;
//                     canvas.height = img.height;
//                     ctx.drawImage(img, 0, 0);
//                 }
//                 img.src = event.target.result;
//             }
//             reader.readAsDataURL(file);
//             document.getElementById('processedImage').style.display = 'none'; // Hide processed image on new load
//         }
//     });

//     let isDrawing = false;
//     let lastX = 0;
//     let lastY = 0;

//     canvas.addEventListener('mousedown', function(e) {
//         isDrawing = true;
//         const rect = canvas.getBoundingClientRect();
//         lastX = e.clientX - rect.left;
//         lastY = e.clientY - rect.top;
//     });

//     canvas.addEventListener('mousemove', function(e) {
//         if (isDrawing) {
//             const rect = canvas.getBoundingClientRect();
//             const x = e.clientX - rect.left;
//             const y = e.clientY - rect.top;
//             ctx.strokeStyle = 'white';
//             ctx.lineWidth = 10;
//             ctx.lineJoin = 'round';
//             ctx.lineCap = 'round';
//             ctx.beginPath();
//             ctx.moveTo(lastX, lastY);
//             ctx.lineTo(x, y);
//             ctx.stroke();
//             lastX = x;
//             lastY = y;
//         }
//     });

//     canvas.addEventListener('mouseup', () => isDrawing = false);
//     canvas.addEventListener('mouseout', () => isDrawing = false);

//     cleanupButton.addEventListener('click', function() {
//         const mode = modeSelect.value;
//         const maskCanvas = document.createElement('canvas');
//         maskCanvas.width = canvas.width;
//         maskCanvas.height = canvas.height;
//         const maskCtx = maskCanvas.getContext('2d');
//         maskCtx.drawImage(canvas, 0, 0);

//         const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
//         const data = imageData.data;
//         for (let i = 0; i < data.length; i += 4) {
//             if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
//                 data[i + 3] = 255; // Ensure white parts are fully opaque
//             } else {
//                 data[i + 3] = 0; // Ensure black parts are fully transparent
//             }
//         }
//         maskCtx.putImageData(imageData, 0, 0);

//         maskCanvas.toBlob(function(maskBlob) {
//             const formData = new FormData();
//             formData.append('image_file', imageInput.files[0]);
//             formData.append('mask_file', maskBlob, 'mask.png');
//             formData.append('mode', mode); // Append mode to formData

//             document.getElementById('processingNotification').style.display = 'block';

//             fetch('/cleanup-image', {
//                 method: 'POST',
//                 body: formData
//             })
//             .then(response => {
//                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//                 return response.blob();
//             })
//             .then(blob => {
//                 const url = window.URL.createObjectURL(blob);
//                 img.src = url; // Update the image used for further editing
//                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Redraw the updated image
//                 document.getElementById('processedImage').src = url;
//                 document.getElementById('processedImage').style.display = 'block';
//                 document.getElementById('processingNotification').style.display = 'none';
//             })
//             .catch(e => {
//                 console.error('Error:', e);
//                 alert('Failed to process the image. ' + e.message);
//                 document.getElementById('processingNotification').style.display = 'none';
//             });
//         }, 'image/png');
//     });
// });

//ol but working


// document.addEventListener('DOMContentLoaded', function() {
//     const imageInput = document.getElementById('image');
//     const cleanupButton = document.getElementById('cleanupButton');
//     const canvas = document.getElementById('imageCanvas');
//     const ctx = canvas.getContext('2d');
//     let img = new Image();

//     imageInput.addEventListener('change', function() {
//         if (this.files && this.files[0]) {
//             const file = this.files[0];
//             const reader = new FileReader();
//             reader.onload = function(event) {
//                 img.onload = function() {
//                     canvas.width = img.width;
//                     canvas.height = img.height;
//                     ctx.drawImage(img, 0, 0);
//                 }
//                 img.src = event.target.result;
//             }
//             reader.readAsDataURL(file);
//             document.getElementById('processedImage').style.display = 'none'; // Hide processed image on new load
//         }
//     });

//     let isDrawing = false;
//     let lastX = 0;
//     let lastY = 0;

//     canvas.addEventListener('mousedown', function(e) {
//         isDrawing = true;
//         const rect = canvas.getBoundingClientRect();
//         lastX = e.clientX - rect.left;
//         lastY = e.clientY - rect.top;
//     });

//     canvas.addEventListener('mousemove', function(e) {
//         if (isDrawing) {
//             const rect = canvas.getBoundingClientRect();
//             const x = e.clientX - rect.left;
//             const y = e.clientY - rect.top;
//             ctx.strokeStyle = 'white';
//             ctx.lineWidth = 10;
//             ctx.lineJoin = 'round';
//             ctx.lineCap = 'round';
//             ctx.beginPath();
//             ctx.moveTo(lastX, lastY);
//             ctx.lineTo(x, y);
//             ctx.stroke();
//             lastX = x;
//             lastY = y;
//         }
//     });

//     canvas.addEventListener('mouseup', () => isDrawing = false);
//     canvas.addEventListener('mouseout', () => isDrawing = false);

//     cleanupButton.addEventListener('click', function() {
//         const maskCanvas = document.createElement('canvas');
//         maskCanvas.width = canvas.width;
//         maskCanvas.height = canvas.height;
//         const maskCtx = maskCanvas.getContext('2d');
//         maskCtx.drawImage(canvas, 0, 0);

//         const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
//         const data = imageData.data;

//         for (let i = 0; i < data.length; i += 4) {
//             if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
//                 data[i] = 255;
//                 data[i + 1] = 255;
//                 data[i + 2] = 255;
//                 data[i + 3] = 255;
//             } else {
//                 data[i] = 0;
//                 data[i + 1] = 0;
//                 data[i + 2] = 0;
//                 data[i + 3] = 255;
//             }
//         }

//         maskCtx.putImageData(imageData, 0, 0);

//         maskCanvas.toBlob(function(maskBlob) {
//             const formData = new FormData();
//             formData.append('image_file', imageInput.files[0]);
//             formData.append('mask_file', maskBlob, 'mask.png');

//             document.getElementById('processingNotification').style.display = 'block';

//             fetch('/cleanup-image', {
//                 method: 'POST',
//                 body: formData
//             })
//             .then(response => {
//                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//                 return response.blob();
//             })
//             .then(blob => {
//                 const url = window.URL.createObjectURL(blob);
//                 document.getElementById('processedImage').src = url;
//                 document.getElementById('processedImage').style.display = 'block';
//                 document.getElementById('processingNotification').style.display = 'none';
//             })
//             .catch(e => {
//                 console.error('Error:', e);
//                 alert('Failed to process the image. ' + e.message);
//                 document.getElementById('processingNotification').style.display = 'none';
//             });
//         }, 'image/png');
//     });
// });


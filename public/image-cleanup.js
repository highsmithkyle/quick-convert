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
            data[i + 3] = data[i] === 255 ? 255 : 0;
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

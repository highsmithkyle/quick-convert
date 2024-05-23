document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('slicerForm');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const processedVideo = document.getElementById('processedVideo');
    const videoInput = document.querySelector('input[type="file"]');
    const notification = document.getElementById('processingNotification');
    const createOverlayButton = document.getElementById('createOverlayButton'); 
    const createGradientOverlayButton = document.getElementById('createGradientOverlayButton');


    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadedVideo.src = URL.createObjectURL(file);
            uploadedVideo.parentElement.style.display = 'block';
        }
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        notification.style.display = 'block';
        const formData = new FormData(this);

        fetch('/slice', { method: 'POST', body: formData })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                processedVideo.src = URL.createObjectURL(blob);
                processedVideo.parentElement.style.display = 'block';
            })
            .catch(() => {
                notification.style.display = 'none';
                console.error('Failed to process video.');
            });
    });





    document.getElementById('cropVideoButton').addEventListener('click', function() {
        const uploadedVideoElement = document.getElementById('uploadedVideo');
        const cropRatioSelect = document.getElementById('cropRatio');
    
        if (!uploadedVideoElement.src) {
            console.log('No video available to crop.');
            return;
        }
    
        notification.style.display = 'block';
    
        fetch(uploadedVideoElement.src)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('video', blob, 'uploaded.mp4');
                formData.append('cropRatio', cropRatioSelect.value);
    
                return fetch('/crop', { method: 'POST', body: formData });
            })
            .then(response => response.blob())
            .then(blob => {
                notification.style.display = 'none';
                const croppedVideo = document.getElementById('croppedVideo');
                croppedVideo.src = URL.createObjectURL(blob);
                croppedVideo.style.display = 'block';
            })
            .catch(() => {
                notification.style.display = 'none';
                console.log('Failed to crop video.');
            });
    });
    

   


    document.addEventListener('DOMContentLoaded', function() {
        
        var colorPicker = document.getElementById('overlayColor');
        var colorValueDisplay = document.getElementById('colorValue');
        
        colorPicker.addEventListener('input', function() {
            colorValueDisplay.textContent = colorPicker.value;
        });
        var opacitySlider = document.getElementById('overlayOpacity');
        var opacityValueDisplay = document.getElementById('opacityValue');
        
        opacitySlider.addEventListener('input', function() {
            opacityValueDisplay.textContent = opacitySlider.value;
        });
    
        var gradientColorPicker = document.getElementById('gradientColor');
        var gradientColorValueDisplay = document.getElementById('gradientColorValue');
        
        gradientColorPicker.addEventListener('input', function() {
            gradientColorValueDisplay.textContent = gradientColorPicker.value.toUpperCase();
        });
    });

    
});



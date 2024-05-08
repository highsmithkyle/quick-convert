document.addEventListener('DOMContentLoaded', function() {
    const videoInput = document.getElementById('videoInput');
    const videoPlayer = document.getElementById('videoPlayer');
    const overlay = document.getElementById('overlay');
    const videoContainer = document.getElementById('videoContainer');
    const sizeSelector = document.getElementById('sizeSelector');
    let originalVideoUrl = '';

    function updateOverlay() {
        overlay.style.display = 'block';
        setOverlaySize('default');
    }


    function setOverlaySize(ratio) {
        const { width, height } = videoContainer.getBoundingClientRect();
    
        switch(ratio) {
            case '2:1':
                overlay.style.width = `${width}px`;
                overlay.style.height = `${width / 2}px`;
                break;
            case '2:1-small':
                let smallWidth = width * 0.8;
                overlay.style.width = `${smallWidth}px`;
                overlay.style.height = `${smallWidth / 2}px`;
                break;
            case 'third':
                overlay.style.width = `${width}px`;
                overlay.style.height = `${height / 3}px`;
                break;
            case '9:16':
                let overlayHeight = height;
                let overlayWidth = overlayHeight * (9 / 16);
                if (overlayWidth > width) {
                    overlayWidth = width;
                    overlayHeight = overlayWidth * (16 / 9);
                }
                overlay.style.width = `${overlayWidth}px`;
                overlay.style.height = `${overlayHeight}px`;
                break;
            default:
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                break;
        }
        centerOverlay();
    }
    




    function centerOverlay() {
        const parentRect = videoContainer.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        overlay.style.top = `${(parentRect.height - overlayRect.height) / 2}px`;
        overlay.style.left = `${(parentRect.width - overlayRect.width) / 2}px`;
    }

    sizeSelector.addEventListener('change', function() {
        setOverlaySize(this.value);
    });

    videoPlayer.addEventListener('loadedmetadata', updateOverlay);

    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        originalVideoUrl = URL.createObjectURL(file);
        videoPlayer.src = originalVideoUrl;
        videoPlayer.style.display = 'block';
    });

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.addEventListener('mousedown', function(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = function() {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = function(e) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                let newTop = element.offsetTop - pos2;
                let newLeft = element.offsetLeft - pos1;

                // Constrain crop area within video container
                newTop = Math.max(0, Math.min(newTop, videoContainer.offsetHeight - element.offsetHeight));
                newLeft = Math.max(0, Math.min(newLeft, videoContainer.offsetWidth - element.offsetWidth));

                element.style.top = newTop + "px";
                element.style.left = newLeft + "px";
            };
        });
    }

    makeDraggable(overlay);

    
    document.getElementById('uploadForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const videoRect = videoPlayer.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();

        // Calculate the scale factors
        const scaleX = videoPlayer.videoWidth / videoRect.width;
        const scaleY = videoPlayer.videoHeight / videoRect.height;

        // Calculate the crop dimensions based on the actual size of the video
        const cropWidth = overlayRect.width * scaleX;
        const cropHeight = overlayRect.height * scaleY;
        const cropLeft = (overlayRect.left - videoRect.left) * scaleX;
        const cropTop = (overlayRect.top - videoRect.top) * scaleY;

        // Set values
        let formData = new FormData();
        formData.append('video', videoInput.files[0]);
        formData.append('width', Math.round(cropWidth));
        formData.append('height', Math.round(cropHeight));
        formData.append('left', Math.round(cropLeft));
        formData.append('top', Math.round(cropTop));

        
        fetch('http://www.quick-convert.com/upload', {
    method: 'POST',
    body: formData
})

        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.blob();
        })
        // .then(blob => {
        //     const url = window.URL.createObjectURL(blob);
        //     const croppedVideoPlayer = document.getElementById('croppedVideoPlayer');
        //     croppedVideoPlayer.src = url;
        //     croppedVideoPlayer.play();
            
        // })
        // .catch(error => {
        //     console.error('problem with fetch operation:', error);
        //     alert('Error cropping video: ' + error.message);
        // });
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const croppedVideoPlayer = document.getElementById('croppedVideoPlayer');
            croppedVideoPlayer.src = url;
            croppedVideoPlayer.play();
        
            // const downloadBtn = document.getElementById('downloadBtn');
            // downloadBtn.href = url;
            // downloadBtn.download = 'cropped_video.mp4';
        })
        .catch(error => {
            console.error('Problem with fetch operation:', error);
            alert('Error cropping video: ' + error.message);
        });
    });
});

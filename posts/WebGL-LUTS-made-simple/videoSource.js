const videoPlayer = document.getElementById('videoPlayer');

function changeVideo(input) {
	var file = input.files[0];
	var url = URL.createObjectURL(file);
	var videoPlayer = document.getElementById('videoPlayer');

	if (videoPlayer.srcObject) {
		const stream = videoPlayer.srcObject;
		const tracks = stream.getTracks();

		tracks.forEach(function (track) {
			track.stop();
		});

		videoPlayer.srcObject = null;
	}

	videoPlayer.src = url;
	videoPlayer.play();
}

function startWebcam() {
	videoPlayer.setAttribute("autoplay", true);
	if (navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({ audio: false, video: true })
			.then(function (stream) {
				videoPlayer.srcObject = stream;
				videoPlayer.onloadedmetadata = function (e) {
					videoPlayer.play()
				}
			})
			.catch(function (error) {
				alert(error);
			});
	} else {
		alert('Webcam not available');
	}
}
function changeVideoURL(url, player) {
	var videoPlayer = document.getElementById(player);

	if (videoPlayer.srcObject) {
		const stream = videoPlayer.srcObject;
		const tracks = stream.getTracks();

		tracks.forEach(function (track) {
			track.stop();
		});

		videoPlayer.srcObject = null;
	}

	videoPlayer.src = url;
	videoPlayer.loop = true;
	videoPlayer.muted = true;
	videoPlayer.playsinline = true;
	videoPlayer.play();
}

function changeVideo(input, player) {
	var file = input.files[0];
	var url = URL.createObjectURL(file);
	changeVideoURL(url, player);
}

function startWebcam(player) {
	const videoPlayer = document.getElementById(player);
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
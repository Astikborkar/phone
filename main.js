let mediaStream = null;
let audioContext = null;
let analyser = null;
let animationFrame = null;
let mediaRecorder = null;
let recordedChunks = [];

const videoElement = document.getElementById('videoElement');
const audioVisualizer = document.getElementById('audioVisualizer');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const canvas = audioVisualizer.getContext('2d');

// Add new buttons for recording controls
const recordButton = document.createElement('button');
recordButton.textContent = 'Start Recording';
recordButton.disabled = true;
const stopRecordButton = document.createElement('button');
stopRecordButton.textContent = 'Stop Recording';
stopRecordButton.disabled = true;
const downloadButton = document.createElement('button');
downloadButton.textContent = 'Download Recording';
downloadButton.disabled = true;

// Add new buttons to controls
document.querySelector('.controls').append(recordButton, stopRecordButton, downloadButton);

async function startMedia() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        videoElement.srcObject = mediaStream;
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        analyser.fftSize = 256;
        
        visualize();

        startButton.disabled = true;
        stopButton.disabled = false;
        recordButton.disabled = false;
    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Failed to access camera and microphone. Please ensure you have granted permission.');
    }
}

function stopMedia() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }

    canvas.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);

    startButton.disabled = false;
    stopButton.disabled = true;
    recordButton.disabled = true;
    stopRecordButton.disabled = true;
}

function startRecording() {
    recordedChunks = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    
    try {
        mediaRecorder = new MediaRecorder(mediaStream, options);
    } catch (err) {
        console.error('Error creating MediaRecorder:', err);
        return;
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        downloadButton.disabled = false;
    };

    mediaRecorder.start();
    recordButton.disabled = true;
    stopRecordButton.disabled = false;
}

function stopRecording() {
    mediaRecorder.stop();
    recordButton.disabled = false;
    stopRecordButton.disabled = true;
}

function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = 'recording.webm';
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    downloadButton.disabled = true;
}

function visualize() {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const width = audioVisualizer.width;
    const height = audioVisualizer.height;

    function draw() {
        animationFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvas.fillStyle = '#f0f0f0';
        canvas.fillRect(0, 0, width, height);

        const barWidth = width / bufferLength * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            canvas.fillStyle = `rgb(0, 123, 255)`;
            canvas.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    draw();
}

function resizeCanvas() {
    audioVisualizer.width = audioVisualizer.offsetWidth;
    audioVisualizer.height = audioVisualizer.offsetHeight;
}

// Event listeners
startButton.addEventListener('click', startMedia);
stopButton.addEventListener('click', stopMedia);
recordButton.addEventListener('click', startRecording);
stopRecordButton.addEventListener('click', stopRecording);
downloadButton.addEventListener('click', downloadRecording);
window.addEventListener('resize', resizeCanvas);

// Initial canvas setup
resizeCanvas();
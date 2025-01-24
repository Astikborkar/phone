let mediaStream = null;
let audioContext = null;
let analyser = null;
let animationFrame = null;

const videoElement = document.getElementById('videoElement');
const audioVisualizer = document.getElementById('audioVisualizer');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const canvas = audioVisualizer.getContext('2d');

async function startMedia() {
    try {
        // Request both camera and microphone access
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Set up video
        videoElement.srcObject = mediaStream;

        // Set up audio visualization
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        analyser.fftSize = 256;
        
        // Start visualization
        visualize();

        // Update button states
        startButton.disabled = true;
        stopButton.disabled = false;
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

    // Clear visualizer
    canvas.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);

    // Reset button states
    startButton.disabled = false;
    stopButton.disabled = true;
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

// Set up canvas size
function resizeCanvas() {
    audioVisualizer.width = audioVisualizer.offsetWidth;
    audioVisualizer.height = audioVisualizer.offsetHeight;
}

// Event listeners
startButton.addEventListener('click', startMedia);
stopButton.addEventListener('click', stopMedia);
window.addEventListener('resize', resizeCanvas);

// Initial canvas setup
resizeCanvas();
import { supabase } from './src/supabase';

let mediaStream = null;
let audioContext = null;
let analyser = null;
let animationFrame = null;
let mediaRecorder = null;
let recordedChunks = [];
let currentUser = null;

const videoElement = document.getElementById('videoElement');
const audioVisualizer = document.getElementById('audioVisualizer');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const canvas = audioVisualizer.getContext('2d');

// Add authentication buttons
const authContainer = document.createElement('div');
authContainer.className = 'auth-container';
const loginButton = document.createElement('button');
loginButton.textContent = 'Login';
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Logout';
logoutButton.style.display = 'none';
authContainer.append(loginButton, logoutButton);
document.querySelector('.container').prepend(authContainer);

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

// Check initial auth state
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user;
  if (currentUser) {
    loginButton.style.display = 'none';
    logoutButton.style.display = 'inline-block';
    startButton.disabled = false;
  } else {
    loginButton.style.display = 'inline-block';
    logoutButton.style.display = 'none';
    startButton.disabled = true;
    stopMedia();
  }
});

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

    startButton.disabled = !currentUser;
    stopButton.disabled = true;
    recordButton.disabled = true;
    stopRecordButton.disabled = true;
}

async function startRecording() {
    if (!currentUser) {
        alert('Please login to record');
        return;
    }

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

async function stopRecording() {
    mediaRecorder.stop();
    recordButton.disabled = false;
    stopRecordButton.disabled = true;
}

async function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    try {
        // Upload to Supabase Storage
        const fileName = `recording-${Date.now()}.webm`;
        const { data, error } = await supabase.storage
            .from('recordings')
            .upload(`${currentUser.id}/${fileName}`, blob);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('recordings')
            .getPublicUrl(`${currentUser.id}/${fileName}`);

        // Save recording metadata to database
        const { error: dbError } = await supabase
            .from('recordings')
            .insert({
                user_id: currentUser.id,
                title: fileName,
                recording_url: publicUrl,
                duration: Math.round(blob.size / 16000) // Rough estimate of duration in seconds
            });

        if (dbError) throw dbError;

        // Download locally
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Error saving recording:', err);
        alert('Failed to save recording. Please try again.');
    }

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

// Auth functions
async function handleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
    });
    
    if (error) {
        console.error('Error logging in:', error);
        alert('Failed to login. Please try again.');
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
        alert('Failed to logout. Please try again.');
    }
}

// Event listeners
startButton.addEventListener('click', startMedia);
stopButton.addEventListener('click', stopMedia);
recordButton.addEventListener('click', startRecording);
stopRecordButton.addEventListener('click', stopRecording);
downloadButton.addEventListener('click', downloadRecording);
loginButton.addEventListener('click', handleLogin);
logoutButton.addEventListener('click', handleLogout);
window.addEventListener('resize', resizeCanvas);

// Initial canvas setup
resizeCanvas();
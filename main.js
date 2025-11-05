document.addEventListener('DOMContentLoaded', () => {
    // Screen elements
    const uploadScreen = document.getElementById('upload-screen');
    const playerScreen = document.getElementById('player-screen');
    const backBtn = document.getElementById('back-btn');

    // Player elements
    const videoUpload = document.getElementById('video-upload');
    const videoWrapper = document.getElementById('video-wrapper');
    const video = document.getElementById('video');
    const tapOverlay = document.getElementById('tap-overlay');

    // Control elements
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const topFullscreenBtn = document.getElementById('top-fullscreen-btn');
    const topFullscreenIcon = document.getElementById('top-fullscreen-icon');

    const timeDisplay = document.getElementById('time-display');
    const playbackSpeed = document.getElementById('playback-speed');
    const fpsInput = document.getElementById('fps-input');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fullscreenIcon = document.getElementById('fullscreen-icon');
    const progressBar = document.getElementById('progress-bar');
    const messageBox = document.getElementById('message-box');

    let secondsPerFrame = 1 / 30;
    let isSeeking = false;
    let isScrubbing = false;
    let currentVideoURL = null;

    // --- Swipe/Tap detection variables ---
    let touchstartX = 0;
    let touchstartY = 0;
    let isSwiping = false;
    const swipeThreshold = 100;
    const swipeRestraint = 50;
    const swipeMoveThreshold = 10;

    // --- Show Error Message ---
    function showMessage(message, isError = true) {
        console.log(isError ? 'Error:' : 'Message:', message);
        messageBox.textContent = message;
        messageBox.className = isError
            ? 'p-3 rounded-md bg-red-600 text-white text-center m-3 block'
            : 'p-3 rounded-md bg-green-600 text-white text-center m-3 block';
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 4000);
    }

    // --- UI Navigation ---
    videoUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            if (currentVideoURL) {
                URL.revokeObjectURL(currentVideoURL);
            }
            currentVideoURL = URL.createObjectURL(file);
            video.src = currentVideoURL;
            video.load();
            progressBar.value = 0;
            progressBar.disabled = true;
            isSeeking = false;
            isScrubbing = false;
            uploadScreen.classList.add('hidden');
            playerScreen.classList.remove('hidden');
        }
    });

    backBtn.addEventListener('click', () => {
        video.pause();
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
        if (currentVideoURL) {
            URL.revokeObjectURL(currentVideoURL);
            currentVideoURL = null;
        }
        video.src = '';
        video.load();
        videoUpload.value = null;
        timeDisplay.textContent = '00:00.000 / 00:00.000';
        playPauseIcon.classList.remove('ph-pause');
        playPauseIcon.classList.add('ph-play');
        progressBar.value = 0;
        progressBar.disabled = true;
        isSeeking = false;
        isScrubbing = false;
        playerScreen.classList.add('hidden');
        uploadScreen.classList.remove('hidden');
    });

    // --- Video Loaded Metadata ---
    video.addEventListener('loadedmetadata', () => {
        updateTimeDisplay();
        updateSecondsPerFrame();
        progressBar.disabled = false;
        progressBar.value = 0;
        updateProgressBar();
    });

    // --- Play/Pause Toggle ---
    playPauseBtn.addEventListener('click', togglePlayPause);
    tapOverlay.addEventListener('click', togglePlayPause);

    function togglePlayPause() {
        if (video.paused) {
            if (video.readyState < 2) {
                showMessage('Video is still loading. Please wait.');
                return;
            }
            video.play().catch((err) => {
                console.error('Error attempting to play:', err);
                showMessage('Unable to play the video automatically. Tap to play.');
            });
        } else {
            video.pause();
        }
    }

    video.addEventListener('play', () => {
        playPauseIcon.classList.remove('ph-play');
        playPauseIcon.classList.add('ph-pause');
    });

    video.addEventListener('pause', () => {
        playPauseIcon.classList.remove('ph-pause');
        playPauseIcon.classList.add('ph-play');
    });

    // --- Playback Speed Control ---
    playbackSpeed.addEventListener('change', () => {
        const speed = parseFloat(playbackSpeed.value);
        if (!isNaN(speed) && speed > 0) {
            video.playbackRate = speed;
        }
    });

    // --- FPS Input ---
    fpsInput.addEventListener('change', () => {
        const fpsValue = parseFloat(fpsInput.value);
        if (!isNaN(fpsValue) && fpsValue > 0) {
            secondsPerFrame = 1 / fpsValue;
        } else {
            showMessage('Invalid FPS value. Please enter a positive number.');
        }
    });

    function updateSecondsPerFrame() {
        const fpsValue = parseFloat(fpsInput.value);
        if (!isNaN(fpsValue) && fpsValue > 0) {
            secondsPerFrame = 1 / fpsValue;
        } else {
            secondsPerFrame = 1 / 30;
        }
    }

    // --- Progress Bar Handling ---
    progressBar.addEventListener('input', () => {
        if (!video.duration) return;
        const targetTime = (progressBar.value / parseFloat(progressBar.max)) * video.duration;
        video.currentTime = targetTime;
        updateTimeDisplay();
    });

    progressBar.addEventListener('mousedown', () => {
        isScrubbing = true;
    });

    progressBar.addEventListener('mouseup', () => {
        isScrubbing = false;
        updateProgressBar();
    });

    progressBar.addEventListener('touchstart', () => {
        isScrubbing = true;
    }, { passive: true });

    progressBar.addEventListener('touchend', () => {
        isScrubbing = false;
        updateProgressBar();
    });

    // --- Keyboard Controls ---
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
            return;
        }
        if (event.key === ' ') {
            event.preventDefault();
            togglePlayPause();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            stepFrame(1);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            stepFrame(-1);
        }
    });

    // --- Frame Stepping ---
    document.getElementById('frame-back').addEventListener('click', () => stepFrame(-1));
    document.getElementById('frame-forward').addEventListener('click', () => stepFrame(1));

    function stepFrame(direction) {
        if (!video.duration) return;
        const newTime = video.currentTime + direction * secondsPerFrame;
        video.currentTime = Math.max(0, Math.min(newTime, video.duration));
        updateTimeDisplay();
        updateProgressBar();
    }

    // --- Fullscreen Controls ---
    function toggleFullscreen(targetElement, iconElement) {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const requestFullscreen = targetElement.requestFullscreen || targetElement.webkitRequestFullscreen;
            if (requestFullscreen) {
                requestFullscreen.call(targetElement);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    function updateFullscreenIcon() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        const iconClass = isFullscreen ? 'ph-arrows-in' : 'ph-arrows-out';
        fullscreenIcon.className = `${iconClass} ph-lg`;
        topFullscreenIcon.className = `${iconClass} ph-lg`;
    }

    fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen(videoWrapper, fullscreenIcon);
    });

    topFullscreenBtn.addEventListener('click', () => {
        toggleFullscreen(playerScreen, topFullscreenIcon);
    });

    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);

    // --- Tap and Swipe Handling ---
    tapOverlay.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    tapOverlay.addEventListener('touchstart', (e) => {
        if (e.touches.length === 0) return;
        touchstartX = e.touches[0].clientX;
        touchstartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    tapOverlay.addEventListener('touchmove', (e) => {
        if (isSwiping || e.touches.length === 0) return;

        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        const dx = Math.abs(moveX - touchstartX);
        const dy = Math.abs(moveY - touchstartY);

        if (dx > swipeMoveThreshold || dy > swipeMoveThreshold) {
            isSwiping = true;
        }
    }, { passive: true });

    tapOverlay.addEventListener('touchend', (e) => {
        if (isSwiping && (document.fullscreenElement || document.webkitFullscreenElement)) {
            const touchendX = e.changedTouches[0].clientX;
            const touchendY = e.changedTouches[0].clientY;
            const dy = touchendY - touchstartY;
            const dx = touchendX - touchstartX;

            if (dy > swipeThreshold && Math.abs(dx) < swipeRestraint) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }
    });

    tapOverlay.addEventListener('dblclick', () => {
        togglePlayPause();
    });

    tapOverlay.addEventListener('touchend', (() => {
        let lastTap = 0;
        return (event) => {
            const currentTime = Date.now();
            const timeDifference = currentTime - lastTap;
            lastTap = currentTime;

            if (timeDifference < 300) {
                togglePlayPause();
            }
        };
    })());

    // --- Video Event Listeners ---
    video.addEventListener('timeupdate', () => {
        if (!isSeeking && !isScrubbing) {
            updateTimeDisplay();
            updateProgressBar();
        }
    });

    video.addEventListener('seeking', () => {
        isSeeking = true;
    });

    video.addEventListener('seeked', () => {
        isSeeking = false;
        updateTimeDisplay();
        updateProgressBar();
    });

    video.addEventListener('ended', () => {
        playPauseIcon.classList.remove('ph-pause');
        playPauseIcon.classList.add('ph-play');
    });

    // --- Utility Functions ---
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    function updateTimeDisplay() {
        const current = formatTime(video.currentTime || 0);
        const duration = formatTime(video.duration || 0);
        timeDisplay.textContent = `${current} / ${duration}`;
    }

    function updateProgressBar() {
        if (!video.duration || isScrubbing) return;
        const ratio = video.currentTime / video.duration;
        const clamped = Math.min(Math.max(ratio, 0), 1);
        progressBar.value = Math.round(clamped * progressBar.max);
    }
});

// --- CRITICAL CHANGE: PWA CACHE BUSTING SCRIPT ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((reg) => {
                console.log('Service worker registered.', reg);

                if (reg.waiting) {
                    console.log('New service worker waiting. Activating...');
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                reg.addEventListener('updatefound', () => {
                    console.log('New service worker update found.');
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New service worker installed. Forcing activation.');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch((err) => {
                console.error('Service worker registration failed:', err);
            });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker has changed. Reloading page...');
            window.location.reload();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const speedSlider = document.getElementById('speedSlider');
  const sliderValue = document.getElementById('sliderValue');
  const currentSpeedDisplay = document.getElementById('currentSpeed');
  const videoCountDisplay = document.getElementById('videoCount');
  const incrementSlider = document.getElementById('incrementSlider');
  const incrementValue = document.getElementById('incrementValue');

  // Initialize popup
  init();

  function init() {
    // Get current tab and video info
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getInfo'}, function(response) {
        if (chrome.runtime.lastError) {
          videoCountDisplay.textContent = 'No videos detected';
          return;
        }
        
        if (response) {
          const count = response.videoCount || 0;
          videoCountDisplay.textContent = count === 0 ? 'No videos detected' : 
            count === 1 ? '1 video found' : `${count} videos found`;
          
          // Show debug info if videos found
          if (response.videos && response.videos.length > 0) {
            console.log('Videos detected:', response.videos);
          }
          
          if (response.currentSpeed) {
            updateUI(response.currentSpeed);
          }
        }
      });
    });

    // Load saved preferences
    chrome.storage.local.get(['videoSpeed', 'keyboardIncrement'], function(result) {
      if (result.videoSpeed) {
        updateUI(result.videoSpeed);
      }
      if (result.keyboardIncrement) {
        incrementSlider.value = result.keyboardIncrement;
        incrementValue.textContent = result.keyboardIncrement + 'x';
      }
    });
  }

  // Speed button click handlers
  speedButtons.forEach(button => {
    button.addEventListener('click', function() {
      const speed = parseFloat(this.dataset.speed);
      setVideoSpeed(speed);
    });
  });

  // Slider input handler with real-time updates
  speedSlider.addEventListener('input', function() {
    const speed = parseFloat(this.value);
    sliderValue.textContent = speed.toFixed(2) + 'x';
    
    // Update UI and video speed immediately in real-time
    currentSpeedDisplay.textContent = speed.toFixed(2) + 'x';
    setVideoSpeed(speed);
  });

  // Increment slider handler
  incrementSlider.addEventListener('input', function() {
    const increment = parseFloat(this.value);
    incrementValue.textContent = increment.toFixed(2) + 'x';
    
    // Save increment preference and send to content script
    chrome.storage.local.set({ keyboardIncrement: increment });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setIncrement',
        increment: increment
      });
    });
  });

  function setVideoSpeed(speed) {
    // Update UI
    updateUI(speed);
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setSpeed',
        speed: speed
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error setting speed:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log(`Speed set to ${speed}x for ${response.videoCount} video(s)`);
        }
      });
    });
  }

  function updateUI(speed) {
    // Update current speed display
    currentSpeedDisplay.textContent = speed.toFixed(2) + 'x';
    
    // Update slider
    speedSlider.value = speed;
    sliderValue.textContent = speed.toFixed(2) + 'x';
    
    // Update active button (only highlight if speed exactly matches a preset)
    speedButtons.forEach(btn => {
      btn.classList.remove('active');
      if (Math.abs(parseFloat(btn.dataset.speed) - speed) < 0.01) {
        btn.classList.add('active');
      }
    });
  }

  // Refresh button functionality
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      init();
    }
  });
});
// Video Speed Controller Content Script

class VideoSpeedController {
  constructor() {
    this.videos = new Set();
    this.currentSpeed = 1;
    this.keyboardIncrement = 0.25;
    this.observer = null;
    this.init();
  }

  init() {
    this.findVideos();
    this.setupObserver();
    this.listenForMessages();
    this.createSpeedDisplay();
  }

  findVideos() {
    // Clear existing videos and find all current ones
    this.videos.clear();
    
    // Find all video elements including those in shadow DOM
    const allVideos = document.querySelectorAll('video');
    
    // Also check for videos in iframes (for sites like YouTube)
    const iframes = document.querySelectorAll('iframe');
    
    allVideos.forEach(video => {
      this.videos.add(video);
    });
    
    // Try to find videos in shadow roots
    this.findVideosInShadowDOM(document.body);
    
    console.log(`Found ${this.videos.size} video(s)`);
    return this.videos.size;
  }
  
  findVideosInShadowDOM(element) {
    if (element.shadowRoot) {
      const shadowVideos = element.shadowRoot.querySelectorAll('video');
      shadowVideos.forEach(video => this.videos.add(video));
      
      // Recursively check shadow DOM children
      element.shadowRoot.querySelectorAll('*').forEach(child => {
        this.findVideosInShadowDOM(child);
      });
    }
    
    // Check regular children for shadow DOM
    element.querySelectorAll('*').forEach(child => {
      if (child.shadowRoot) {
        this.findVideosInShadowDOM(child);
      }
    });
  }

  setupObserver() {
    // Watch for dynamically added videos
    this.observer = new MutationObserver((mutations) => {
      let foundNewVideos = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if the node itself is a video
            if (node.tagName === 'VIDEO') {
              this.videos.add(node);
              foundNewVideos = true;
              console.log('Added new video element directly');
            }
            
            // Check if the node contains videos
            if (node.querySelectorAll) {
              const videos = node.querySelectorAll('video');
              if (videos.length > 0) {
                videos.forEach(video => this.videos.add(video));
                foundNewVideos = true;
                console.log(`Added ${videos.length} new video(s) from container`);
              }
            }
          }
        });
      });
      
      // Periodically refresh video list for dynamic content
      if (foundNewVideos) {
        setTimeout(() => this.findVideos(), 500);
      }
    });

    // Observe the entire document
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false
    });
    
    // Also set up a periodic refresh for sites with complex video loading
    setInterval(() => {
      this.findVideos();
    }, 3000);
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'setSpeed') {
        this.setVideoSpeed(request.speed);
        sendResponse({ success: true, videoCount: this.videos.size });
      } else if (request.action === 'setIncrement') {
        this.keyboardIncrement = request.increment;
        chrome.storage.local.set({ keyboardIncrement: request.increment });
        sendResponse({ success: true });
      } else if (request.action === 'getInfo') {
        const videoCount = this.findVideos(); // Refresh video list
        sendResponse({ 
          videoCount: videoCount, 
          currentSpeed: this.currentSpeed,
          videos: Array.from(this.videos).map(v => ({ 
            tagName: v.tagName,
            src: v.src || v.currentSrc || 'unknown',
            paused: v.paused
          }))
        });
      }
    });
  }

  setVideoSpeed(speed) {
    this.currentSpeed = speed;
    let successCount = 0;
    
    // Refresh video list first
    this.findVideos();
    
    this.videos.forEach(video => {
      if (video && video.playbackRate !== undefined) {
        try {
          video.playbackRate = speed;
          successCount++;
          console.log(`Set video speed to ${speed}x`);
        } catch (error) {
          console.log('Could not set speed for video:', error);
        }
      }
    });
    
    console.log(`Applied speed ${speed}x to ${successCount} out of ${this.videos.size} videos`);
    this.updateSpeedDisplay();
    
    // Save speed preference
    chrome.storage.local.set({ videoSpeed: speed });
    
    return successCount;
  }

  createSpeedDisplay() {
    // Create floating speed indicator
    this.speedDisplay = document.createElement('div');
    this.speedDisplay.id = 'video-speed-display';
    this.speedDisplay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      display: none;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(this.speedDisplay);
  }

  updateSpeedDisplay() {
    if (this.speedDisplay) {
      this.speedDisplay.textContent = `Speed: ${this.currentSpeed}x (${this.videos.size} videos)`;
      this.speedDisplay.style.display = 'block';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (this.speedDisplay) {
          this.speedDisplay.style.display = 'none';
        }
      }, 3000);
    }
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        switch(e.key) {
          case 'ArrowUp':
            e.preventDefault();
            this.increaseSpeed();
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.decreaseSpeed();
            break;
          case 'R':
            e.preventDefault();
            this.setVideoSpeed(1);
            break;
        }
      }
    });
  }

  increaseSpeed() {
    const newSpeed = Math.min(this.currentSpeed + this.keyboardIncrement, 5);
    this.setVideoSpeed(newSpeed);
  }

  decreaseSpeed() {
    const newSpeed = Math.max(this.currentSpeed - this.keyboardIncrement, 0.25);
    this.setVideoSpeed(newSpeed);
  }
}

// Initialize the controller
let videoController = null;

// Function to initialize the controller
function initializeController() {
  if (!videoController) {
    videoController = new VideoSpeedController();
    videoController.setupKeyboardShortcuts();
    
    // Load saved keyboard increment
    chrome.storage.local.get(['keyboardIncrement'], function(result) {
      if (result.keyboardIncrement) {
        videoController.keyboardIncrement = result.keyboardIncrement;
      }
    });
    
    console.log('Video Speed Controller initialized');
  }
}

// Initialize based on page state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeController);
} else {
  // Page already loaded
  initializeController();
}

// Also try to initialize after a short delay for dynamic content
setTimeout(initializeController, 1000);
setTimeout(initializeController, 3000);
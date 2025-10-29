chrome.runtime.onInstalled.addListener(() => {
  console.log("Picture-in-Picture Extension Installed");
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-pip") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const video = document.querySelector("video");
        if (!video) {
          alert("No video found on this page.");
          return;
        }
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        } else {
          video.requestPictureInPicture();
        }
      }
    });
  }
});

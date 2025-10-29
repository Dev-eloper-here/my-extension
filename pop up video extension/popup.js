document.getElementById("pipButton").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: enablePiP
  });
});

async function enablePiP() {
  const video = document.querySelector("video");
  if (!video) {
    alert("No video found on this page.");
    return;
  }

  try {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      await video.requestPictureInPicture();
    }
  } catch (error) {
    alert("Error enabling PiP: " + error);
  }
}

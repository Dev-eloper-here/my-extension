(function() {
  const videos = document.querySelectorAll("video");
  videos.forEach(video => {
    if (video.dataset.pipAdded) return;
    video.dataset.pipAdded = true;

    const btn = document.createElement("button");
    btn.innerText = "📺 PiP";
    btn.style.position = "absolute";
    btn.style.bottom = "10px";
    btn.style.right = "10px";
    btn.style.padding = "5px 10px";
    btn.style.fontSize = "14px";
    btn.style.background = "#007bff";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.borderRadius = "5px";
    btn.style.cursor = "pointer";
    btn.style.zIndex = "9999";

    btn.onclick = async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.error("PiP Error:", err);
      }
    };

    video.parentElement.style.position = "relative";
    video.parentElement.appendChild(btn);
  });
})();

(function () {
  const videos = document.querySelectorAll(
    ".fleet video, .tile video, .palette video, .palette-peeks video",
  );
  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.defaultPlaybackRate = 0.82;
    video.playbackRate = 0.82;
    const play = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    if (video.readyState >= 2) play();
    else video.addEventListener("canplay", play, { once: true });
  });
})();

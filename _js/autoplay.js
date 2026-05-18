// _js/script.js
(() => {
  "use strict";

  // Garante que apenas o vídeo de capa (.plyr-capa) seja mudo/autoplay
  function enforceCoverVideoPolicy() {
    const cover = document.querySelector(".plyr-capa");
    if (!cover) return;

    document.querySelectorAll("video").forEach((video) => {
      const isCover = video === cover;

      if (!isCover) {
        video.autoplay = false;
        video.removeAttribute("autoplay");
        video.muted = false;
        video.removeAttribute("muted");
      }
    });
  }

  // Autoplay robusto para o vídeo de capa (.plyr-capa)
  function initCoverAutoplay() {
    const video = document.querySelector(".plyr-capa");
    if (!video) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const tryPlay = () => {
      if (prefersReduced.matches) return;
      const playPromise = video.play?.();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const handleReduceChange = () => {
      if (prefersReduced.matches) {
        try {
          video.pause();
        } catch {
          // ignore
        }
        return;
      }
      tryPlay();
    };

    prefersReduced.addEventListener?.("change", handleReduceChange);

    // Configurações obrigatórias para autoplay em navegadores modernos
    video.muted = true;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.autoplay = true;
    video.loop = true;
    try {
      video.preload = "auto";
      video.volume = 0;
    } catch {
      // ignore
    }

    // Tenta dar play quando o vídeo estiver pronto
    const onCanPlay = () => {
      tryPlay();
    };

    video.addEventListener("loadeddata", onCanPlay, { once: true });
    video.addEventListener("canplay", onCanPlay, { once: true });

    // Tenta tocar assim que o DOM estiver pronto
    if (document.readyState !== "loading") {
      tryPlay();
    } else {
      document.addEventListener("DOMContentLoaded", tryPlay, { once: true });
    }

    // Interação do usuário em mobile ajuda a liberar autoplay
    window.addEventListener("touchstart", tryPlay, {
      once: true,
      passive: true,
    });

    // Quando voltar para a aba, tenta tocar de novo
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        tryPlay();
      }
    });
  }

  // Boot mínimo
  document.addEventListener("DOMContentLoaded", () => {
    enforceCoverVideoPolicy();
    initCoverAutoplay();
  });
})();

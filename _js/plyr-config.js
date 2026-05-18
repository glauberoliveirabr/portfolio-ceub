// _js/plyr-config.js
(() => {
  "use strict";

  const OM = window.OrbitaMotion || null;

  if (typeof window.Plyr === "undefined") {
    console.warn("[plyr-config] Plyr não encontrado. Verifique /_js/plyr.js");
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldHidePlay = () => document.body.hasAttribute("data-hide-play");

  // ===== Acessibilidade =====================================================
  const setA11yVisibility = (el, show) => {
    if (!el) return;
    el.setAttribute("aria-hidden", String(!show));
    if (show) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  };

  // ===== Controle de players simultâneos ====================================
  const players = new Set();
  const registerPlayer = (plyrInstance) => {
    if (!plyrInstance) return;
    players.add(plyrInstance);
    plyrInstance.on("play", () => {
      players.forEach((p) => { if (p !== plyrInstance) p.pause(); });
    });
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) players.forEach((p) => p.pause());
  });

  const observePlayerViewport = (plyrInstance) => {
    if (!("IntersectionObserver" in window) || !plyrInstance) return;
    const container = plyrInstance.elements?.container || plyrInstance.media;
    if (!container) return;
    const ioPlyr = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting }) => {
          if (!isIntersecting && !plyrInstance.paused) plyrInstance.pause();
        });
      },
      { threshold: 0.1 }
    );
    ioPlyr.observe(container);
  };

  // ===== Seletores do HERO ===================================================
  const videoEl = document.querySelector(".video-principal .plyr");
  const capaEl  = document.querySelector(".video-principal-capa .plyr-capa");

  const overlayTextPrincipal  = document.querySelector("#destaque .overlay-text, .txt-destaque");
  const playButtonPrincipal   = document.getElementById("btn-play") || document.querySelector("#destaque .play-button");
  const scrollButtonPrincipal = document.getElementById("btn") || document.querySelector(".btn-scroll");
  const videoPrincipalCapaBox = document.querySelector("#destaque .video-principal-capa");

  // ===== Vídeo de capa (mudo, loop, sem storage) ============================
  let videoCapa = null;
  if (capaEl) {
    videoCapa = new Plyr(capaEl, {
      controls: [],
      autoplay: !prefersReducedMotion,
      muted: true,
      loop: { active: true },
      storage: { enabled: false }
    });

    try {
      const media = videoCapa.media || capaEl;
      media.muted = true;
      media.setAttribute("muted", "");
      media.autoplay = true;
      media.setAttribute("playsinline", "");
      media.setAttribute("webkit-playsinline", "");
    } catch {}
  }

  // ===== UI do hero =========================================================
  const ocultarOverlayPrincipal = () => {
    setA11yVisibility(overlayTextPrincipal, false);
    setA11yVisibility(playButtonPrincipal,  false);
    setA11yVisibility(scrollButtonPrincipal,false);
    if (videoPrincipalCapaBox) {
      videoPrincipalCapaBox.hidden = true;
      videoPrincipalCapaBox.style.display = "none";
    }
    if (OM?.heroHideGsap) OM.heroHideGsap();
  };

  const exibirOverlayPrincipal = () => {
    setA11yVisibility(overlayTextPrincipal, true);
    if (playButtonPrincipal) setA11yVisibility(playButtonPrincipal, !shouldHidePlay());
    setA11yVisibility(scrollButtonPrincipal, true);
    if (videoPrincipalCapaBox) {
      videoPrincipalCapaBox.hidden = false;
      videoPrincipalCapaBox.style.display = "";
    }
    if (OM?.heroShowGsap) OM.heroShowGsap();
  };

  // ===== Player principal (sem ícone de volume/mute) ========================
  let videoPrincipal = null;
  if (videoEl) {
    try {
      videoEl.autoplay = false;
      videoEl.removeAttribute("autoplay");
      videoEl.muted = false;
      videoEl.removeAttribute("muted");
    } catch {}

    videoPrincipal = new Plyr(videoEl, {
      controls: ["play", "progress"], // 👈 removido "mute" e "volume"
      muted: false,
      autoplay: false,
      captions: { active: true, language: "pt" },
      storage: { enabled: false },
      markers: {
        enabled: true,
        points: [
          { time: 20, label: "Site profissional" },
          { time: 70, label: "Curriculo" },
          { time: 150, label: "Portfólio" },
          { time: 370, label: "Principais trabalhos" },
          { time: 460, label: "Caixa" },
          { time: 598, label: "Like a Boss" },
          { time: 735, label: "SAP NY" },
          { time: 800, label: "CNI" },
          { time: 960, label: "Move" },
          { time: 1075, label: "Sebrae" },
          { time: 1115, label: "Marcas atendidas" }
        ]
      }
    });

    videoPrincipal.on("ready", () => {
      try {
        videoPrincipal.muted = false;
        const media = videoPrincipal.media || videoEl;
        media.muted = false;
        media.removeAttribute?.("muted");
        media.autoplay = false;
        media.removeAttribute?.("autoplay");
        media.volume = 0.8;
      } catch {}
    });

    registerPlayer(videoPrincipal);
    observePlayerViewport(videoPrincipal);

    playButtonPrincipal?.addEventListener("click", () => {
      try { videoPrincipal.play(); } catch (e) { console.warn("[plyr-config] Falha ao dar play:", e); }
      ocultarOverlayPrincipal();
    });

    videoPrincipal.on("play",  ocultarOverlayPrincipal);
    videoPrincipal.on("pause", exibirOverlayPrincipal);
    videoPrincipal.on("ended", exibirOverlayPrincipal);
  }

  // ===== Reação às flags de scroll ==========================================
  document.addEventListener("orbit:hide-play", () => {
    if (!playButtonPrincipal) return;
    setA11yVisibility(playButtonPrincipal, false);
  });

  document.addEventListener("orbit:show-play", () => {
    if (!playButtonPrincipal) return;
    const isPlaying = videoPrincipal && videoPrincipal.playing === true;
    if (!isPlaying) setA11yVisibility(playButtonPrincipal, true);
  });

  // ===== Fallback sem player principal ======================================
  if (!videoPrincipal) {
    if (overlayTextPrincipal) {
      overlayTextPrincipal.hidden = false;
      overlayTextPrincipal.style.display = "";
      overlayTextPrincipal.setAttribute("aria-hidden", "false");
      overlayTextPrincipal.removeAttribute("inert");
    }
    if (playButtonPrincipal) {
      playButtonPrincipal.hidden = false;
      playButtonPrincipal.style.display = "";
      playButtonPrincipal.setAttribute("aria-hidden", shouldHidePlay() ? "true" : "false");
      if (shouldHidePlay()) playButtonPrincipal.setAttribute("inert", "");
      else playButtonPrincipal.removeAttribute("inert");
    }
    if (scrollButtonPrincipal) {
      scrollButtonPrincipal.hidden = false;
      scrollButtonPrincipal.style.display = "";
      scrollButtonPrincipal.setAttribute("aria-hidden", "false");
      scrollButtonPrincipal.removeAttribute("inert");
    }
    if (videoPrincipalCapaBox) {
      videoPrincipalCapaBox.hidden = false;
      videoPrincipalCapaBox.style.display = "";
    }
    OM?.heroShowGsap && OM.heroShowGsap();
  }
})();

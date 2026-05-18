// _js/scrollfade.js
(() => {
  "use strict";

  const OM = window.OrbitaMotion || null; // GSAP helpers (opcional, com fallback)

  const overlay     = document.querySelector(".overlay");
  const overlayText = document.querySelector(".overlay-text, .txt-destaque");
  const btnScroll   = document.getElementById("btn") || document.querySelector(".btn-scroll");
  const btnPlay     = document.getElementById("btn-play") || document.querySelector("#destaque .play-button");
  const vitrine     = document.getElementById("vitrine");
  const preco       = document.getElementById("preco");
  const mainVideo   = document.querySelector(".video-principal .plyr");

  // Se nada relevante existir, sai
  if (!overlay && !overlayText && !btnScroll && !btnPlay && !vitrine && !preco && !mainVideo) return;

  // ===== Constantes de comportamento =====
  const Z_INDEX_THRESHOLD        = vitrine?.dataset.threshold ? parseFloat(vitrine.dataset.threshold) : 0.5;
  const MAX_TY_BTN               = 36;    // quanto o botão/elementos "descem" ao rolar
  const SCROLL_RATIO             = 0.6;   // parte da viewport para normalizar o fade
  const IDLE_MS                  = 600;   // espera parado para restaurar hero no topo
  const TOP_PROGRESS_TO_RESTORE  = 0.15;  // se estiver próximo do topo, restaurar hero
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // ===== Flags =====
  let ticking        = false;
  let hidePlayPinned = false;  // some o play quando sair do topo por scroll
  let uiHiddenByPlay = false;  // some o UI porque o vídeo está tocando
  let idleTimer      = null;

  // ===== Efeitos de scroll (APENAS overlay/preço/botões) ====================
  const fadePreco = (progress) => {
    if (!preco) return;
    preco.style.opacity = String(1 - progress);
  };

  const fadeBtn = (el, progress) => {
    if (!el) return;
    const ty = (progress * MAX_TY_BTN) + "px";
    el.style.opacity = String(1 - progress);
    el.style.transform = `translateY(${ty})`;
  };

  const tintOverlay = (progress) => {
    if (!overlay) return;
    overlay.style.pointerEvents = "none";
    overlay.style.background = `rgba(0,0,0,${0.3 * progress})`;
    const blur = 10 * progress;
    overlay.style.backdropFilter = `blur(${blur}px)`;
    overlay.style.webkitBackdropFilter = overlay.style.backdropFilter;
  };

  // ===== Loop de scroll ======================================================
  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      const y = window.scrollY || window.pageYOffset || 0;
      const progress = clamp(y / (h * SCROLL_RATIO), 0, 1);

      // Flag ARIA para o play (ocultar quando sair do topo por scroll)
      if (y > 0) {
        if (!hidePlayPinned) {
          hidePlayPinned = true;
          document.body.setAttribute("data-hide-play", "true");
          btnPlay?.setAttribute("aria-hidden", "true");
          btnPlay?.setAttribute("inert", "");
          document.dispatchEvent(new CustomEvent("orbit:hide-play"));
        }
      } else {
        if (hidePlayPinned) {
          hidePlayPinned = false;
          document.body.removeAttribute("data-hide-play");
          btnPlay?.setAttribute("aria-hidden", "false");
          btnPlay?.removeAttribute("inert");
          document.dispatchEvent(new CustomEvent("orbit:show-play"));
        }
      }

      // Aplicações visuais
      tintOverlay(progress);
      fadePreco(progress);
      fadeBtn(btnScroll, progress);

      // O botão de play acompanha o scroll apenas se NÃO estiver oculto por "play"
      if (!uiHiddenByPlay) {
        fadeBtn(btnPlay, progress);
      } else if (btnPlay) {
        // quando o vídeo está tocando, mantemos o estado animado via GSAP — não interferir aqui
        btnPlay.style.opacity = "";
        btnPlay.style.transform = "";
      }

      // z-index da vitrine (conteúdo passa por cima do vídeo)
      if (vitrine) {
        vitrine.style.zIndex = progress >= Z_INDEX_THRESHOLD ? "-1" : "0";
      }

      ticking = false;

      // Idle: se parar de rolar perto do topo e o vídeo não estiver tocando → revela hero animado
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const stillY = window.scrollY || window.pageYOffset || 0;
        const stillProgress = clamp(stillY / (h * SCROLL_RATIO), 0, 1);
        const isPlaying = !!document.querySelector(".plyr--playing");
        if (stillProgress < TOP_PROGRESS_TO_RESTORE && !isPlaying) {
          uiHiddenByPlay = false;
          if (OM?.heroShowGsap) OM.heroShowGsap();
        }
      }, IDLE_MS);
    });
  };

  // ===== Interações ==========================================================
  // Click direto no botão play (antes do Plyr sinalizar)
  btnPlay?.addEventListener("click", () => {
    uiHiddenByPlay = true;
    if (OM?.heroHideGsap) OM.heroHideGsap();
  });

  // Eventos do <video> puro (fallback caso não use Plyr aqui)
  if (mainVideo) {
    mainVideo.addEventListener("play",  () => { uiHiddenByPlay = true;  OM?.heroHideGsap && OM.heroHideGsap(); });
    mainVideo.addEventListener("pause", () => { uiHiddenByPlay = false; OM?.heroShowGsap && OM.heroShowGsap(); });
    mainVideo.addEventListener("ended", () => { uiHiddenByPlay = false; OM?.heroShowGsap && OM.heroShowGsap(); });
  }

  // ===== Inicialização =======================================================
  function init() {
    // Garantimos que os elementos do hero possam ANIMAR (sem display:none seco)
    if (overlayText) {
      overlayText.hidden = false;
      overlayText.style.display = ""; // deixa GSAP animar
      overlayText.setAttribute("aria-hidden", "false");
      overlayText.removeAttribute("inert");
    }
    if (btnPlay) {
      btnPlay.hidden = false;
      btnPlay.style.display = ""; // deixa GSAP animar
    }
    if (btnScroll) {
      btnScroll.hidden = false;
      btnScroll.style.display = "";
    }
    // Start
    onScroll();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", init);
  document.addEventListener("DOMContentLoaded", init);
})();

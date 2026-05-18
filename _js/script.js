// _js/script.js
(() => {
  "use strict";

  // ===== Helpers ============================================================
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const isDesktop = () => window.innerWidth >= 768;

  // Alterna visibilidade com classes de animação (suas classes .start-in/.show-in/.show-out)
  function toggleVisibility(element, show, initial = false) {
    if (!element) return;
    if (show) {
      element.classList.remove("show-out");
      element.classList.add(initial ? "start-in" : "show-in");
      element.style.display = element.tagName === "VIDEO" ? "" : "flex";
      element.hidden = false;
      element.setAttribute("aria-hidden", "false");
      element.removeAttribute("inert");
    } else {
      element.classList.remove("show-in", "start-in");
      element.classList.add("show-out");
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("inert", "");
      setTimeout(() => {
        element.style.display = "none";
        element.hidden = true;
      }, 500);
    }
  }

  // ===== Estado inicial na carga ===========================================
  function animateOnLoad() {
    const overlayTextPrincipal  = document.querySelector("#destaque .overlay-text");
    const playButtonPrincipal   = document.getElementById("btn-play") || document.querySelector("#destaque .play-button");
    const scrollButtonPrincipal = document.querySelector("#btn");

    toggleVisibility(overlayTextPrincipal,  true, true);
    toggleVisibility(playButtonPrincipal,   true, true);
    toggleVisibility(scrollButtonPrincipal, true, true);
  }

  // ===== Lazy loading de vídeos com data-src (video/source) =================
  const videoNodes = $$("video[data-src], video source[data-src]")
    .map((n) => (n.tagName.toLowerCase() === "source" ? n.closest("video") : n))
    .filter(Boolean);
  const videoTargets = [...new Set(videoNodes)];

  function hydrateVideo(video) {
    if (!video) return;
    if (video.dataset.src) {
      video.src = video.dataset.src;
      video.removeAttribute("data-src");
    }
    $$("source[data-src]", video).forEach((srcEl) => {
      srcEl.setAttribute("src", srcEl.getAttribute("data-src"));
      srcEl.removeAttribute("data-src");
    });
    video.load?.();
  }

  function initVideoLazy() {
    if (!videoTargets.length) return;
    if ("IntersectionObserver" in window) {
      const videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            hydrateVideo(target);
            videoObserver.unobserve(target);
          });
        },
        { rootMargin: "200px 0px", threshold: 0 }
      );
      videoTargets.forEach((v) => videoObserver.observe(v));
    } else {
      videoTargets.forEach(hydrateVideo);
    }
  }

  // ===== ACCORDION (APG WAI-ARIA) — 1 aberto por vez =======================
  (() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isOpenItem = (item) =>
      item?.hasAttribute("data-open") ||
      item?.querySelector(".accordion__trigger")?.getAttribute("aria-expanded") === "true";

    const expand = (panel, item) => {
      panel.hidden = false;
      if (prefersReduced) {
        item.setAttribute("data-open", "true");
        panel.style.height = "auto";
        return;
      }
      panel.style.height = "0px";
      panel.getBoundingClientRect();
      const target = panel.scrollHeight;
      panel.style.transition = "height 250ms ease";
      panel.style.height = `${target}px`;
      const onEnd = (e) => {
        if (e.propertyName !== "height") return;
        panel.style.height = "auto";
        panel.style.transition = "";
        panel.removeEventListener("transitionend", onEnd);
      };
      panel.addEventListener("transitionend", onEnd);
      item.setAttribute("data-open", "true");
    };

    const collapse = (panel, item) => {
      if (panel.hidden && !item.hasAttribute("data-open")) return;

      if (prefersReduced) {
        panel.hidden = true;
        item.removeAttribute("data-open");
        return;
      }
      const current = panel.scrollHeight;
      panel.style.height = `${current}px`;
      panel.getBoundingClientRect();
      panel.style.transition = "height 200ms ease";
      panel.style.height = "0px";
      const onEnd = (e) => {
        if (e.propertyName !== "height") return;
        panel.hidden = true;
        panel.style.transition = "";
        item.removeAttribute("data-open");
        panel.removeEventListener("transitionend", onEnd);
      };
      panel.addEventListener("transitionend", onEnd);
    };

    const closeAll = (exceptItem = null) => {
      document.querySelectorAll("[data-accordion-item]").forEach((el) => {
        if (el === exceptItem) return;
        const trigger = el.querySelector(".accordion__trigger");
        if (!trigger) return;
        const panelId = trigger.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;
        if (isOpenItem(el)) {
          trigger.setAttribute("aria-expanded", "false");
          collapse(panel, el);
        }
      });
    };

    const initItem = (item) => {
      const trigger = item.querySelector(".accordion__trigger");
      if (!trigger) return;
      const panelId = trigger.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!panel) return;

      const openItem = () => {
        trigger.setAttribute("aria-expanded", "true");
        expand(panel, item);
      };
      const closeItem = () => {
        trigger.setAttribute("aria-expanded", "false");
        collapse(panel, item);
      };
      const toggle = () => {
        const open = isOpenItem(item);
        closeAll(item);
        open ? closeItem() : openItem();
      };

      item.addEventListener("click", (e) => {
        if (e.target.closest(".accordion__panel")) return;
        toggle();
      });

      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    };

    document.querySelectorAll("[data-accordion-item]").forEach(initItem);
  })();

  // ===== Política exclusiva para vídeo de capa ===============================
  // Somente .plyr-capa é mudo + autoplay/loop. Todos os demais NÃO.
  function enforceCoverVideoPolicy() {
    const cover = document.querySelector(".plyr-capa");
    $$("video").forEach((vid) => {
      const isCover = vid === cover;
      if (!isCover) {
        vid.autoplay = false;
        vid.removeAttribute("autoplay");
        vid.muted = false;
        vid.removeAttribute("muted");
      }
    });
  }

  // ===== Autoplay robusto para o vídeo de capa (.plyr-capa) =================
  function initCoverAutoplay() {
    const v = document.querySelector(".plyr-capa");
    if (!v) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReduce = () => {
      if (prefersReduced.matches) { try { v.pause(); } catch {} return; }
      tryPlay();
    };
    prefersReduced.addEventListener?.("change", handleReduce);

    // Garantir atributos SOMENTE na capa
    v.muted = true;
    v.setAttribute("muted", "");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.autoplay = true;
    v.loop = true;
    try { v.preload = "auto"; } catch {}

    const tryPlay = () => {
      if (prefersReduced.matches) return;
      const p = v.play?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const onCanPlay = () => { tryPlay(); };
    v.addEventListener("loadeddata", onCanPlay, { once: true });
    v.addEventListener("canplay", onCanPlay, { once: true });

    if (document.readyState !== "loading") tryPlay();
    else document.addEventListener("DOMContentLoaded", tryPlay, { once: true });

    window.addEventListener("touchstart", tryPlay, { once: true, passive: true });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tryPlay();
    });

    try { v.volume = 0; } catch {}
  }

  // ===== Boot ===============================================================
  document.addEventListener("DOMContentLoaded", () => {
    animateOnLoad();
    initVideoLazy();
    enforceCoverVideoPolicy();  // <- garante que só a capa é mudo/autoplay
    initCoverAutoplay();        // <- configura e tenta dar play na capa
  });

  // ===== Typed.js ============================================================
  var typed = new Typed('#typed-text', {
    strings: ['Nunca usou IA e quer começar a entender.','Já usou IA, mas não sabe adaptá-la ao seu negócio.', 'Usa IA e quer aprimorar a aplicação no negócio?', 'Usa IA no dia a dia e precisa escalar com segurança.' ],
    typeSpeed: 75,
    backSpeed: 25,
    loop: true,
    cursorChar: '_',
    backDelay: 1500,
    startDelay: 1000
    });

})();

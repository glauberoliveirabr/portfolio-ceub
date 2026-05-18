// === FULL LOADING OVERLAY CONTROLLER ===
// Autor: We Concept Front-End
// Atualizado: 2025-11
// Modo: exibição imediata (sem lazy display)
// Transição: fade-out suave (sem slide-up)

(function () {
  "use strict";

  const SELECTORS = [".loading-spinner", "#loading-overlay", "[data-loading-overlay]"];
  const HIDE_TIMEOUT_MS = 1200; // fallback para a transição (~0.8–1s no CSS)
  const HARD_KILL_MS = 7000;    // garantia extra contra travas
  let overlay = null;
  let initialized = false;

  // Impede scroll enquanto o loading está ativo (somente após achar o overlay)
  function lockScroll() {
    if (!document.body.classList.contains("no-scroll")) {
      document.body.classList.add("no-scroll");
    }
  }
  function unlockScroll() {
    document.body.classList.remove("no-scroll");
  }

  function findOverlay() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function removeOverlayNode() {
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.style.display = "none";
  }

  function hideOverlay() {
    if (!overlay) return;
    if (overlay.classList.contains("hidden")) {
      unlockScroll();
      return;
    }

    overlay.classList.add("fade-out"); // ativa transição CSS
    unlockScroll();

    // Usa transitionend se houver; senão, fallback por tempo
    let done = false;
    const onEnd = () => {
      if (done) return;
      done = true;
      overlay.removeEventListener("transitionend", onEnd);
      removeOverlayNode();
    };
    overlay.addEventListener("transitionend", onEnd, { once: true });
    setTimeout(onEnd, HIDE_TIMEOUT_MS);
  }

  function initWithOverlay() {
    if (initialized) return;
    initialized = true;

    lockScroll();

    // 1) Esconde no load completo
    window.addEventListener("load", hideOverlay, { once: true });

    // 2) Garantia extra se load atrasar
    document.addEventListener("DOMContentLoaded", () => {
      // Se por acaso o load não vier, garante após um curto delay
      setTimeout(hideOverlay, 900);
    }, { once: true });

    // 3) Hard kill (garantia total)
    setTimeout(hideOverlay, HARD_KILL_MS);

    // 4) Volta via bfcache
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) hideOverlay();
    });

    // 5) API manual
    window.hideLoading = hideOverlay;

    // Se o documento já estiver pronto ao injetar o script
    if (document.readyState === "complete") {
      // microtask para permitir pintura antes de esconder
      setTimeout(hideOverlay, 50);
    }
  }

  // — Inicialização resiliente —
  overlay = findOverlay();
  if (overlay) {
    initWithOverlay();
  } else {
    // Espera o overlay aparecer depois (frameworks que injetam tardiamente)
    const mo = new MutationObserver(() => {
      overlay = findOverlay();
      if (overlay) {
        mo.disconnect();
        initWithOverlay();
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });

    // Se mesmo assim não aparecer, libera o scroll para não travar a página
    setTimeout(() => {
      if (!overlay) unlockScroll();
    }, HARD_KILL_MS);
  }
})();

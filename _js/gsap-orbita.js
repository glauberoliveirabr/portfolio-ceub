// _js/gsap-orbita.js
(() => {
  "use strict";

  // ——— Requisitos: gsap + ScrollTrigger já carregados ———
  const gs = window.gsap;
  const ST = window.ScrollTrigger;
  if (!gs || !ST) {
    console.warn("[OrbitaMotion] GSAP + ScrollTrigger não encontrados.");
    return;
  }
  gs.registerPlugin(ST);

  // ===== Utilitários ========================================================
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isInsideRoda = (el) => !!el.closest(".roda-orbita"); // nunca animar a roda

  // Will-change: set/clear para performance sem acumular estilos
  const setWillChange = (els) =>
    els.forEach((el) => (el.style.willChange = "transform, opacity"));
  const clearWillChange = (els) =>
    els.forEach((el) => (el.style.willChange = ""));

  // Split simples (chars/words) sem plugins pagos
  function splitText(el, mode = "chars") {
    if (!el) return { parts: [], revert: () => {} };
    const original = el.innerHTML;
    const text = el.textContent || "";
    let parts = [];

    if (mode === "words") {
      parts = text.split(/(\s+)/).map((chunk) => {
        if (/^\s+$/.test(chunk)) return document.createTextNode(chunk);
        const span = document.createElement("span");
        span.className = "om-word";
        span.textContent = chunk;
        return span;
      });
    } else {
      // default: chars
      parts = Array.from(text).map((ch) => {
        if (ch === " ") return document.createTextNode(" ");
        const span = document.createElement("span");
        span.className = "om-char";
        span.textContent = ch;
        return span;
      });
    }

    el.innerHTML = "";
    parts.forEach((n) => el.appendChild(n));

    return {
      parts: parts.filter((n) => n.nodeType === 1),
      revert: () => {
        el.innerHTML = original;
      },
    };
  }

  // Batch ScrollTrigger com opções padrão (disparo quando 20% visível)
  const defaultStart = "top 80%"; // => 20% do elemento visível
  const defaultEase = "power3.out";

  // ===== Presets de Animação =================================================

  /**
   * revealBlock(target, options?)
   * Entrada suave de baixo -> cima (y: 100px), alpha 0->1, stagger opcional.
   * Dispara quando 20% do bloco aparece (ScrollTrigger once).
   */
  function revealBlock(target, opts = {}) {
    const {
      y = 100,
      duration = 1.0,
      ease = defaultEase,
      stagger = 0.12,
      start = defaultStart,
      once = true,
      filter = (el) => !isInsideRoda(el), // não animar dentro da roda
      clearProps = "transform,opacity",
    } = opts;

    const nodes = gs.utils.toArray(target).filter(filter);
    if (!nodes.length || prefersReduced) return;

    ST.batch(nodes, {
      start,
      once,
      onEnter: (batch) => {
        setWillChange(batch);
        gs.fromTo(
          batch,
          { autoAlpha: 0, y },
          {
            autoAlpha: 1,
            y: 0,
            duration,
            ease,
            stagger,
            clearProps,
            onComplete: () => clearWillChange(batch),
          }
        );
      },
    });
  }

  /**
   * revealText(target, options?)
   * Split por chars (ou words) com movimento vertical macio.
   */
  function revealText(target, opts = {}) {
    const {
      mode = "chars", // "chars" | "words"
      y = "1.05em",
      duration = 0.9,
      ease = "power4.out",
      stagger = 0.02,
      start = defaultStart,
      once = true,
      parentFade = true, // também anima o container levemente
      parent = null, // se quiser animar um wrapper específico
    } = opts;

    const containers = gs.utils
      .toArray(target)
      .filter((el) => !isInsideRoda(el));
    if (!containers.length || prefersReduced) return;

    containers.forEach((el) => {
      const { parts, revert } = splitText(el, mode);
      if (!parts.length) return;

      ST.create({
        trigger: el,
        start,
        once,
        onEnter: () => {
          setWillChange(parts);
          if (parentFade) {
            const wrap = parent ? el.closest(parent) || el : el;
            gs.fromTo(
              wrap,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.4, ease: "linear" }
            );
          }
          gs.fromTo(
            parts,
            { autoAlpha: 0, y },
            {
              autoAlpha: 1,
              y: 0,
              duration,
              ease,
              stagger,
              clearProps: "transform,opacity",
              onComplete: () => {
                clearWillChange(parts);
                // mantém o texto “vivo”: remove spans e deixa DOM limpo? não — preservamos para possíveis re-entradas
                // Se quiser limpar, chame revert() aqui.
              },
            }
          );
        },
      });
    });
  }

  /**
   * revealUnit(target, options?)
   * Pensado para #timer .unit: entra sequencial e ganha um “float” sutil.
   */
  function revealUnit(target, opts = {}) {
    const {
      y = 80,
      duration = 0.9,
      ease = defaultEase,
      stagger = 0.2,
      start = defaultStart,
      once = true,
      float = true,
    } = opts;

    const units = gs.utils.toArray(target).filter((el) => !isInsideRoda(el));
    if (!units.length || prefersReduced) return;

    ST.create({
      trigger: units[0].closest("#timer") || units[0],
      start,
      once,
      onEnter: () => {
        setWillChange(units);
        gs.fromTo(
          units,
          { autoAlpha: 0, y, scale: 0.94 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration,
            ease,
            stagger,
            clearProps: "transform,opacity",
            onComplete: () => {
              clearWillChange(units);
              if (float) {
                gs.to(units, {
                  y: "+=4",
                  duration: 3,
                  ease: "sine.inOut",
                  repeat: -1,
                  yoyo: true,
                });
              }
            },
          }
        );
      },
    });
  }

  // ===== Hero: entrada, esconder/mostrar em play/pause ======================
  // Alvos padrão: overlay de texto, botão play e seta (se houver)
  const heroTargets = {
    txt: "#destaque .overlay-text, .txt-destaque",
    play: "#btn-play, #destaque .play-button",
    seta: "#btn, .btn-scroll",
  };

  function heroIntro(opts = {}) {
    const {
      y = 100,
      duration = 1.0,
      ease = "power4.out",
      stagger = 0.1,
    } = opts;

    const nodes = [
      ...$all(heroTargets.txt),
      ...$all(heroTargets.play),
      ...$all(heroTargets.seta),
    ].filter((el) => !isInsideRoda(el));

    if (!nodes.length || prefersReduced) return;

    setWillChange(nodes);
    gs.fromTo(
      nodes,
      { autoAlpha: 0, y },
      {
        autoAlpha: 1,
        y: 0,
        duration,
        ease,
        stagger,
        clearProps: "transform,opacity",
        onComplete: () => clearWillChange(nodes),
      }
    );
  }

  // some para o centro (levemente) + fade
  function heroHideGsap() {
    const txts = $all(heroTargets.txt).filter((el) => !isInsideRoda(el));
    const plays = $all(heroTargets.play).filter((el) => !isInsideRoda(el));
    const btns = $all(heroTargets.seta).filter((el) => !isInsideRoda(el));
    const nodes = [...txts, ...plays, ...btns];
    if (!nodes.length) return;

    gs.killTweensOf(nodes);
    setWillChange(nodes);
    gs.to(nodes, {
      autoAlpha: 0,
      y: -20,
      scale: 0.98,
      duration: 0.35,
      ease: "power1.out",
      onComplete: () => {
        nodes.forEach((n) => (n.style.pointerEvents = "none"));
        clearWillChange(nodes);
      },
    });
  }

  function heroShowGsap() {
    const txts = $all(heroTargets.txt).filter((el) => !isInsideRoda(el));
    const plays = $all(heroTargets.play).filter((el) => !isInsideRoda(el));
    const btns = $all(heroTargets.seta).filter((el) => !isInsideRoda(el));
    const nodes = [...txts, ...plays, ...btns];
    if (!nodes.length || prefersReduced) return;

    nodes.forEach((n) => (n.style.pointerEvents = "")); // volta a interagir

    gs.killTweensOf(nodes);
    setWillChange(nodes);
    gs.fromTo(
      nodes,
      { autoAlpha: 0, y: 100, scale: 0.98 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        clearProps: "transform,opacity",
        onComplete: () => clearWillChange(nodes),
      }
    );
  }

  // ===== API pública ========================================================
  window.OrbitaMotion = {
    revealBlock,
    revealText,
    revealUnit,
    heroIntro,
    heroHideGsap,
    heroShowGsap,
  };
})();

/* === Anime.js v4 — ESM + fallback UMD === */
let animate, stagger;
try {
  const m = await import("https://esm.sh/animejs@4.2.2");
  ({ animate, stagger } = m);
  if (!animate) throw 0;
} catch {
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/animejs@4.2.2/dist/bundles/anime.umd.min.js";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  // @ts-ignore
  animate = window.anime.animate;
  // @ts-ignore
  stagger = window.anime.utils.stagger;
}

/* === Config === */
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.max(1, window.devicePixelRatio || 1);
const snap = (v) => Math.round(v * DPR) / DPR;

const RESIZE_IDLE_MS = 1200;
const RESIZE_FRAMES_OK = 5;

const BUILD_DURATION = 1400;
const STAGGER_STEP = 50;
const SPIN_BASE = 2600;
const SPIN_ARC_K = 1.2;

const TXT_OUT_DUR = 400;
const TXT_IN_DUR = 1800;
const TXT_OPA_DUR = 1000;
const TXT_OUT_EASE = "outQuad";
const TXT_IN_EASE = "outElastic(1.4, .26)";
const TXT_OPA_EASE = "outCubic";

const RESET_FADE_MS = 400;

/* === Refs === */
const wheel = document.getElementById("wheel");
const socket = document.getElementById("socket");
const indicator = document.getElementById("indicator");
const live = document.getElementById("live");
const txKicker = document.getElementById("tx-kicker");
const txTitle = document.getElementById("tx-title");
const txDesc = document.getElementById("tx-desc");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const stage = document.querySelector(".stage");
const viewport = document.getElementById("viewport");

/* === Conteúdo (ex.: ./_img/wheel/X.png) === */
const content = [
  { kicker: "01", title: "UX Design", desc: "Pesquisa, fluxos e arquitetura da informação", icon: "./_img/wheel/1.png" },
  { kicker: "02", title: "UI Design", desc: "Interfaces visuais de alta fidelidade", icon: "./_img/wheel/2.png" },
  { kicker: "03", title: "Design System", desc: "Criação e gestão de componentes escaláveis", icon: "./_img/wheel/3.png" },
  { kicker: "04", title: "Product Design", desc: "Design orientado a produto e métricas", icon: "./_img/wheel/4.png" },
  { kicker: "05", title: "Design Strategy", desc: "Alinhamento entre design, negócio e tecnologia", icon: "./_img/wheel/5.png" },
  { kicker: "06", title: "Frontend Development", desc: "Estilização ágil com utility-first", icon: "./_img/wheel/6.png" },
  { kicker: "07", title: "Gestão de Projetos", desc: "Planejamento e entrega de squads de design", icon: "./_img/wheel/7.png" },
  { kicker: "08", title: "Planejamento Estratégico", desc: "Roadmap de design alinhado ao negócio", icon: "./_img/wheel/8.png" },
  { kicker: "09", title: "Gamificação", desc: "Mecânicas de engajamento em produtos digitais", icon: "./_img/wheel/9.png" },
  { kicker: "10", title: "Premiações", desc: "Reconhecimento nacional e internacional em Design e Criatividade", icon: "./_img/wheel/10.png" },
  { kicker: "11", title: "Discovery & Validação", desc: "Do problema certo à solução que sobrevive ao mercado", icon: "./_img/wheel/11.png" },
  { kicker: "12", title: "Mentoria & Liderança", desc: "Formação de designers que pensam como donos do produto", icon: "./_img/wheel/12.png" },
];

/* === Criação dinâmica dos itens === */
if (!wheel.querySelector(".item")) {
  const frag = document.createDocumentFragment();
  content.forEach((item, i) => {
    const it = document.createElement("article");
    it.id = `it-${i + 1}`;
    it.className = "item";
    it.setAttribute("role", "option");
    it.setAttribute("aria-selected", i === 0 ? "true" : "false");
    it.tabIndex = i === 0 ? 0 : -1;
    it.setAttribute("aria-label", `${item.kicker} — ${item.title}`);

    const ic = document.createElement("div");
    ic.className = "icon";
    const img = document.createElement("img");
    img.src = item.icon;
    img.alt = item.title;
    img.loading = "lazy";
    img.width = 100;
    img.height = 100;
    ic.appendChild(img);

    it.appendChild(ic);
    frag.appendChild(it);
  });
  wheel.appendChild(frag);
}

const items = Array.from(wheel.querySelectorAll(".item"));
const N = items.length;
const seg = 360 / N;

/* === Estado e utils === */
let idx = 0, rot = 0, spinning = false, queuedSpin = null;
let lastClickTime = 0;
let sequenceBoost = 1;
const mod = (n, m) => ((n % m) + m) % m;
const raf = () => new Promise((r) => requestAnimationFrame(r));

function readWheelRadius() {
  const w = wheel.getBoundingClientRect().width;
  return snap(w / 2 );
}
function readItemOuter() {
  const ref = items[0] || socket;
  return ref.getBoundingClientRect().width || 60;
}

/* === Layout radial === */
function layoutRadial(progress = 1) {
  const R = readWheelRadius() * progress;
  const outer = readItemOuter();
  const travel = Math.max(0, snap(R - outer / 2));
  items.forEach((el, i) => {
    const a = i * seg;
    el.style.transform = `rotate(${a}deg) translateY(-${travel}px)`;
    el.style.opacity = progress;
  });
  wheel.style.transform = `rotate(${rot}deg)`;
}

/* === Montagem inicial (espera estabilidade de LARGURA) === */
async function waitStableSize(el, frames = RESIZE_FRAMES_OK) {
  let lw = -1, same = 0;
  while (true) {
    await raf();
    const r = el.getBoundingClientRect();
    if (r.width > 0 && Math.abs(r.width - lw) < 0.5) same++;
    else same = 0;
    if (same >= frames) return;
    lw = r.width;
  }
}

async function buildWheelOnce() {
  await waitStableSize(wheel);
  if (prefersReduced) {
    layoutRadial(1);
    return;
  }
  const state = { t: 0 };
  await new Promise((res) => {
    animate(state, {
      t: [{ from: 0, to: 1, duration: BUILD_DURATION, ease: "outCubic" }],
      onUpdate: () => layoutRadial(state.t),
      onComplete: res,
    });
  });
  animate(items, {
    scale: [{ from: 0.9, to: 1, duration: 700, ease: "outCubic" }],
    opacity: [{ from: 0.4, to: 1, duration: 700 }],
    delay: stagger(STAGGER_STEP)
  });
}

/* === Reset após resize (só quando largura muda) === */
async function resetWheelAfterResize() {
  await waitStableSize(wheel, RESIZE_FRAMES_OK);
  items.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "none";
  });
  wheel.style.transform = "none";
  rot = 0;
  await raf();
  await buildWheelOnce();
  setActive(0, false, false);
  animate(items, { opacity: [{ from: 0, to: 1, duration: RESET_FADE_MS, ease: "outCubic" }] });
}

/* === Texto e seleção === */
function setActive(i, announce = true, animateText = true, speedFactor = 1) {
  idx = mod(i, N);

  items.forEach((el, k) => {
    const on = k === idx;
    el.setAttribute("aria-selected", on ? "true" : "false");
    el.tabIndex = on ? 0 : -1;
  });

  indicator.textContent = `${idx + 1}/${N}`;
  if (announce) live.textContent = `Item ${idx + 1} de ${N}`;
  wheel.setAttribute("aria-activedescendant", `it-${idx + 1}`);

  socket.replaceChildren(items[idx].querySelector(".icon").cloneNode(false));

  const { kicker, title, desc } = content[idx];

  if (!animateText || prefersReduced) {
    txKicker.textContent = kicker;
    txTitle.textContent = title;
    txDesc.textContent = desc;
    return;
  }

  const outDur = Math.max(120, TXT_OUT_DUR * speedFactor);
  const inDur = Math.max(200, TXT_IN_DUR * speedFactor);
  const opaDur = Math.max(160, TXT_OPA_DUR * speedFactor);

  animate([txKicker, txTitle, txDesc], {
    y: [{ to: 100, duration: outDur, ease: TXT_OUT_EASE }],
    opacity: [{ to: 0, duration: outDur }],
    onComplete: () => {
      txKicker.textContent = kicker;
      txTitle.textContent = title;
      txDesc.textContent = desc;
      animate([txKicker, txTitle, txDesc], {
        y: [{ from: 150, to: 0, duration: inDur, ease: TXT_IN_EASE }],
        opacity: [{ from: 0, to: 1, duration: opaDur, ease: TXT_OPA_EASE }],
      });
    },
  });
}

/* === Rotação dinâmica === */
function targetRotationForIndex(j) {
  const base = -j * seg;
  const k = Math.round((rot - base) / 360);
  return base + 360 * k;
}

function spinTo(ti, queued = false) {
  const now = performance.now();
  const delta = now - lastClickTime;
  lastClickTime = now;
  if (delta < 400) sequenceBoost = Math.max(0.4, sequenceBoost * 0.85);
  else sequenceBoost = 1;

  if (spinning && !queued) {
    queuedSpin = ti;
    return;
  }
  spinning = true;

  const destIdx = mod(ti, N);
  const destRot = targetRotationForIndex(destIdx);
  const startRot = rot;
  const arc = Math.abs(destRot - startRot);
  const duration = (SPIN_BASE + Math.min(1800, arc * SPIN_ARC_K)) * sequenceBoost;

  const state = { t: 0 };
  let textStarted = false;

  animate(state, {
    t: [{ from: 0, to: 1, duration, ease: "outElastic(1.2,.28)" }],
    onUpdate: () => {
      const cur = startRot + (destRot - startRot) * state.t;
      wheel.style.transform = `rotate(${cur}deg)`;
      if (!textStarted && state.t >= 0.4) {
        textStarted = true;
        const textSpeedFactor = Math.max(0.6, sequenceBoost);
        setActive(destIdx, true, true, textSpeedFactor);
      }
    },
    onComplete: () => {
      rot = destRot;
      setActive(destIdx, false, false);
      spinning = false;
      if (queuedSpin !== null) {
        const nextTarget = queuedSpin;
        queuedSpin = null;
        spinTo(nextTarget, true);
      }
    },
  });
}

/* === Controles / interações === */
const next = () => spinTo(idx + 1);
const prev = () => spinTo(idx - 1);
nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
  if (e.key === "Home") spinTo(0);
  if (e.key === "End") spinTo(N - 1);
});

items.forEach((el, i) => {
  el.addEventListener("click", () => spinTo(i));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      spinTo(i);
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      spinTo(mod(i + 1, N));
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      spinTo(mod(i - 1, N));
    }
  });
});

/* === Visibility + build control === */
let isVisible = false, hasBuilt = false;
const visIO = new IntersectionObserver(
  (entries) => {
    isVisible = entries.some((e) => e.isIntersecting);
    if (isVisible && !hasBuilt) {
      items.forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "scale(0.7)";
      });
      buildWheelOnce().then(() => {
        setActive(0, false, false);
        hasBuilt = true;
        const r = wheel.getBoundingClientRect();
        lastWheelRect.w = r.width;
      });
    }
  },
  { threshold: 0.25 }
);
visIO.observe(stage);

/* === Blindagem de resize: largura apenas === */
let idleTimer = 0;
let lastWheelRect = { w: 0 };

/* 1) ResizeObserver no elemento (muda só quando o wheel realmente muda de largura) */
const ro = new ResizeObserver((entries) => {
  if (!hasBuilt || !isVisible) return;
  for (const entry of entries) {
    const { width } = entry.contentRect;
    const dw = Math.abs(width - lastWheelRect.w);
    if (dw < 2) return;            // ignora variações minúsculas
    lastWheelRect.w = width;
    items.forEach((el) => (el.style.opacity = "0"));
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      resetWheelAfterResize();
    }, RESIZE_IDLE_MS);
  }
});
ro.observe(wheel);

/* 2) Fallback: mudanças significativas de largura do viewport */
let lastVV = { w: window.innerWidth };
function onHardViewportResize() {
  if (!hasBuilt || !isVisible) return;
  const cw = window.innerWidth;
  const dw = Math.abs(cw - lastVV.w);
  lastVV = { w: cw };
  if (dw >= 8) {
    items.forEach((el) => (el.style.opacity = "0"));
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      resetWheelAfterResize();
    }, RESIZE_IDLE_MS);
  }
}
window.addEventListener("resize", onHardViewportResize, { passive: true });

/* 3) VisualViewport (quando disponível): considera somente LARGURA */
if (window.visualViewport) {
  let lastVVW = window.visualViewport.width;
  window.visualViewport.addEventListener(
    "resize",
    () => {
      if (!hasBuilt || !isVisible) return;
      const w = window.visualViewport.width;
      const dw = Math.abs(w - lastVVW);
      lastVVW = w;
      if (dw < 2) return;          // ignora micro variações
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        resetWheelAfterResize();
      }, RESIZE_IDLE_MS);
    },
    { passive: true }
  );
}

/* === Gesto: deslizar com o dedo (swipe) para trocar quadro a quadro === */
/* A rolagem vertical é preservada; gesto horizontal dispara navegação */
if (stage && stage.style) stage.style.touchAction = "pan-y";

const SWIPE_THRESH = 32;     // px necessários para acionar navegação
const SWIPE_SLOPE_TOL = 0.5; // tolerância vertical no gesto
let swipe = { active: false, startX: 0, startY: 0, pid: -1, moved: false };

function onPointerDown(e) {
  if (!e.isPrimary) return;
  if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
  swipe.active = true;
  swipe.moved = false;
  swipe.startX = e.clientX;
  swipe.startY = e.clientY;
  swipe.pid = e.pointerId;
  try { stage.setPointerCapture?.(e.pointerId); } catch {}
}

function onPointerMove(e) {
  if (!swipe.active || e.pointerId !== swipe.pid) return;
  const dx = e.clientX - swipe.startX;
  const dy = e.clientY - swipe.startY;
  if (!swipe.moved) {
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * (1 + SWIPE_SLOPE_TOL)) {
      swipe.moved = true;
    }
  }
  if (swipe.moved) {
    e.preventDefault(); // bloqueia pan-x, preserva pan-y via touch-action
  }
}

function endSwipe(e) {
  if (!swipe.active || (e.pointerId != null && e.pointerId !== swipe.pid)) return;
  const dx = (e.clientX ?? swipe.startX) - swipe.startX;
  if (swipe.moved && Math.abs(dx) > SWIPE_THRESH) {
    if (dx < 0) next();
    else prev();
  }
  swipe.active = false;
  swipe.moved = false;
  swipe.pid = -1;
  try { stage.releasePointerCapture?.(e.pointerId); } catch {}
}
stage.addEventListener("pointerdown", onPointerDown, { passive: true });
stage.addEventListener("pointermove", onPointerMove, { passive: false }); // precisa para preventDefault()
stage.addEventListener("pointerup", endSwipe, { passive: true });
stage.addEventListener("pointercancel", endSwipe, { passive: true });

/* === Init === */
function init() {
  items.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "scale(0.7)";
  });
}
window.addEventListener("load", init, { once: true });

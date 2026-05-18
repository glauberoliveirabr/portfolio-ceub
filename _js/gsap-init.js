// _js/gsap-init.js
(() => {
  "use strict";
  const OM = window.OrbitaMotion;

  // 2. Hero inicial (na carga)
  document.addEventListener("DOMContentLoaded", () => {
    OM.heroIntro({ y: 120, duration: 1.0, stagger: 0.10 });
  });

  // 3. Blocos e textos — padrão ouro
  // Boxes/Glass
  OM.revealBlock(".glass-container, .glass-container2, .box, #convite h1", {
    y: 120,
    duration: 1.0,
    stagger: 0.15,
    start: "top 80%" // dispara quando 20% aparece
  });

  // Títulos com split de chars (leve, sofisticado)
  OM.revealText("#descubra h1, #faq h1", {
    mode: "chars",
    y: "1.1em",
    duration: 0.9,
    ease: "power4.out",
    stagger: 0.02,
    start: "top 80%"
  });

  // Parágrafos com entrada suave
  OM.revealBlock("#descubra p, #data-orbita p, #saiba-mais p", {
    y: 100,
    duration: 0.9,
    stagger: 0.1
  });

  // Counter (montagem sequencial + float)
  OM.revealUnit("#timer .unit", {
    y: 80,
    duration: 0.9,
    stagger: 0.2,
    float: true
  });

  // Data Órbita: título grande + strongs + texto (sequência sutil)
  // -> Pode só usar presets acima; se quiser algo ainda mais coreografado:
  const data = document.querySelector("#data-orbita");
  if (data) {
    const h1 = data.querySelector("h1");
    if (h1) OM.revealBlock(h1, { y: 120, duration: 1.1 });
    const strongs = data.querySelectorAll("h1 strong");
    if (strongs.length) OM.revealBlock(strongs, { y: 60, duration: 0.8, stagger: 0.15 });
    const p = data.querySelector("p");
    if (p) OM.revealBlock(p, { y: 100, duration: 1.0, stagger: 0.05 });
  }

  // OBS: nada aqui toca em `.roda-orbita`
})();

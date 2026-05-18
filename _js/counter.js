const START_DATE = new Date(2002, 7, 8, 0, 0, 0);

function diffFromStart() {
  const now = new Date();

  let years = now.getFullYear() - START_DATE.getFullYear();
  let months = now.getMonth() - START_DATE.getMonth();
  let days = now.getDate() - START_DATE.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const todayBase = new Date(
    START_DATE.getFullYear() + years,
    START_DATE.getMonth() + months,
    START_DATE.getDate() + days
  );

  let remainingMs = now - todayBase;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;

  const hours = Math.floor(remainingMs / hour);
  remainingMs -= hours * hour;
  const minutes = Math.floor(remainingMs / minute);
  remainingMs -= minutes * minute;
  const seconds = Math.floor(remainingMs / 1000);

  return { years, months, days, hours, minutes, seconds };
}

const els = {
  years: document.getElementById('years'),
  months: document.getElementById('months'),
  days: document.getElementById('days'),
  hours: document.getElementById('hours'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
  live: document.getElementById('sr-live')
};

function setDigit(el, value) {
  if (!el) return;
  const next = String(value).padStart(2, '0');
  if (el.textContent !== next) {
    el.textContent = next;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
  }
}

let lastMinuteSpoken = -1;

function update() {
  const diff = diffFromStart();

  setDigit(els.years, diff.years);
  setDigit(els.months, diff.months);
  setDigit(els.days, diff.days);
  setDigit(els.hours, diff.hours);
  setDigit(els.minutes, diff.minutes);
  setDigit(els.seconds, diff.seconds);

  if (diff.minutes !== lastMinuteSpoken && els.live) {
    lastMinuteSpoken = diff.minutes;
    els.live.textContent =
      `${diff.years} anos, ${diff.months} meses, ${diff.days} dias, ${diff.hours} horas e ${diff.minutes} minutos de experiência.`;
  }
}

let prevSec = null;
function tick() {
  const sec = new Date().getSeconds();
  if (sec !== prevSec) {
    prevSec = sec;
    update();
  }
  requestAnimationFrame(tick);
}

update();
tick();
// Going Once: animation helpers. Counters, stamps, the gavel, flying chips, ink marks.
// Everything here respects prefers-reduced-motion and is safe to abandon mid flight.

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Tween a number inside an element. Returns a cancel function.
 * With reduced motion, or no requestAnimationFrame, the value is set at once.
 */
export function tweenNumber(el, from, to, { duration = 650, format = (n) => String(n) } = {}) {
  if (!el) return () => {};
  if (prefersReducedMotion() || typeof requestAnimationFrame !== "function" || from === to) {
    el.textContent = format(to);
    return () => {};
  }
  let raf = 0;
  let cancelled = false;
  const start = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    const value = Math.round(from + (to - from) * easeOutCubic(t));
    el.textContent = format(value);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  el.textContent = format(from);
  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
  };
}

/** Animate an element with the Web Animations API, quietly doing nothing if unsupported. */
export function animate(el, keyframes, options) {
  if (!el || typeof el.animate !== "function") return null;
  if (prefersReducedMotion()) {
    try {
      return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "linear" });
    } catch {
      return null;
    }
  }
  try {
    return el.animate(keyframes, options);
  } catch {
    return null;
  }
}

/** Stamp lands: scale 1.7 to 1 with a settle. */
export function stampIn(el) {
  animate(
    el,
    [
      { transform: `rotate(var(--tilt,-3deg)) scale(1.7)`, opacity: 0 },
      { transform: `rotate(var(--tilt,-3deg)) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `rotate(var(--tilt,-3deg)) scale(1.03)`, offset: 0.8 },
      { transform: `rotate(var(--tilt,-3deg)) scale(1)`, opacity: 1 },
    ],
    { duration: 300, easing: "ease-in", fill: "none" },
  );
}

/** The gavel strikes: rotate down, rebound, shake the sheet, puff ink dust. */
export function gavelStrike(gavelEl, sheetEl) {
  if (prefersReducedMotion()) return;
  if (gavelEl) {
    animate(
      gavelEl,
      [
        { transform: "rotate(-40deg)", transformOrigin: "80% 90%" },
        { transform: "rotate(6deg)", transformOrigin: "80% 90%", offset: 0.35 },
        { transform: "rotate(0deg)", transformOrigin: "80% 90%" },
      ],
      { duration: 270, easing: "ease-in" },
    );
  }
  if (sheetEl) {
    animate(
      sheetEl,
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-3px,2px)" },
        { transform: "translate(3px,-2px)" },
        { transform: "translate(-2px,1px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 160, easing: "linear" },
    );
  }
}

/** Five brass discs fly from `fromEl` to `toEl` along arcs, then call `done`. */
export function flyChips(fromEl, toEl, count = 5, done = () => {}) {
  if (!fromEl || !toEl || prefersReducedMotion() || typeof document === "undefined") {
    done();
    return;
  }
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  const to = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  const layer = document.createElement("div");
  layer.className = "chip-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  let finished = 0;
  for (let i = 0; i < count; i++) {
    const disc = document.createElement("span");
    disc.className = "chip__disc chip__disc--fly";
    disc.style.left = `${from.x}px`;
    disc.style.top = `${from.y}px`;
    layer.appendChild(disc);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const arc = -40 - i * 12;
    const anim = disc.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.9)", opacity: 0 },
        { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 + arc}px)) scale(1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`, opacity: 0.2 },
      ],
      { duration: 700, delay: i * 70, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" },
    );
    const settle = () => {
      finished += 1;
      if (finished === count) {
        layer.remove();
        done();
      }
    };
    if (anim) anim.addEventListener("finish", settle);
    else settle();
  }
  setTimeout(() => {
    layer.remove();
  }, 700 + count * 70 + 200);
}

/** A floating "+300" or "-300" note that rises and fades. */
export function floatDelta(anchorEl, text, loss = false) {
  if (!anchorEl || typeof document === "undefined") return;
  const rect = anchorEl.getBoundingClientRect();
  const note = document.createElement("span");
  note.className = `float-delta ${loss ? "float-delta--loss" : "float-delta--gain"}`;
  note.textContent = text;
  note.style.left = `${rect.left + rect.width / 2}px`;
  note.style.top = `${rect.top + rect.height / 2}px`;
  note.setAttribute("aria-hidden", "true");
  document.body.appendChild(note);
  if (prefersReducedMotion()) {
    note.remove();
    return;
  }
  const anim = note.animate(
    [
      { transform: "translate(-50%,0)", opacity: 0 },
      { transform: "translate(-50%,-18px)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%,-46px)", opacity: 0 },
    ],
    { duration: 900, easing: "ease-out", fill: "forwards" },
  );
  const remove = () => note.remove();
  if (anim) anim.addEventListener("finish", remove);
  else remove();
}

/** A soft oxblood blot behind the purse. */
export function inkBlot(el) {
  animate(
    el,
    [
      { transform: "scale(0)", opacity: 0.35 },
      { transform: "scale(1.4)", opacity: 0 },
    ],
    { duration: 600, easing: "ease-out" },
  );
}

/** Page turn: the new plate swings in from the left edge. */
export function pageTurn(el) {
  animate(
    el,
    [
      { transform: "perspective(1400px) rotateY(-70deg)", opacity: 0.2 },
      { transform: "perspective(1400px) rotateY(0deg)", opacity: 1 },
    ],
    { duration: 620, easing: "cubic-bezier(.2,.7,.2,1)" },
  );
}

/** Stagger children in on a screen change. */
export function staggerIn(container, selector = ":scope > *") {
  if (!container) return;
  if (prefersReducedMotion()) {
    animate(container, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    return;
  }
  const children = Array.from(container.querySelectorAll(selector));
  children.forEach((child, i) => {
    animate(
      child,
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 500, delay: i * 60, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" },
    );
  });
}

/** Ink circle: draw an SVG stroke as if by hand. */
export function drawStroke(pathEl, duration = 520) {
  if (!pathEl) return;
  const length = typeof pathEl.getTotalLength === "function" ? pathEl.getTotalLength() : 300;
  pathEl.style.strokeDasharray = String(length);
  pathEl.style.strokeDashoffset = String(length);
  if (prefersReducedMotion()) {
    pathEl.style.strokeDashoffset = "0";
    return;
  }
  const anim = pathEl.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
    duration,
    easing: "ease-out",
    fill: "forwards",
  });
  if (anim) anim.addEventListener("finish", () => {
    pathEl.style.strokeDashoffset = "0";
  });
}

/** Rotate a rival paddle to show its bid. */
export function flipPaddle(el) {
  animate(
    el,
    [
      { transform: "rotateY(0deg)" },
      { transform: "rotateY(180deg)" },
    ],
    { duration: 520, easing: "cubic-bezier(.4,.1,.2,1)", fill: "forwards" },
  );
}

/**
 * Winner beat: the winning portrait lifts, is ringed in brass and the losers sink and fade.
 * Used on the resolved lot screen to show who took the lot. Respects reduced motion.
 */
export function winnerBeat(winnerEl, rivalEls) {
  if (winnerEl) animate(
    winnerEl,
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-10px)" },
      { transform: "translateY(-6px)" },
    ],
    { duration: 600, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
  );
  const plate = winnerEl ? winnerEl.closest("[data-rival]") : null;
  if (plate) plate.classList.add("rival--winner");
  rivalEls.forEach((el) => {
    if (!el || el === winnerEl) return;
    animate(el, [{ opacity: 1 }, { opacity: 0.45 }], { duration: 500, fill: "forwards" });
    el.classList.add("rival--sunk");
  });
}

/**
 * Verdict beat: a catalogue-style verdict line fades up with a short settle.
 * e.g. "Sold, to Venn, for 450 chips." / "Wrong. The stake is forfeit."
 */
export function verdictRise(el) {
  if (!el) return;
  animate(
    el,
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 450, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" },
  );
}

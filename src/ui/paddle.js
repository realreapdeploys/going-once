// Going Once: the paddle. A drawn wooden paddle used for the bid control, the rival bids and the
// unlocked paddle picker. Colours come from the --paddle and --paddle-trim custom properties.

import { h } from "./dom.js";

/**
 * Paddle markup. `number` is drawn on the face (a bid, a wager or nothing).
 * `html` is trusted static SVG, so it is the one place innerHTML is allowed.
 */
export function paddleSvg({ number = "", tilt = 0, tone = null, size = 132 } = {}) {
  const colour = tone ? ` style="--paddle:${tone.color};--paddle-trim:${tone.trim}"` : "";
  return `<svg viewBox="0 0 120 170" width="${size}" height="${Math.round((size * 170) / 120)}" class="paddle__art"${colour} aria-hidden="true" focusable="false">
    <g transform="rotate(${tilt} 60 80)">
      <ellipse cx="60" cy="59" rx="42" ry="47" fill="var(--paddle)" stroke="var(--paddle-trim)" stroke-width="3"/>
      <ellipse cx="60" cy="59" rx="33" ry="38" fill="none" stroke="var(--paddle-trim)" stroke-width="1.4" opacity="0.7"/>
      <path d="M54 104 h12 l5 52 a11 11 0 0 1 -22 0 z" fill="var(--paddle)" stroke="var(--paddle-trim)" stroke-width="3"/>
      <path d="M44 46 c10 -14 30 -16 38 -4" fill="none" stroke="var(--paddle-trim)" stroke-width="1.2" opacity="0.45"/>
      <text x="60" y="59" text-anchor="middle" dominant-baseline="middle" fill="var(--paddle-trim)" font-family="'Courier Prime','Courier New',monospace" font-weight="700" font-size="${number && String(number).length > 3 ? 17 : 23}">${number}</text>
    </g>
  </svg>`;
}

/** A paddle element. Pass a number to print it on the face. */
export function paddle({ number = "", tilt = 0, tone = null, size = 132, className = "" } = {}) {
  const el = h("span", { class: `paddle ${className}`.trim() });
  el.innerHTML = paddleSvg({ number, tilt, tone, size });
  return el;
}

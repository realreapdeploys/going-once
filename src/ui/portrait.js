// Going Once: the rival portrait. The SVG markup is trusted static content from roster.js.

import { ROSTER, getRivalById } from "../roster.js";

export function portraitMarkup(id) {
  const rival = getRivalById(id);
  if (!rival) return "";
  return `<svg viewBox="0 0 120 140" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${rival.portrait}</svg>`;
}

export function portraitLabel(id) {
  const rival = getRivalById(id);
  if (!rival) return "Rival portrait";
  return `Portrait of ${rival.name}, ${rival.title.toLowerCase()}`;
}

export { ROSTER };

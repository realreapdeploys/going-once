// Going Once: boot, the dev date override and the midnight rollover watcher.

import "@fontsource/im-fell-english/latin-400.css";
import "@fontsource/im-fell-english/latin-400-italic.css";
import "@fontsource/libre-caslon-text/latin-400.css";
import "@fontsource/libre-caslon-text/latin-700.css";
import "@fontsource/courier-prime/latin-400.css";
import "@fontsource/courier-prime/latin-700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/paper.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/motion.css";

import { isValidDateString } from "./engine.js";
import { getRivalById } from "./roster.js";
import { startApp } from "./ui/app.js";
import { setRivalLookup } from "./ui/results.js";

function devDateFromLocation() {
  if (!import.meta.env.DEV) return null;
  const param = new URLSearchParams(location.search).get("date");
  return param && isValidDateString(param) ? param : null;
}

function banner(text) {
  const el = document.createElement("div");
  el.className = "dev-banner";
  el.textContent = text;
  document.body.prepend(el);
}

function boot() {
  const root = document.getElementById("app");
  if (!root) return;
  setRivalLookup(getRivalById);
  const devDate = devDateFromLocation();
  if (devDate) banner(`Dev date: ${devDate} · storage key goingonce:dev`);
  startApp({ root, devDate });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

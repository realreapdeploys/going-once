// Going Once: a tiny element helper. No innerHTML with data, ever.

/**
 * h("div", { class: "plate", onclick: fn, dataset: { lot: 3 } }, "text", childNode)
 * Attributes: class, id, type, value, etc. Keys starting with "on" become listeners.
 * `text` sets textContent (never parsed as HTML). `html` is only for trusted static markup.
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = String(value);
      else if (key === "html") el.innerHTML = value;
      else if (key === "dataset") {
        for (const [dk, dv] of Object.entries(value)) {
          if (dv !== null && dv !== undefined) el.dataset[dk] = String(dv);
        }
      } else if (key === "style" && typeof value === "object") {
        for (const [sk, sv] of Object.entries(value)) el.style.setProperty(sk, String(sv));
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2), value);
      } else if (key === "value" && "value" in el) {
        el.value = value;
      } else if (key === "checked" || key === "disabled" || key === "selected") {
        if (value) el.setAttribute(key, "");
      } else {
        el.setAttribute(key, value === true ? "" : String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function mount(parent, ...children) {
  clear(parent);
  append(parent, children);
  return parent;
}

/** Join class names, dropping falsy ones. */
export function cx(...names) {
  return names.filter(Boolean).join(" ");
}

/** A small fixed rotation from a lot index, so a stamp never changes between renders. */
export function tiltFor(seed, spread = 4) {
  const table = [-4.5, 2.5, -2, 3.5, -3, 1.5, 4, -1.5];
  const n = Math.abs(Math.trunc(Number(seed) || 0));
  return table[n % table.length] * (spread / 4);
}

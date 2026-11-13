// Going Once: modals. How to play, Your ledger, and a plain confirm. One at a time, focus trapped.

import { RANKS, PADDLES, rankFor, rankProgress, unlockedPaddles, formatChips, displayStreak } from "../progress.js";
import { formatChips as chips, longDate, ordinal } from "../format.js";
import { h, cx, mount } from "./dom.js";
import { paddle, paddleSvg } from "./paddle.js";

let current = null;
let openerEl = null;

export function isModalOpen() {
  return Boolean(current);
}

export function closeModal() {
  if (!current) return;
  const { overlay, previousFocus } = current;
  document.removeEventListener("keydown", onKeydown, true);
  overlay.remove();
  current = null;
  const target = openerEl || previousFocus;
  openerEl = null;
  if (target && typeof target.focus === "function" && document.body.contains(target)) target.focus();
}

function onKeydown(event) {
  if (!current) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key === "Tab") {
    const focusables = current.overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function open({ title, body, opener, labelledBy }) {
  if (current) closeModal();
  openerEl = opener || null;
  const previousFocus = document.activeElement;
  const heading = h("h2", { class: "modal__title", id: labelledBy }, title);
  const dialog = h(
    "div",
    { class: "modal plate", role: "dialog", "aria-modal": "true", "aria-labelledby": labelledBy },
    h(
      "div",
      { class: "modal__head" },
      heading,
      h("button", { class: "modal__close", type: "button", "aria-label": "Close", onclick: closeModal }, "×"),
    ),
    h("div", { class: "modal__body" }, body),
  );
  const overlay = h("div", { class: "overlay", onclick: (e) => e.target === overlay && closeModal() }, dialog);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", onKeydown, true);
  current = { overlay, previousFocus };
  requestAnimationFrame(() => {
    const focusables = dialog.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    (focusables[0] || dialog).focus();
  });
  return dialog;
}

/* ------------------------------------------------------------------ how to play */

export function openHowToPlay(app, opener) {
  const steps = [
    ["Five lots, one sale.", "Every lot shows only its category and how hard it is: Common, Uncommon or Rare. The question stays sealed until the lot is sold."],
    ["Bid in secret.", "You start with 1,000 chips. On lots one to four you may bid up to half your purse: the house limit. Everyone bids at once, and the highest bid of 5 or more takes the lot."],
    ["The winner must answer.", "Right: they gain their bid. Wrong: they lose it, and the runner-up may steal the lot. A steal is answered with the failed winner's choice struck out. Right pays your bid plus half theirs; wrong costs your bid."],
    ["Read the room.", "Three rivals bid against you. Each has strong and weak categories, and each shows a tell before every lot. Tells are a hint, not a promise: some of them bluff."],
    ["Then the Hammer.", "Lot five is the Hammer. Everyone wagers at least a quarter of their purse and answers the same question. Right gains the wager, wrong loses it. Your final chips are your score."],
  ];

  const body = h(
    "div",
    { class: "howto" },
    h(
      "ol",
      { class: "howto__steps" },
      steps.map(([title, text], i) =>
        h(
          "li",
          { class: "howto__step" },
          h("p", { class: "howto__num num", "aria-hidden": "true" }, String(i + 1)),
          h("h3", { class: "howto__head" }, title),
          h("p", { class: "howto__text" }, text),
        ),
      ),
    ),
    h(
      "div",
      { class: "howto__example plate plate--paper" },
      h("p", { class: "label" }, "A worked example"),
      h(
        "p",
        { class: "howto__example-text" },
        "A Rare Science lot comes up. Dex Marlowe looks keen, so you bid 200 of your 1,000 chips and he bids 300. He takes it and answers wrongly, so his 300 is forfeit and you are next in line. You steal: the wrong option is struck out and you answer rightly, so you collect your 200 plus half of his 300, which is 150. Your purse is now 1,350 and his is 700.",
      ),
      h("p", { class: "howto__example-text" }, "Had you answered wrongly, you would have lost your own 200 and nothing else. Had you let it go, nothing would have changed."),
    ),
    h(
      "div",
      { class: "howto__rules" },
      h("p", { class: "label" }, "The small print"),
      h(
        "ul",
        { class: "howto__list" },
        h("li", null, "Everything is a multiple of 5. A purse never goes below zero."),
        h("li", null, "Twenty seconds to answer or steal. Running out of time counts as wrong."),
        h("li", null, "The highest bid wins; ties are broken by the house. If nobody bids, the lot is passed in."),
        h("li", null, "A new sale opens at midnight, local time. Everyone plays the same one."),
      ),
    ),
  );

  return open({ title: "How to play", body, opener, labelledBy: "howto-title" });
}

/* ------------------------------------------------------------------ ledger */

export function openLedger(app, opener) {
  const { profile } = app;
  const rank = rankFor(profile.reputation);
  const progress = rankProgress(profile.reputation);
  const unlocked = unlockedPaddles(profile.reputation);
  const history = profile.history.slice(-10).reverse();
  const streak = displayStreak(profile, app.today);
  const avg = profile.played ? Math.round(profile.totalChips / profile.played) : 0;

  const picker = h(
    "div",
    { class: "paddles", role: "radiogroup", "aria-label": "Your paddle" },
    PADDLES.map((p) => {
      const locked = !unlocked.some((u) => u.id === p.id);
      const selected = profile.paddle === p.id;
      const unlockRank = RANKS[p.rankIndex];
      return h(
        "button",
        {
          class: cx("paddlechoice", selected && "paddlechoice--on", locked && "paddlechoice--locked"),
          type: "button",
          role: "radio",
          "aria-checked": String(selected),
          "aria-disabled": locked ? "true" : null,
          disabled: locked || null,
          "aria-label": locked ? `${p.name}, unlocks at ${unlockRank.title}` : `${p.name}${selected ? ", selected" : ""}`,
          onclick: () => {
            app.profile = { ...app.profile, paddle: p.id };
            app.persistProfile();
            app.applyPaddle();
            closeModal();
            app.render();
          },
        },
        h("span", { class: "paddlechoice__art", html: paddleSvg({ tone: p, size: 74, tilt: -4 }) }),
        h("span", { class: "paddlechoice__name" }, p.name),
        locked ? h("span", { class: "paddlechoice__lock" }, `Unlocks at ${unlockRank.title}`) : null,
      );
    }),
  );

  const body = h(
    "div",
    { class: "ledger-modal" },
    h(
      "div",
      { class: "ledger-modal__rank" },
      h("p", { class: "label" }, "Standing"),
      h("p", { class: "ledger-modal__title" }, rank.title),
      h("div", { class: "bar" }, h("span", { class: "bar__fill", style: { "--fill": String(progress.fraction) } })),
      h(
        "p",
        { class: "ledger-modal__hint" },
        progress.next
          ? `${chips(profile.reputation)} reputation. ${chips(progress.next.at - profile.reputation)} to ${progress.next.title}.`
          : `${chips(profile.reputation)} reputation. Top of the room.`,
      ),
    ),
    h("h3", { class: "ledger-modal__head" }, "Your paddle"),
    picker,
    h("h3", { class: "ledger-modal__head" }, "On the books"),
    h(
      "dl",
      { class: "stats" },
      stat("Sales played", String(profile.played)),
      stat("First places", String(profile.firstPlaces)),
      stat("Best chips", chips(profile.bestChips)),
      stat("Average chips", chips(avg)),
      stat("Streak", String(streak)),
      stat("Best streak", String(profile.bestStreak)),
    ),
    h("h3", { class: "ledger-modal__head" }, "The last ten sales"),
    history.length
      ? h(
          "table",
          { class: "ledger" },
          h("thead", null, h("tr", null, h("th", { scope: "col" }, "Sale"), h("th", { scope: "col", class: "num" }, "Chips"), h("th", { scope: "col", class: "num" }, "Rank"))),
          h(
            "tbody",
            null,
            history.map((entry) =>
              h(
                "tr",
                null,
                h("th", { scope: "row", class: "ledger-modal__date" }, longDate(entry.date)),
                h("td", { class: "num" }, chips(entry.chips)),
                h("td", { class: "num" }, ordinal(entry.rank)),
              ),
            ),
          ),
        )
      : h("p", { class: "ledger-modal__empty italic" }, "Nothing on the books yet."),
  );

  return open({ title: "Your ledger", body, opener, labelledBy: "ledger-title" });
}

function stat(label, value) {
  return h("div", null, h("dt", null, label), h("dd", null, value));
}

/* ------------------------------------------------------------------ confirm */

export function openConfirm({ title, text, confirmLabel, onConfirm, opener }) {
  const body = h(
    "div",
    { class: "confirm" },
    h("p", null, text),
    h(
      "div",
      { class: "confirm__actions" },
      h(
        "button",
        {
          class: "btn btn--primary",
          type: "button",
          onclick: () => {
            closeModal();
            onConfirm();
          },
        },
        confirmLabel,
      ),
      h("button", { class: "btn", type: "button", onclick: closeModal }, "Leave it"),
    ),
  );
  return open({ title, body, opener, labelledBy: "confirm-title" });
}

// Going Once: the cover. The catalogue front page: wordmark, sale line, tonight's bidders, and the
// one button that matters.

import { saleNumber, createGame, rivalTell } from "../engine.js";
import { getRivalById, describeSkills } from "../roster.js";
import { displayStreak, rankFor, rankProgress } from "../progress.js";
import { formatChips, longDate, formatCountdown, msUntilMidnight, surnameOf } from "../format.js";
import { h, cx } from "./dom.js";
import { portraitMarkup, portraitLabel } from "./portrait.js";
import * as anim from "./anim.js";

function soundIcon(on) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M4 9h3l5-4v14l-5-4H4z"/>
    ${on ? '<path d="M16 8.5a5 5 0 0 1 0 7"/><path d="M18.6 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M16.5 9.5l5 5"/><path d="M21.5 9.5l-5 5"/>'}
  </svg>`;
}

export function soundToggle(profile, onToggle) {
  return h(
    "button",
    {
      class: "icon-btn",
      type: "button",
      "aria-pressed": profile.soundOn ? "true" : "false",
      "aria-label": profile.soundOn ? "Sound on" : "Sound off",
      onclick: onToggle,
    },
    h("span", { class: "icon-btn__icon", html: soundIcon(profile.soundOn) }),
    profile.soundOn ? "Sound on" : "Sound off",
  );
}

/** One rival card. `state` adds the bank and, with `tell`, the body language line. */
export function rivalCard(id, { state = null, tell = false, compact = false } = {}) {
  const rival = getRivalById(id);
  if (!rival) return null;
  const { strong, weak } = describeSkills(rival, Object.keys(rival.skills));
  const bank = state ? state.banks[id] : null;
  const line = tell && state ? rivalTell(state, id) : null;
  const surname = surnameOf(rival.name);

  return h(
    "article",
    { class: cx("rival", compact && "rival--compact"), "data-rival": id },
    h(
      "div",
      { class: "rival__portrait" },
      h("span", { class: "rival__svg", role: "img", "aria-label": portraitLabel(id), html: portraitMarkup(id) }),
    ),
    h(
      "div",
      { class: "rival__body" },
      h("h3", { class: "rival__surname" }, surname),
      compact ? null : h("p", { class: "rival__name" }, rival.name),
      compact ? null : h("p", { class: "rival__title italic" }, rival.title),
      bank !== null
        ? h(
            "p",
            { class: "rival__bank" },
            h(
              "span",
              { class: "chip" },
              h("span", { class: "chip__disc", "aria-hidden": "true" }),
              h("span", { class: "chip__value", "data-bank": id }, formatChips(bank)),
              h("span", { class: "visually-hidden" }, " chips"),
            ),
          )
        : null,
      compact ? null : h("p", { class: "rival__tagline" }, rival.tagline),
      compact
        ? null
        : h(
            "div",
            { class: "ledger-row" },
            h(
              "p",
              { class: "ledger-row__item" },
              h("span", { class: "label" }, "Strong"),
              h("span", { class: "ledger-row__list" }, strong.length ? strong.join(", ") : "Nothing in particular"),
            ),
            h(
              "p",
              { class: "ledger-row__item" },
              h("span", { class: "label" }, "Weak"),
              h("span", { class: "ledger-row__list" }, weak.length ? weak.join(", ") : "Nothing in particular"),
            ),
          ),
      line ? h("p", { class: "rival__tell note" }, line.line) : null,
    ),
  );
}

export function coverScreen(app, handlers) {
  const { profile } = app;
  const today = app.today;
  const saleNo = saleNumber(today);
  const finished = Boolean(app.state && app.state.phase === "finished") || profile.history.some((e) => e.date === today);
  const inProgress = Boolean(app.state && app.state.phase !== "finished");
  const streak = displayStreak(profile, today);
  const rank = rankFor(profile.reputation);
  const progress = rankProgress(profile.reputation);
  const rivals = app.state ? app.state.rivals : createGame(today).rivals;

  const header = h(
    "header",
    { class: "cover__head" },
    h("p", { class: "label cover__kicker" }, "The daily auction"),
    h("h1", { class: "wordmark" }, "Going Once"),
    h("p", { class: "cover__tagline italic" }, "The daily auction of general knowledge"),
    h("p", { class: "cover__sale num" }, `Sale No. ${saleNo}, ${longDate(today)}`),
  );

  const buttonLabel = finished ? "See today's result" : inProgress ? "Resume the sale" : "Take a paddle";

  const cta = h(
    "div",
    { class: "cover__cta" },
    h("button", { class: "btn btn--primary btn--big", type: "button", onclick: handlers.onStart, "data-action": "start" }, buttonLabel),
    finished
      ? h(
          "p",
          { class: "cover__next" },
          "Next sale opens in ",
          h("span", { class: "num", "data-countdown": "" }, formatCountdown(msUntilMidnight())),
        )
      : null,
  );

  const bidders = h(
    "section",
    { class: "cover__bidders", "aria-labelledby": "bidders-title" },
    h("div", { class: "rule-diamond", role: "presentation" }),
    h("h2", { id: "bidders-title", class: "section-title" }, "Tonight's bidders"),
    h("div", { class: "rivals" }, rivals.map((id) => rivalCard(id))),
  );

  const storageNote = app.persistent
    ? null
    : h("p", { class: "cover__quiet", role: "status" }, "The house cannot save your progress on this device.");

  const footer = h(
    "footer",
    { class: "cover__foot" },
    h("div", { class: "rule-diamond", role: "presentation" }),
    h(
      "div",
      { class: "footgrid" },
      h(
        "div",
        { class: "footgrid__item" },
        h("p", { class: "label" }, "Streak"),
        h("p", { class: "footgrid__value num" }, streak === 1 ? "1 sale" : `${streak} sales`),
      ),
      h(
        "div",
        { class: "footgrid__item footgrid__item--rank" },
        h("p", { class: "label" }, "Standing"),
        h("p", { class: "footgrid__value" }, rank.title, h("span", { class: "footgrid__rep num" }, ` ${formatChips(profile.reputation)}`)),
        h("div", { class: "bar bar--thin", role: "presentation" }, h("span", { class: "bar__fill", style: { "--fill": String(progress.fraction) } })),
        h(
          "p",
          { class: "footgrid__hint" },
          progress.next ? `${formatChips(progress.next.at - profile.reputation)} to ${progress.next.title}` : "Top of the room",
        ),
      ),
      h(
        "div",
        { class: "footgrid__actions" },
        h("button", { class: "btn btn--ghost", type: "button", onclick: (e) => handlers.onHowTo(e.currentTarget) }, "How to play"),
        h("button", { class: "btn btn--ghost", type: "button", onclick: (e) => handlers.onLedger(e.currentTarget) }, "Your ledger"),
        soundToggle(profile, handlers.onSound),
      ),
    ),
    storageNote,
    h("p", { class: "cover__fine" }, "Five lots. Three rivals. One thousand chips. Everyone gets the same sale."),
  );

  const body = h("main", { id: "main", class: "sheet cover" }, header, cta, bidders, footer);

  return {
    body,
    after: () => {
      anim.staggerIn(body, ":scope > header, :scope > .cover__cta, :scope > section, :scope > footer");
    },
  };
}


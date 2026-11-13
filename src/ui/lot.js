// Going Once: the lot screen. Header (tags, purse), the lot plate, the room, the paddle, and the
// answering, stealing and resolved panels. All results come from the engine state.

import {
  currentLot,
  bidBounds,
  stealBonus,
  hammerMinimum,
  maxBid,
  outcomeKind,
  rivalTell,
  ANSWER_SECONDS,
  LOT_COUNT,
  STEP,
} from "../engine.js";
import { getRivalById as rivalById } from "../roster.js";
import { formatChips, ordinal, signedChips, deltaLabel, difficultyLabel, surnameOf } from "../format.js";
import { snapBid, quickPicks, stepBid } from "../bidmath.js";
import { remainingMs, ANSWER_MS } from "../timing.js";
import { h, cx, tiltFor, mount } from "./dom.js";
import { rivalCard, soundToggle } from "./cover.js";
import { paddle } from "./paddle.js";
import * as anim from "./anim.js";
import * as sound from "./sound.js";

const LETTERS = ["A", "B", "C", "D"];

function difficultyDots(level) {
  return h(
    "span",
    { class: "dots", "aria-hidden": "true" },
    [1, 2, 3].map((i) => h("span", { class: cx("dot", i <= level && "dot--on") })),
  );
}

function stamp(text, { gain = false, seed = 0, small = false, className = "" } = {}) {
  return h(
    "span",
    {
      class: cx("stamp", gain && "stamp--gain", small && "stamp--small", className),
      style: { "--tilt": `${tiltFor(seed, 4)}deg` },
    },
    text,
  );
}

function tagStrip(state) {
  const tags = [];
  for (let i = 0; i < state.lots.length; i++) {
    const lot = state.lots[i];
    const record = state.history[i];
    const current = i === state.lotIndex && state.phase !== "finished";
    const kind = record ? outcomeKind(record) : null;
    const glyph = { won: "■", stole: "◆", lost: "□", pass: "·" }[kind] || null;
    tags.push(
      h(
        "li",
        {
          class: cx("tag", current && "tag--current", kind && `tag--${kind}`, lot.isHammer && "tag--hammer"),
          "aria-label": `Lot ${i + 1}${record ? `, ${kind}` : current ? ", current" : ""}${lot.isHammer ? ", the Hammer" : ""}`,
          "aria-current": current ? "step" : null,
        },
        h("span", { "aria-hidden": "true" }, glyph || String(i + 1)),
      ),
    );
  }
  return h("ol", { class: "tags", "aria-label": "The seven lots" }, tags);
}

function purseBlock(app) {
  return h(
    "div",
    { class: "purse", "data-purse": "" },
    h(
      "span",
      { class: "chip chip--big" },
      h("span", { class: "chip__disc", "aria-hidden": "true" }),
      h("span", { class: "chip__value", "data-purse-value": "" }, formatChips(app.state.banks.player)),
      h("span", { class: "visually-hidden" }, " chips in your purse"),
    ),
    h("span", { class: "purse__blot", "data-purse-blot": "", "aria-hidden": "true" }),
  );
}

function lotPlate(state) {
  const lot = currentLot(state);
  const tilt = tiltFor(state.lotIndex, 4);
  return h(
    "div",
    { class: "lotplate", "data-lotplate": "", style: { "--tilt": `${tilt}deg` } },
    h(
      "div",
      { class: "lotplate__top" },
      h("p", { class: "lotplate__no" }, h("span", { class: "italic" }, "Lot"), h("span", { class: "num lotplate__num" }, ` ${state.lotIndex + 1}`)),
      h("p", { class: "lotplate__cat label" }, lot.category),
    ),
    h(
      "p",
      { class: "lotplate__diff" },
      h("span", { class: "label" }, lot.isHammer ? "The Hammer" : difficultyLabel(lot.difficulty)),
      difficultyDots(lot.difficulty),
    ),
    h(
      "div",
      { class: "seal", "data-seal": "" },
      h("span", { class: "seal__text label" }, lot.isHammer ? "Everyone answers" : "Sealed until the hammer falls"),
    ),
    lot.isHammer
      ? h("p", { class: "lotplate__note note" }, "The last lot of the day. Everyone wagers and everyone answers.")
      : h("p", { class: "lotplate__note note" }, "You are bidding on the category, not the question."),
  );
}

function questionPanel(state, app, handlers) {
  const lot = currentLot(state);
  const record = state.history[state.lotIndex];
  const showQuestion = app.state.phase === "answering" || (app.stealStage && state.phase === "stealing") || Boolean(record);
  if (!showQuestion) return null;

  const phase = state.phase;
  const choosing = phase === "answering" || (phase === "stealing" && app.stealStage);
  const eliminated = phase === "stealing" && state.current ? state.current.winnerPick : null;
  const correct = record ? lot.answerIndex : null;

  const list = h(
    "ul",
    {
      class: "options",
      role: choosing ? "radiogroup" : null,
      "aria-label": choosing ? "The four answers" : null,
      "data-options": "",
    },
    lot.options.map((text, i) => {
      const isStruck = eliminated !== null && i === eliminated;
      const isCorrect = correct !== null && i === correct;
      return h(
        "li",
        null,
        h(
          "button",
          {
            class: cx("option", isStruck && "option--struck", isCorrect && "option--right"),
            type: "button",
            role: choosing ? "radio" : null,
            "aria-checked": choosing ? String(app.selection === i) : null,
            "aria-disabled": choosing && isStruck ? "true" : null,
            disabled: choosing && isStruck ? true : null,
            tabindex: choosing && (app.selection === null ? i === 0 : app.selection === i) ? "0" : choosing ? "-1" : null,
            "data-option": String(i),
            onclick: () => choosing && !isStruck && handlers.onSelect(i),
          },
          h("span", { class: "option__key", "aria-hidden": "true" }, LETTERS[i]),
          h("span", { class: "option__text" }, text),
          isStruck ? h("span", { class: "option__mark" }, "ruled out") : null,
        ),
      );
    }),
  );

  const circle = h("span", { class: "inkcircle", "data-inkcircle": "", "aria-hidden": "true" });

  return h(
    "div",
    { class: "qpanel", "data-qpanel": "" },
    h("p", { class: "qpanel__question", "data-question": "" }, lot.question),
    list,
    choosing ? h("p", { class: "qpanel__hint" }, "Keys 1 to 4 or A to D choose. Enter locks it in.") : null,
  );
}

function timerBar() {
  return h(
    "div",
    { class: "timer", "data-timer": "", role: "presentation" },
    h("div", { class: "timer__bar" }, h("span", { class: "timer__fill", "data-timer-fill": "" })),
    h("p", { class: "timer__count num", "data-timer-count": "", "aria-hidden": "true" }, String(ANSWER_SECONDS)),
  );
}

function bidControl(app, handlers) {
  const state = app.state;
  const lot = currentLot(state);
  const bounds = bidBounds(state);
  const bank = state.banks.player;
  const disabled = state.phase !== "bidding";
  const bid = app.bid;

  const face = paddle({ number: formatChips(bid), tilt: -6 + Math.min(8, (bid / Math.max(1, bounds.max)) * 14), size: 128 });
  face.classList.add("paddle--control");

  if (bank <= 0) {
    return h(
      "div",
      { class: "bidcontrol", "data-bidcontrol": "" },
      h("div", { class: "bidcontrol__row" }, face),
      h("p", { class: "bidcontrol__empty" }, "You have no chips to bid."),
      h(
        "button",
        { class: "btn btn--primary btn--wide", type: "button", "data-confirm": "", onclick: handlers.onConfirmBid, disabled: disabled || null },
        lot.isHammer ? "Raise the Hammer" : "Sit this one out",
      ),
    );
  }

  const picks = quickPicks(bounds, lot.isHammer);
  const range = h("input", {
    class: "ruler",
    type: "range",
    min: String(bounds.min),
    max: String(bounds.max),
    step: String(STEP),
    value: String(bid),
    "data-range": "",
    "aria-label": lot.isHammer ? "Your wager" : "Your bid",
    oninput: (e) => handlers.onBidChange(snapBid(e.target.value, bounds)),
  });
  const number = h("input", {
    class: "field",
    type: "text",
    inputmode: "numeric",
    autocomplete: "off",
    spellcheck: "false",
    value: String(bid),
    "data-number": "",
    "aria-label": lot.isHammer ? "Wager in chips" : "Bid in chips",
    onblur: (e) => handlers.onBidChange(snapBid(e.target.value, bounds)),
    onkeydown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handlers.onBidChange(snapBid(e.target.value, bounds));
        handlers.onConfirmBid();
      }
    },
  });

  const hint = lot.isHammer
    ? `The Hammer: wager at least ${formatChips(bounds.min)}, up to everything.`
    : "House limit: half your purse.";

  const label = bid > 0 ? "Raise paddle" : "Sit this one out";

  const control = h(
    "div",
    { class: "bidcontrol", "data-bidcontrol": "" },
    h(
      "div",
      { class: "bidcontrol__row" },
      face,
      h(
        "div",
        { class: "bidcontrol__fields" },
        h(
          "div",
          { class: "bidcontrol__numrow" },
          h("label", { class: "label", for: null }, lot.isHammer ? "Wager" : "Your bid"),
          number,
        ),
        range,
        h(
          "div",
          { class: "quickpicks", role: "group", "aria-label": "Quick picks" },
          picks.map((pick) =>
            h(
              "button",
              {
                class: cx("quickpick", bid === pick.amount && "quickpick--on"),
                type: "button",
                "data-pick": pick.id,
                onclick: () => handlers.onBidChange(pick.amount),
              },
              pick.label,
            ),
          ),
        ),
      ),
    ),
    h("p", { class: "bidcontrol__hint" }, hint),
    h(
      "button",
      {
        class: "btn btn--primary btn--wide btn--big",
        type: "button",
        "data-confirm": "",
        onclick: handlers.onConfirmBid,
        disabled: disabled || null,
      },
      lot.isHammer ? "Raise the Hammer" : label,
    ),
  );

  return control;
}

function stealPanel(app, handlers) {
  const state = app.state;
  const cur = state.current;
  const winner = rivalById(cur.winnerId);
  const bid = cur.bids[cur.winnerId];
  const myBid = cur.bids.player;
  const bonus = stealBonus(bid);
  const min = hammerMinimum(0);

  if (!app.stealStage) {
    return h(
      "div",
      { class: "steal plate plate--paper", "data-steal": "" },
      h("p", { class: "label" }, "The lot is loose"),
      h("h2", { class: "steal__head" }, `${winner ? surnameOf(winner.name) : "The rival"} answered wrongly.`),
      h("p", { class: "steal__line" }, `${winner ? winner.name : "The rival"} forfeits ${formatChips(bid)} chips and the lot is up for grabs.`),
      h(
        "p",
        { class: "steal__terms" },
        `Steal it? You have ${formatChips(myBid)} behind this lot. Right pays ${formatChips(myBid + bonus)}. Wrong costs ${formatChips(myBid)}.`,
      ),
      h(
        "div",
        { class: "steal__actions" },
        h("button", { class: "btn btn--primary", type: "button", "data-steal-go": "", onclick: handlers.onSteal }, "Steal it"),
        h("button", { class: "btn", type: "button", "data-steal-no": "", onclick: handlers.onDecline }, "Let it go"),
      ),
    );
  }

  return h(
    "div",
    { class: "steal plate plate--paper", "data-steal": "" },
    h("p", { class: "label" }, "Your steal"),
    h("p", { class: "steal__line" }, `Right pays ${formatChips(myBid + bonus)}. Wrong costs ${formatChips(myBid)}.`),
  );
}


function verdictPanel(state) {
  const record = state.history[state.lotIndex];
  if (!record) return null;
  const surname = (id) => {
    const rival = rivalById(id);
    return rival ? surnameOf(rival.name) : id;
  };
  let title, sub, tone = "flat", stampText = null;
  if (record.isHammer) {
    const r = record.results && record.results.player;
    const youRight = Boolean(r && r.correct);
    title = youRight ? "Right, on the Hammer." : r ? "Wrong, on the Hammer." : "The Hammer falls.";
    sub = youRight ? "Your stake comes back to you, doubled." : "Your stake is forfeit to the saleroom.";
    sub = youRight ? `Right answer. ${formatChips(r.wager)} chips on the table.` : r ? `Wrong answer. ${formatChips(r.wager)} chips, gone.` : sub;
    tone = youRight ? "good" : "bad";
    stampText = youRight ? "Right" : "Wrong";
  } else if (record.passedIn) {
    title = "Passed in.";
    sub = record.steal && record.steal.declined ? "The steal was waved off. The lot stays with the saleroom." : "Nobody raised a hand. The lot stays with the saleroom.";
    stampText = "Passed in";
  } else if (record.steal && record.steal.by) {
    const byPlayer = record.steal.by === "player";
    if (record.steal.correct) {
      title = byPlayer ? "Snatched, and rightly." : `${surname(record.steal.by)} snatched it.`;
      sub = byPlayer ? "A right answer, and the lot comes home with you." : `${surname(record.steal.by)} took it on a right answer.`;
      tone = byPlayer ? "good" : "bad";
      stampText = "Sold";
    } else {
      title = byPlayer ? "Wrong. The stake is forfeit." : `${surname(record.steal.by)} went wrong.`;
      sub = byPlayer ? "The stake goes to the saleroom." : `${surname(record.steal.by)} said it wrongly.`;
      tone = byPlayer ? "bad" : "flat";
      stampText = "Forfeit";
    }
  } else if (record.winnerId === "player") {
    title = record.winnerCorrect ? "The lot is yours." : "Wrong, with the lot.";
    sub = record.winnerCorrect ? `Answered right, for ${formatChips(record.bids.player)} chips.` : `Answered wrong. ${formatChips(record.bids.player)} chips, forfeit.`;
    tone = record.winnerCorrect ? "good" : "bad";
    stampText = record.winnerCorrect ? "Sold" : "Forfeit";
  } else if (record.winnerId) {
    title = `Sold, to ${surname(record.winnerId)}.`;
    sub = record.winnerCorrect ? `Answered right, for ${formatChips(record.bids[record.winnerId])} chips.` : `Answered wrong. ${formatChips(record.bids[record.winnerId])} chips, forfeit.`;
    tone = record.winnerCorrect ? "bad" : "flat";
    stampText = record.winnerCorrect ? "Sold" : "Forfeit";
  } else {
    title = "Passed in.";
    sub = "Nobody raised a hand. The lot stays with the saleroom.";
    stampText = "Passed in";
  }
  return h(
    "div",
    { class: cx("verdict plate plate--paper", tone === "good" && "verdict--good", tone === "bad" && "verdict--bad"), "data-verdict": "", role: "status" },
    stampText ? h("span", { class: "verdict__stamp", "data-verdict-stamp": "" }, stamp(stampText, { gain: tone === "good", seed: state.lotIndex })) : null,
    h("p", { class: "verdict__title" }, title),
    h("p", { class: "verdict__sub" }, sub),
  );
}

function ledgerPanel(state, app) {
  const record = state.history[state.lotIndex];
  if (!record) return null;
  const ids = ["player", ...state.rivals];
  const rows = ids.map((id) => {
    const rival = id === "player" ? null : rivalById(id);
    const name = rival ? rival.name : "You";
    let result;
    if (record.isHammer) {
      const r = record.results[id];
      result = r ? (r.correct ? "Right" : "Wrong") : "—";
    } else if (record.passedIn) result = "Passed in";
    else if (id === record.winnerId) result = record.winnerCorrect ? "Won the lot" : "Forfeited";
    else if (record.steal && record.steal.by === id) result = record.steal.declined ? "Let it go" : record.steal.correct ? "Snatched" : "Forfeited the steal";
    else if (id === record.runnerUpId) result = "Next in line";
    else result = "—";
    const delta = record.deltas[id];
    return h(
      "tr",
      { class: id === "player" ? "row--you" : null },
      h("th", { scope: "row" }, name),
      h("td", { class: "num" }, record.isHammer ? formatChips(record.bids[id]) : formatChips(record.bids[id])),
      h("td", null, result),
      h(
        "td",
        { class: cx("num", "delta", delta > 0 ? "delta--gain" : delta < 0 ? "delta--loss" : "delta--none") },
        h("span", { "aria-hidden": "true" }, signedChips(delta)),
        h("span", { class: "visually-hidden" }, deltaLabel(delta)),
      ),
      h("td", { class: "num" }, formatChips(record.banksAfter[id])),
    );
  });

  return h(
    "div",
    { class: "lotledger plate", "data-lotledger": "" },
    h("div", { class: "plate__head" }, h("h2", { class: "lotledger__title" }, "The lot, to the ledger"), record.passedIn ? stamp("Passed in", { seed: state.lotIndex }) : null),
    h(
      "table",
      { class: "ledger" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", { scope: "col" }, "Bidder"),
          h("th", { scope: "col", class: "num" }, record.isHammer ? "Wager" : "Bid"),
          h("th", { scope: "col" }, "Result"),
          h("th", { scope: "col", class: "num" }, "Chips"),
          h("th", { scope: "col", class: "num" }, "Purse"),
        ),
      ),
      h("tbody", null, rows),
    ),
  );
}

function lotReview(state, app, handlers) {
  const record = state.history[state.lotIndex];
  if (!record) return null;
  const lot = state.lots[state.lotIndex];
  const openByDefault = Boolean(record.passedIn) || record.winnerId !== "player" || record.isHammer;
  const details = h("details", { class: "review", "data-review": "", open: openByDefault ? "" : null });
  details.appendChild(h("summary", { class: "review__summary" }, "The lot, for the record"));
  const body = h(
    "div",
    { class: "review__body" },
    h("p", { class: "review__question" }, lot.question),
    h(
      "ul",
      { class: "review__options" },
      lot.options.map((text, i) =>
        h(
          "li",
          { class: cx("review__option", i === lot.answerIndex && "review__option--right") },
          h("span", { class: "review__key", "aria-hidden": "true" }, LETTERS[i]),
          h("span", null, text),
          i === lot.answerIndex ? h("span", { class: "review__tag" }, " the answer") : null,
        ),
      ),
    ),
    h(
      "ul",
      { class: "review__picks" },
      state.rivals.map((id) => {
        const rival = rivalById(id);
        const r = record.isHammer ? record.results[id] : null;
        const pick = record.isHammer ? r && r.pick : id === record.winnerId ? record.winnerPick : record.steal && record.steal.by === id ? record.steal.pick : null;
        const text = pick === null || pick === undefined ? "did not answer" : pick === lot.answerIndex ? `said ${LETTERS[pick]}, rightly` : `said ${LETTERS[pick]}`;
        return h("li", null, h("span", { class: "review__who" }, surnameOf(rival.name)), ` ${text}`);
      }),
    ),
  );
  details.appendChild(body);
  return details;
}

function roomPanel(state, app, handlers) {
  return h(
    "aside",
    { class: "room", "aria-labelledby": "room-title" },
    h("h2", { id: "room-title", class: "room__title label" }, "The room"),
    h(
      "div",
      { class: "room__cards" },
      state.rivals.map((id) => rivalCard(id, { state, tell: state.phase === "bidding" })),
    ),
  );
}

function auctioneerLine(text, { dataAttr = "" } = {}) {
  return h("p", { class: "auctioneer", "data-auctioneer": "", "aria-hidden": "true" }, text);
}

export function lotScreen(app, handlers) {
  const state = app.state;
  const lot = currentLot(state);
  const phase = state.phase;
  const record = state.history[state.lotIndex];

  const header = h(
    "header",
    { class: "gamehead" },
    h(
      "div",
      { class: "gamehead__left" },
      h("p", { class: "gamehead__mark" }, h("span", { class: "italic" }, "Going Once")),
      h("p", { class: "gamehead__sale num" }, `Sale No. ${state.saleNo}`),
    ),
    tagStrip(state),
    h(
      "div",
      { class: "gamehead__right" },
      purseBlock(app),
      soundToggle(app.profile, handlers.onSound),
    ),
  );

  const main = h(
    "main",
    { id: "main", class: "sheet lot", "data-lot-screen": "", "data-phase": phase },
    h(
      "div",
      { class: "lot__grid" },
      h(
        "section",
        { class: "lot__left", "aria-labelledby": "lot-title" },
        h("h1", { id: "lot-title", class: "visually-hidden" }, `Lot ${state.lotIndex + 1}: ${lot.category}, ${difficultyLabel(lot.difficulty)}`),
        lotPlate(state),
        auctioneerLine(""),
        questionPanel(state, app, handlers),
        timerBar(),
        phase === "stealing" ? stealPanel(app, handlers) : null,
        phase === "resolved" ? verdictPanel(state) : null,
        phase === "resolved" ? ledgerPanel(state, app) : null,
        phase === "resolved" ? lotReview(state, app, handlers) : null,
        phase === "resolved"
          ? h(
              "div",
              { class: "lot__next" },
              h(
                "button",
                { class: "btn btn--primary btn--wide", type: "button", "data-next": "", onclick: handlers.onNext },
                state.lotIndex >= LOT_COUNT - 1 ? "Close the sale" : "Turn the page",
              ),
            )
          : null,
      ),
      h("div", { class: "lot__right" }, roomPanel(state, app, handlers)),
    ),
    phase === "bidding" || phase === "stealing" || phase === "answering"
      ? h("div", { class: "dock" }, bidControl(app, handlers), phase === "answering" || (phase === "stealing" && app.stealStage) ? answerActions(app, handlers) : null)
      : null,
  );

  return {
    header,
    body: main,
    after: () => wire(app, handlers),
  };
}

function answerActions(app, handlers) {
  const state = app.state;
  const phase = state.phase;
  const choosing = phase === "answering" || (phase === "stealing" && app.stealStage);
  if (!choosing) return null;
  const label = phase === "answering" ? "Lock in answer" : "Lock in the steal";
  return h(
    "div",
    { class: "answerbar" },
    h("button", { class: "btn btn--primary btn--wide", type: "button", "data-lock": "", onclick: handlers.onLockAnswer }, label),
  );
}

function wire(app, handlers) {
  const screen = app.root.querySelector("[data-lot-screen]");
  if (!screen) return;

  // Any click or tap during a sequence fast forwards it to its end state.
  screen.addEventListener("pointerdown", () => handlers.onSkipSequence(), true);

  screen.addEventListener("keydown", (event) => {
    const phase = app.state.phase;
    const choosing = phase === "answering" || (phase === "stealing" && app.stealStage);

    if (event.key === " " || event.key === "Enter") handlers.onSkipSequence();

    if (phase === "bidding" && event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      handlers.onConfirmBid();
      return;
    }

    if (choosing) {
      const keymap = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
      const index = keymap[String(event.key).toLowerCase()];
      if (index !== undefined) {
        event.preventDefault();
        handlers.onSelect(index);
        return;
      }
      if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        handlers.onLockAnswer();
      }
    }
  });

  const updateBid = () => {
    const control = screen.querySelector("[data-bidcontrol]");
    if (!control) return;
    const bounds = bidBounds(app.state);
    const lot = currentLot(app.state);
    const number = control.querySelector("[data-number]");
    const range = control.querySelector("[data-range]");
    if (number && document.activeElement !== number) number.value = String(app.bid);
    if (range) range.value = String(app.bid);
    const face = control.querySelector(".paddle--control");
    if (face) {
      const text = face.querySelector("text");
      if (text) text.textContent = formatChips(app.bid);
      const art = face.querySelector("g");
      if (art) art.setAttribute("transform", `rotate(${-6 + Math.min(8, (app.bid / Math.max(1, bounds.max)) * 14)} 60 80)`);
    }
    const confirm = control.querySelector("[data-confirm]");
    if (confirm && !lot.isHammer) confirm.textContent = app.bid > 0 ? "Raise paddle" : "Sit this one out";
    control.querySelectorAll("[data-pick]").forEach((btn) => {
      const picks = quickPicks(bounds, lot.isHammer);
      const pick = picks.find((p) => p.id === btn.dataset.pick);
      btn.classList.toggle("quickpick--on", Boolean(pick) && pick.amount === app.bid);
    });
  };

  screen.addEventListener("goingonce:bid", updateBid);

  const paintSelection = () => {
    screen.querySelectorAll("[data-option]").forEach((btn) => {
      const index = Number(btn.dataset.option);
      btn.setAttribute("aria-checked", String(app.selection === index));
      btn.tabIndex = app.selection === null ? (index === 0 ? 0 : -1) : index === app.selection ? 0 : -1;
    });
  };
  screen.addEventListener("goingonce:select", paintSelection);

  screen.addEventListener("goingonce:reveal", (event) => {
    const { seq } = event.detail;
    runReveal(app, screen, seq);
  });

  screen.addEventListener("goingonce:newlot", (event) => {
    const plate = screen.querySelector("[data-lotplate]");
    if (plate) anim.pageTurn(plate);
  });

  screen.addEventListener("goingonce:resume", () => {
    startTicking(app, screen);
  });

  startTicking(app, screen);
  if (app.state.phase === "resolved") {
    const fill = screen.querySelector("[data-timer-fill]");
    if (fill) fill.style.transform = "scaleX(0)";
    // The outcome, shown clearly: who took the lot, and whether they were right.
    const record = app.state.history[app.state.lotIndex];
    const winnerId = record ? record.winnerId : null;
    const stolenBy = record && record.steal && record.steal.by ? record.steal.by : null;
    const highlightId = winnerId && winnerId !== "player" ? winnerId : stolenBy && stolenBy !== "player" ? stolenBy : null;
    const winnerCard = highlightId ? screen.querySelector(`[data-rival="${highlightId}"]`) : null;
    const rivalCards = Array.from(screen.querySelectorAll("[data-rival]"));
    if (winnerCard) anim.winnerBeat(winnerCard, rivalCards);
    else if (record && !record.passedIn && rivalCards.length) anim.winnerBeat(null, rivalCards);
    const verdict = screen.querySelector("[data-verdict]");
    if (verdict) anim.verdictRise(verdict);
    const stampEl = screen.querySelector("[data-verdict-stamp]");
    if (stampEl) anim.stampIn(stampEl);
    const purse = screen.querySelector("[data-purse-value]");
    if (purse && record) {
      const delta = record.deltas.player;
      if (delta !== 0) anim.floatDelta(purse, `${delta > 0 ? "+" : "−"}${formatChips(Math.abs(delta))}`, delta < 0);
    }
  }
}

let tickHandle = null;
function startTicking(app, screen) {
  if (tickHandle) cancelAnimationFrame(tickHandle);
  const phase = app.state.phase;
  const bar = screen.querySelector("[data-timer-fill]");
  const count = screen.querySelector("[data-timer-count]");
  if (!bar || !count) return;
  if (!(phase === "answering" || (phase === "stealing" && app.stealStage))) return;
  let lastSecond = null;
  const frame = () => {
    if (!document.body.contains(bar)) return;
    const left = remainingMs(app.timer ? app.timer.startedAt : null);
    bar.style.transform = `scaleX(${left / ANSWER_MS})`;
    const seconds = Math.ceil(left / 1000);
    if (seconds !== lastSecond) {
      count.textContent = String(seconds);
      if (seconds <= 5 && seconds > 0) sound.play("tick");
      if (seconds === 10) app.announce("Ten seconds.");
      if (seconds === 5) app.announce("Five seconds.");
      lastSecond = seconds;
    }
    bar.parentElement.classList.toggle("timer--urgent", left <= 5000);
    if (left <= 0) {
      if (phase === "answering") app.timeoutAnswer();
      else app.timeoutSteal();
      return;
    }
    tickHandle = requestAnimationFrame(frame);
  };
  tickHandle = requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ reveal sequence */

async function runReveal(app, screen, seq) {
  const state = app.state;
  const record = state.history[state.lotIndex];
  const cur = state.current;
  const line = screen.querySelector("[data-auctioneer]");
  const bids = cur ? cur.bids : record ? record.bids : null;
  if (!bids) return;
  const hammer = Boolean(state.lots[state.lotIndex].isHammer);

  const setLine = (text) => {
    if (line) line.textContent = text;
  };

  const room = screen.querySelector(".room__cards");
  if (room) {
    state.rivals.forEach((id, i) => {
      const card = room.querySelector(`[data-rival="${id}"]`);
      if (!card) return;
      const bid = bids[id];
      const flip = h(
        "div",
        { class: "flip" },
        h("div", { class: "flip__face flip__face--back" }, bid > 0 ? formatChips(bid) : "Pass"),
      );
      card.appendChild(flip);
    });
  }

  const flags = Array.from(screen.querySelectorAll(".flip"));
  if (hammer) {
    setLine("The Hammer. Everyone answers.");
    for (const flag of flags) {
      await seq.sleep(240);
      anim.flipPaddle(flag);
    }
    await seq.sleep(320);
    if (line) line.textContent = "";
    return;
  }

  setLine("Going once...");
  for (const flag of flags) {
    await seq.sleep(240);
    anim.flipPaddle(flag);
    sound.play("flick");
  }
  const topBid = Math.max(...Object.values(bids));
  flags.forEach((flag) => {
    const value = Number((flag.textContent || "").replace(/[^0-9]/g, ""));
    if (value === topBid && topBid >= STEP) flag.classList.add("flip--top");
  });
  await seq.sleep(300);
  setLine("Going once...");
  await seq.sleep(650);
  setLine("Going twice...");
  await seq.sleep(650);
  if (!seq.alive) return;
  sound.play("gavel");
  anim.gavelStrike(screen.querySelector("[data-gavel]"), screen.querySelector("#app > main"));

  const passedIn = record ? record.passedIn : false;
  const winnerId = record ? record.winnerId : cur ? cur.winnerId : null;
  const winnerBid = winnerId ? bids[winnerId] : 0;
  const winnerName = winnerId === "player" ? "you" : winnerId ? surnameOf(rivalById(winnerId).name) : null;
  if (passedIn) {
    setLine("Passed in. Nobody wanted it.");
  } else if (winnerId) {
    setLine(`Sold, to ${winnerName === "you" ? "you" : winnerName} for ${formatChips(winnerBid)}.`);
  }

  const plate = screen.querySelector("[data-lotplate]");
  if (plate) {
    const seal = plate.querySelector("[data-seal]");
    if (seal && !hammer) {
      seal.classList.add("seal--torn");
      sound.play("stamp");
    }
  }

  await seq.sleep(420);
  if (line) line.textContent = "";
}

/* ------------------------------------------------------------------ app extensions */

export function attachLotHelpers(app) {
  app.timeoutAnswer = () => {
    if (!app.state || app.state.phase !== "answering") return;
    app.dispatch({ type: "answer", index: null });
    app.timer = null;
    app.selection = null;
    app.render();
  };
  app.timeoutSteal = () => {
    if (!app.state || app.state.phase !== "stealing") return;
    app.dispatch({ type: "steal", index: null });
    app.timer = null;
    app.selection = null;
    app.render();
  };
}

export { roomStrip };
function roomStrip(state) {
  return h(
    "div",
    { class: "roomstrip" },
    state.rivals.map((id) => rivalCard(id, { state, compact: true })),
  );
}

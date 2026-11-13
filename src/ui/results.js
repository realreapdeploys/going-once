// Going Once: results. "The Sale Closes": standings, reputation, the five lots as a ledger, share.

import { saleNumber, outcomeKind, playerRank, localDateString } from "../engine.js";
import { rankFor, rankProgress, PADDLES } from "../progress.js";
import { formatChips, ordinal, signedChips, deltaLabel, difficultyLabel, formatCountdown, msUntilMidnight, surnameOf } from "../format.js";
import { h, cx } from "./dom.js";
import { portraitMarkup, portraitLabel } from "./portrait.js";
import { paddle, paddleSvg } from "./paddle.js";
import { soundToggle } from "./cover.js";
import * as anim from "./anim.js";

const GLYPHS = { won: "■", stole: "◆", lost: "□", pass: "·" };
const GLYPH_WORDS = { won: "Won", stole: "Stole", lost: "Lost", pass: "No change" };

function standingsTable(state, app) {
  const rows = state.final;
  const myRank = playerRank(state);
  const table = h(
    "table",
    { class: "standings", "aria-label": "Final standings" },
    h("caption", { class: "visually-hidden" }, "Final standings"),
    h(
      "thead",
      { class: "visually-hidden" },
      h("tr", null, h("th", { scope: "col" }, "Rank"), h("th", { scope: "col" }, "Bidder"), h("th", { scope: "col" }, "Chips")),
    ),
    h(
      "tbody",
      null,
      rows.map((row) => {
        const isPlayer = row.id === "player";
        const name = isPlayer ? "You" : surnameOf(rivalName(row.id));
        return h(
          "tr",
          { class: cx("standing", isPlayer && "standing--you", row.rank === 1 && "standing--first") },
          h("td", { class: "standing__rank num" }, ordinal(row.rank)),
          h(
            "td",
            { class: "standing__who" },
            isPlayer
              ? h("span", { class: "standing__paddle", html: paddleSvg({ number: "", size: 34, tilt: -4 }) })
              : h("span", { class: "standing__portrait", role: "img", "aria-label": portraitLabel(row.id), html: portraitMarkup(row.id) }),
            h("span", { class: "standing__name" }, name),
            row.rank === 1 ? h("span", { class: "stamp stamp--small stamp--plain standing__stamp" }, "Top bidder") : null,
          ),
          h("td", { class: "standing__chips num" }, h("span", { class: "chip" }, h("span", { class: "chip__disc", "aria-hidden": "true" }), h("span", { class: "chip__value" }, formatChips(row.chips)))),
        );
      }),
    ),
  );
  return table;
}

function rivalName(id) {
  // The engine only stores ids; the roster is imported lazily to keep this module small.
  return (rivalLookup && rivalLookup(id) ? rivalLookup(id).name : null) || id;
}

let rivalLookup = null;
export function setRivalLookup(fn) {
  rivalLookup = fn;
}

function reputationPlate(app) {
  const result = app.lastResult || { gained: 0, rankedUp: false, newPaddles: [] };
  const profile = app.profile;
  const progress = rankProgress(profile.reputation);
  const rank = rankFor(profile.reputation);
  const number = h("span", { class: "reputation__value num", "data-rep": "" }, formatChips(0));
  const bar = h("span", { class: "bar__fill", "data-rankfill": "", style: { "--fill": String(rankProgress(profile.reputation - result.gained).fraction) } });

  return h(
    "section",
    { class: "reputation plate", "aria-labelledby": "rep-title" },
    h("h2", { id: "rep-title", class: "label" }, "Reputation earned today"),
    h("p", { class: "reputation__big" }, number, h("span", { class: "reputation__of" }, ` of ${formatChips(profile.reputation)}`)),
    h("div", { class: "bar", role: "presentation" }, bar),
    h(
      "p",
      { class: "reputation__hint" },
      progress.next ? `${rank.title}. ${formatChips(progress.next.at - profile.reputation)} to ${progress.next.title}.` : `${rank.title}. Top of the room.`,
    ),
    h("p", { class: "reputation__streak" }, `Streak: ${profile.streak === 1 ? "1 sale" : `${profile.streak} sales`}.`),
    result.rankedUp ? h("p", { class: "reputation__promo" }, h("span", { class: "stamp stamp--gain" }, `Promoted to ${rank.title}`)) : null,
    result.newPaddles && result.newPaddles.length
      ? h(
          "div",
          { class: "reputation__paddles" },
          result.newPaddles.map((p) =>
            h(
              "div",
              { class: "newpaddle" },
              h("span", { class: "newpaddle__art", html: paddleSvg({ tone: p, size: 62, tilt: -4 }) }),
              h("p", { class: "newpaddle__text" }, `New paddle unlocked: ${p.name}`),
            ),
          ),
        )
      : null,
  );
}

function lotLedger(state) {
  const rows = state.history.map((record) => {
    const lot = state.lots[record.lotIndex];
    const kind = outcomeKind(record);
    const id = `lotrow-${record.lotIndex}`;
    const detail = h(
      "tr",
      { class: "lotrow__detail", hidden: "" },
      h(
        "td",
        { colspan: "6" },
        h(
          "div",
          { class: "lotdetail" },
          h("p", { class: "lotdetail__q" }, lot.question),
          h(
            "p",
            { class: "lotdetail__a" },
            h("span", { class: "label" }, "The answer"),
            h("span", null, ` ${lot.options[lot.answerIndex]}`),
          ),
          h(
            "ul",
            { class: "lotdetail__rivals" },
            state.rivals.map((rid) => {
              const r = record.isHammer ? record.results[rid] : null;
              const pick = record.isHammer ? r && r.pick : rid === record.winnerId ? record.winnerPick : record.steal && record.steal.by === rid ? record.steal.pick : null;
              const said = pick === null || pick === undefined ? "did not answer" : `said ${lot.options[pick]}`;
              return h("li", null, h("span", { class: "lotdetail__who" }, surnameOf(rivalName(rid))), ` ${said}`);
            }),
          ),
        ),
      ),
    );
    const toggle = h(
      "button",
      {
        class: "lotrow__toggle",
        type: "button",
        "aria-expanded": "false",
        "aria-controls": id,
        onclick: (e) => {
          const open = e.currentTarget.getAttribute("aria-expanded") === "true";
          e.currentTarget.setAttribute("aria-expanded", String(!open));
          detail.hidden = open;
        },
      },
      h("span", { class: "lotrow__no num" }, String(record.lotIndex + 1)),
      h("span", { class: "visually-hidden" }, " Show the lot"),
    );
    const row = h(
      "tr",
      { class: "lotrow" },
      h("td", null, toggle),
      h("td", null, lot.category),
      h("td", null, difficultyLabel(lot.difficulty)),
      h("td", { class: "num" }, formatChips(record.bids.player)),
      h(
        "td",
        { class: cx("num", "delta", record.deltas.player > 0 ? "delta--gain" : record.deltas.player < 0 ? "delta--loss" : "delta--none") },
        h("span", { "aria-hidden": "true" }, signedChips(record.deltas.player)),
        h("span", { class: "visually-hidden" }, deltaLabel(record.deltas.player)),
      ),
      h(
        "td",
        { class: "lotrow__outcome" },
        h("span", { "aria-hidden": "true", class: `glyph glyph--${kind}` }, GLYPHS[kind]),
        h("span", { class: "visually-hidden" }, GLYPH_WORDS[kind]),
      ),
    );
    detail.id = id;
    return [row, detail];
  });

  return h(
    "section",
    { class: "lots plate", "aria-labelledby": "lots-title" },
    h("h2", { id: "lots-title", class: "label" }, "The five lots"),
    h(
      "table",
      { class: "ledger lotledger-table" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", { scope: "col" }, "Lot"),
          h("th", { scope: "col" }, "Category"),
          h("th", { scope: "col" }, "Difficulty"),
          h("th", { scope: "col", class: "num" }, "Your bid"),
          h("th", { scope: "col", class: "num" }, "Chips"),
          h("th", { scope: "col" }, "Outcome"),
        ),
      ),
      h("tbody", null, rows),
    ),
  );
}

export function resultsScreen(app, handlers) {
  const state = app.state;
  const saleNo = saleNumber(state.date);
  const nextSale = msUntilMidnight();

  const share = h(
    "div",
    { class: "share" },
    h(
      "button",
      {
        class: "btn btn--primary",
        type: "button",
        "data-copy": "",
        onclick: async () => {
          const result = await handlers.onCopy();
          if (result.ok) {
            showToast("Copied to the clipboard");
          } else {
            const box = app.root.querySelector("[data-sharetext]");
            if (box) {
              box.hidden = false;
              const area = box.querySelector("textarea");
              if (area) {
                area.value = result.text;
                area.focus();
                area.select();
              }
            }
            showToast("The clipboard is out of reach. The text is below.");
          }
        },
      },
      "Copy result",
    ),
    h(
      "div",
      { class: "share__fallback", "data-sharetext": "", hidden: "" },
      h("label", { class: "label", for: "sharetext" }, "Your result, to copy by hand"),
      h("textarea", { id: "sharetext", class: "share__box", readonly: "", rows: "4" }),
    ),
    h(
      "p",
      { class: "share__next" },
      "Next sale opens in ",
      h("span", { class: "num", "data-countdown": "" }, formatCountdown(nextSale)),
    ),
  );

  const newSaleOpen = app.today !== localDateString();
  const banner = newSaleOpen
    ? h(
        "div",
        { class: "newsale plate" },
        h("p", { class: "newsale__text" }, "A new sale is open."),
        h("button", { class: "btn btn--primary", type: "button", onclick: handlers.onPlayNew }, "Take a paddle"),
      )
    : null;

  const header = h(
    "header",
    { class: "results__head" },
    h("p", { class: "label" }, `Sale No. ${saleNo}`),
    h("h1", { class: "results__title" }, "The Sale Closes"),
    h("p", { class: "results__sub italic" }, "The hammer has fallen. The ledger is closed."),
  );

  const body = h(
    "main",
    { id: "main", class: "sheet results" },
    header,
    banner,
    h(
      "div",
      { class: "results__grid" },
      h("section", { class: "results__standings plate", "aria-labelledby": "standings-title" }, h("h2", { id: "standings-title", class: "label" }, "Final standings"), standingsTable(state, app)),
      reputationPlate(app),
    ),
    lotLedger(state),
    h(
      "footer",
      { class: "results__foot" },
      share,
      h(
        "div",
        { class: "results__actions" },
        h("button", { class: "btn btn--ghost", type: "button", onclick: (e) => handlers.onHowTo(e.currentTarget) }, "How to play"),
        h("button", { class: "btn btn--ghost", type: "button", onclick: (e) => handlers.onLedger(e.currentTarget) }, "Your ledger"),
        soundToggle(app.profile, handlers.onSound),
      ),
    ),
  );

  return {
    body,
    after: () => {
      anim.staggerIn(body, ":scope > header, :scope > .results__grid, :scope > section, :scope > footer");
      const rep = body.querySelector("[data-rep]");
      const result = app.lastResult || { gained: 0 };
      anim.tweenNumber(rep, 0, result.gained, { duration: 800, format: (n) => `+${formatChips(n)}` });
      const fill = body.querySelector("[data-rankfill]");
      if (fill) {
        const target = rankProgress(app.profile.reputation).fraction;
        requestAnimationFrame(() => {
          fill.style.setProperty("--fill", String(target));
        });
      }
    },
  };
}

function showToast(text) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = h("div", { class: "toast", role: "status" }, text);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

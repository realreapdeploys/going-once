// Going Once: private rooms — host a salle, share a code, the table plays one
// sale together over a public WebSocket relay. The host's browser keeps the
// books; no accounts, no server of ours.

import { formatChips } from "../format.js";
import { START_CHIPS } from "../engine.js";
import { h, cx } from "./dom.js";

function backLink(label, onClick) {
  return h(
    "button",
    { class: "btn btn--ghost room__back", type: "button", onclick: onClick },
    `← ${label}`,
  );
}

function roomHeader(kicker, title) {
  return h(
    "header",
    { class: "room__head" },
    h("p", { class: "label cover__kicker" }, kicker),
    h("h1", { class: "wordmark room__title" }, title),
    h("p", { class: "cover__tagline italic" }, "The daily auction, played together"),
  );
}

/* ------------------------------------------------------------- setup */

export function roomSetupScreen(app, handlers) {
  const draft = app.setup ?? { mode: "choose", name: "", code: "", error: null, connecting: false };
  app.setup = draft;

  let panel;
  if (draft.mode === "choose") {
    panel = h(
      "section",
      { class: "room__choices" },
      h(
        "button",
        { class: "plate plate--paper room__choice", type: "button", onclick: () => handlers.onMode("host") },
        h("p", { class: "room__choice-title" }, "Host a room"),
        h("p", { class: "room__choice-sub" }, "You call the sale. Your friends join with a five-character code."),
      ),
      h(
        "button",
        { class: "plate plate--paper room__choice", type: "button", onclick: () => handlers.onMode("join") },
        h("p", { class: "room__choice-title" }, "Join with a code"),
        h("p", { class: "room__choice-sub" }, "Someone at your table is hosting. Enter their code and pull up a chair."),
      ),
    );
  } else {
    const isHost = draft.mode === "host";
    panel = h(
      "form",
      {
        class: "plate plate--paper room__form",
        onsubmit: (event) => {
          event.preventDefault();
          if (isHost) handlers.onCreate(draft.name);
          else handlers.onJoin(draft.code, draft.name);
        },
      },
      h(
        "label",
        { class: "room__field" },
        h("span", { class: "label" }, "Your name"),
        h("input", {
          class: "room__input",
          type: "text",
          name: "name",
          maxlength: 24,
          autocomplete: "nickname",
          value: draft.name,
          placeholder: "e.g. Venn, Ricci, Della",
          oninput: (event) => { draft.name = event.target.value; },
        }),
      ),
      !isHost
        ? h(
            "label",
            { class: "room__field" },
            h("span", { class: "label" }, "Room code"),
            h("input", {
              class: "room__input room__input--code num",
              type: "text",
              name: "code",
              maxlength: 5,
              autocapitalize: "characters",
              autocomplete: "off",
              spellcheck: "false",
              value: draft.code,
              placeholder: "ABCDE",
              oninput: (event) => {
                draft.code = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
                event.target.value = draft.code;
              },
            }),
          )
        : null,
      draft.error ? h("p", { class: "room__error", role: "alert" }, draft.error) : null,
      h(
        "button",
        { class: "btn btn--primary btn--big", type: "submit", disabled: draft.connecting ? "" : null },
        draft.connecting ? "Reaching the saleroom…" : isHost ? "Open the room" : "Join the room",
      ),
      backLink("Choose another way in", () => handlers.onMode("choose")),
    );
  }

  const body = h(
    "main",
    { id: "main", class: "sheet room" },
    roomHeader("Private rooms", "A table of your own"),
    panel,
    h(
      "p",
      { class: "room__fine" },
      "One sale, played together on every phone at the table — shared lots, shared bids, the house keeps the books. Names only, no accounts, up to ten seats.",
    ),
  );
  return { body };
}

/* ------------------------------------------------------------- lobby */

export function roomLobbyScreen(app, handlers) {
  const client = app.roomClient;
  const ended = client.phase === "ended";

  const players = h(
    "ol",
    { class: "room__players" },
    client.players.map((player) =>
      h(
        "li",
        { class: "plate room__player", key: player.id },
        h(
          "div",
          { class: "room__player-info" },
          h("span", { class: "room__player-name" }, player.name),
          player.id === client.hostId ? h("span", { class: "stamp stamp--gain stamp--small room__host-stamp" }, "Host") : null,
        ),
        client.isHost && player.id !== client.myId && !ended
          ? h(
              "button",
              {
                class: "btn btn--ghost room__kick",
                type: "button",
                onclick: () => handlers.onKick(player.id, player.name),
                "aria-label": `Remove ${player.name} from the room`,
              },
              "Remove",
            )
          : null,
      ),
    ),
  );

  const controls = ended
    ? h(
        "div",
        { class: "room__ended" },
        h("p", { class: "room__ended-title" }, client.outcome === "kicked" ? "The host removed you from the room." : "The room was disbanded."),
        h("p", { class: "room__ended-sub" }, "The daily sale goes on as ever."),
        backLink("Back to the cover", handlers.onLeave),
      )
    : client.isHost
      ? h(
          "div",
          { class: "plate plate--paper room__settings" },
          h("h2", { class: "section-title room__settings-title" }, "The host calls the sale"),
          h(
            "label",
            { class: "room__field room__field--inline" },
            h("span", { class: "label" }, "Questions in this sale"),
            h(
              "select",
              {
                class: "room__select",
                onchange: (e) => handlers.onSettings({ lotCount: Number(e.target.value) }),
              },
              (client.lotOptions ?? [3, 5, 7, 10, 12, 15, 20]).map((n) =>
                h("option", { value: String(n), selected: client.settings.lotCount === n }, `${n} questions`),
              ),
            ),
          ),
          h(
            "label",
            { class: "room__field room__field--inline" },
            h("span", { class: "label" }, "Difficulty"),
            h(
              "select",
              {
                class: "room__select",
                onchange: (e) => handlers.onSettings({ difficulty: e.target.value }),
              },
              [
                ["mixed", "A bit of everything"],
                ["easy", "Common lots"],
                ["medium", "Uncommon lots"],
                ["hard", "Rare lots"],
              ].map(([value, label]) =>
                h("option", { value, selected: client.settings.difficulty === value }, label),
              ),
            ),
          ),
          h(
            "label",
            { class: "room__field room__field--inline" },
            h("span", { class: "label" }, "Bots at the table"),
            h(
              "select",
              {
                class: "room__select",
                onchange: (e) => handlers.onSettings({ botCount: Number(e.target.value) }),
              },
              (client.botOptions ?? [0, 1, 2, 3, 4]).map((n) =>
                h(
                  "option",
                  { value: String(n), selected: (client.settings.botCount ?? 2) === n },
                  n === 0 ? "No bots — players only" : n === 1 ? "1 bot" : `${n} bots`,
                ),
              ),
            ),
          ),
          h(
            "p",
            { class: "room__table-line" },
            `At the table: ${client.players.length} of ${client.maxSeats ?? 10} seats taken${Number(client.settings.botCount ?? 0) > 0 ? `, plus ${client.settings.botCount} ${client.settings.botCount === 1 ? "bot" : "bots"}` : ""}.`,
          ),
          h(
            "button",
            { class: "btn btn--primary btn--big room__start", type: "button", onclick: handlers.onStart },
            "Open the sale",
          ),
          h(
            "button",
            { class: "btn btn--ghost room__disband", type: "button", onclick: handlers.onDisband },
            "Disband the room",
          ),
        )
      : h(
          "div",
          { class: "plate plate--paper room__waiting" },
          h("p", { class: "room__waiting-title" }, "Pull up a chair."),
          h("p", { class: "room__waiting-sub" }, "Waiting for the host to open the sale. Settings and questions are theirs to call."),
          backLink("Leave the room", handlers.onLeave),
        );

  const body = h(
    "main",
    { id: "main", class: "sheet room" },
    roomHeader("Private room", "The saleroom is yours"),
    h(
      "div",
      { class: "room__code-plate plate plate--paper" },
      h("p", { class: "label" }, "Room code"),
      h("p", { class: "room__code num" }, client.code),
      h(
        "button",
        { class: "btn btn--ghost room__copy", type: "button", onclick: handlers.onCopyCode },
        "Copy code",
      ),
    ),
    h(
      "section",
      { class: "room__players-wrap", "aria-label": "Who is at the table" },
      h("h2", { class: "section-title" }, `At the table — ${client.players.length}`),
      players,
    ),
    controls,
  );
  return { body };
}

/* ------------------------------------------------------------- standings */

export function roomStandingsScreen(app, handlers) {
  const client = app.roomClient;
  const ended = client.phase === "ended";
  const finalRows = Array.isArray(app.roomFinal) ? app.roomFinal : null;

  let verdict;
  let list;
  if (finalRows && finalRows.length) {
    const leader = finalRows[0];
    const mine = finalRows.find((row) => row.id === "player");
    verdict = mine && mine.rank === leader.rank
      ? "The table is yours."
      : `${leader.name} takes the honours.`;
    list = h(
      "ol",
      { class: "room__standings" },
      finalRows.map((row) =>
        h(
          "li",
          {
            class: cx("plate room__standing", row.rank === leader.rank && "room__standing--leader"),
            key: row.id,
          },
          h("span", { class: "room__standing-place num" }, `${row.rank}.`),
          h(
            "div",
            { class: "room__standing-info" },
            h(
              "span",
              { class: "room__standing-name" },
              row.name,
              row.id === "player" ? h("span", { class: "room__standing-you" }, " (you)") : null,
              row.kind === "bot" ? h("span", { class: "room__standing-you" }, " (bot)") : null,
            ),
            h(
              "span",
              { class: "room__standing-chips num" },
              `${formatChips(row.chips)} chips  (${row.chips >= START_CHIPS ? "+" : ""}${formatChips(row.chips - START_CHIPS)})`,
            ),
          ),
          row.rank === leader.rank ? h("span", { class: "stamp stamp--gain stamp--small" }, "Winner") : null,
        ),
      ),
    );
  } else if (ended) {
    verdict = client.outcome === "kicked" ? "You were removed from the room." : "The room was disbanded before the books closed.";
    list = h(
      "div",
      { class: "plate plate--paper room__ended" },
      h("p", { class: "room__ended-title" }, verdict),
      h("p", { class: "room__ended-sub" }, "The daily sale goes on as ever."),
    );
  } else {
    verdict = "The lots are still falling.";
    list = h(
      "div",
      { class: "plate plate--paper room__ended" },
      h("p", { class: "room__ended-title" }, "The hammer has not fallen yet."),
      h("p", { class: "room__ended-sub" }, "The books are tallied when the last lot closes."),
    );
  }

  const good = Boolean(finalRows && finalRows.length);
  const isSocketRoom = Boolean(client.isSocket);
  const playAgainBlock =
    good && isSocketRoom && client.isHost && handlers.onPlayAgain
      ? h(
          "button",
          { class: "btn btn--primary btn--big room__again", type: "button", onclick: handlers.onPlayAgain },
          "Play again",
        )
      : good && isSocketRoom
        ? h("p", { class: "room__ended-sub" }, "Waiting for the host to re-deal…")
        : null;
  const body = h(
    "main",
    { id: "main", class: "sheet room" },
    roomHeader(`Room ${client.code} — the books`, "The hammer has fallen"),
    h(
      "p",
      { class: cx("verdict", good ? "verdict--good" : "verdict--flat", "plate plate--paper"), role: "status" },
      h("span", { class: "verdict__title" }, verdict),
    ),
    list,
    playAgainBlock,
    h("p", { class: "room__fine" }, "Every seat played the same lots, in the same order, at the same table. The house keeps the books."),
    backLink("Back to the cover", handlers.onLeave),
  );
  return { body };
}

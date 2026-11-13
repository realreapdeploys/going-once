// Going Once: private rooms — host a salle, share a code, everyone plays the
// same sale and compares the books at the end. No accounts, no server of ours;
// traffic rides a public WebSocket relay. Casual, self-reported tallies.

import { formatChips } from "../format.js";
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
      "Rooms share one sale, played on every phone at the table, and compare the books at the end. Names only — no accounts, no scores stored anywhere we keep.",
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
              [3, 5, 7, 10].map((n) =>
                h("option", { value: String(n), selected: client.settings.lotCount === n ? "" : null }, `${n} questions`),
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
                h("option", { value, selected: client.settings.difficulty === value ? "" : null }, label),
              ),
            ),
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
  const rows = client.results();
  const waiting = rows.filter((r) => !r.finished).map((r) => r.name);
  const done = rows.filter((r) => r.finished);
  const leader = done.length ? done[0] : null;

  let verdict;
  if (ended) {
    verdict = client.outcome === "kicked" ? "You were removed from the room." : "The room was disbanded before the books closed.";
  } else if (client.allFinished && leader) {
    verdict = leader.id === client.myId ? "The table is yours." : `${leader.name} takes the honours.`;
  } else {
    verdict = "The lots are still falling.";
  }

  const list = h(
    "ol",
    { class: "room__standings" },
    rows.map((row) => {
      const place = row.finished ? rows.filter((r) => r.finished && r.chips > row.chips).length + 1 : null;
      const isLeader = leader && row.id === leader.id && client.allFinished;
      return h(
        "li",
        { class: cx("plate room__standing", !row.finished && "room__standing--waiting", isLeader && "room__standing--leader"), key: row.id },
        h("span", { class: "room__standing-place num" }, place ? `${place}.` : "—"),
        h(
          "div",
          { class: "room__standing-info" },
          h("span", { class: "room__standing-name" }, row.name, row.id === client.myId ? h("span", { class: "room__standing-you" }, " (you)") : null),
          h(
            "span",
            { class: "room__standing-chips num" },
            row.finished ? `${formatChips(row.chips)} chips` : "Still in the saleroom",
          ),
        ),
        isLeader ? h("span", { class: "stamp stamp--gain stamp--small" }, "Winner") : null,
      );
    }),
  );

  const body = h(
    "main",
    { id: "main", class: "sheet room" },
    roomHeader(`Room ${client.code} — the books`, "The hammer has fallen"),
    h("p", { class: "verdict verdict--good plate plate--paper", role: "status" }, h("span", { class: "verdict__title" }, verdict)),
    list,
    !ended && !client.allFinished
      ? h("p", { class: "room__fine" }, `Waiting for ${waiting.join(", ")}… this page updates itself as answers come in.`)
      : null,
    h("p", { class: "room__fine" }, "Room tallies are self-reported by each browser at the table — a dropped connection can leave someone uncounted."),
    backLink("Back to the cover", handlers.onLeave),
  );
  return { body };
}

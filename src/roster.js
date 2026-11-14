// Going Once: the ninety bidders who can appear as rivals.
// Each day the engine picks three of them using the daily seed.
//
// skills: chance (0 to 1) the rival knows an Uncommon (difficulty 2) lot in that category before
//         the difficulty penalty is applied. See answerProbability() in engine.js.
// boldness: how much of their bank they like to put on a lot (0 cautious, 1 reckless).
// bluff: chance per lot that they bid as if they were far more sure than they are.
//
// portrait: inner SVG markup for a 120 x 140 viewBox. It uses stroke="currentColor" so it can be
// tinted by CSS (ink on paper). Wrap it like this:
//   <svg viewBox="0 0 120 140" fill="none" stroke="currentColor" stroke-width="2.4"
//        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${portrait}</svg>

import { buildPortrait } from "./portrait-gen.js";

const BUST = `
  <path d="M10 140 C12 112 34 103 60 103 C86 103 108 112 110 140"/>
  <path d="M50 94 L50 104 M70 94 L70 104"/>
  <ellipse cx="60" cy="68" rx="26" ry="32"/>
  <path d="M34 66 C27 64 27 77 35 77"/>
  <path d="M86 66 C93 64 93 77 85 77"/>
`;

export const ROSTER = Object.freeze([
  {
    id: "venn",
    name: "Captain Orla Venn",
    patter: {
      beaten: "Fair bidding. You keep your head at altitude — no stalling, no panic.",
      victorious: "I've landed this auction a hundred times. I don't miss on clear air.",
    },

    title: "Retired airline pilot",
    tagline: "Has been everywhere and remembers all of it. Bids when she is sure.",
    boldness: 0.5,
    bluff: 0.1,
    skills: { "Geography": 0.9, "Video Games & Streaming": 0.3, "History": 0.6, "Science": 0.8, "Sport": 0.5, "Film & TV": 0.35, "Music": 0.3, "Technology": 0.35, "Arts & Literature": 0.4 },
    portrait: `${BUST}
      <circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>
      <path d="M44 61 L56 60 M64 60 L76 61"/>
      <path d="M60 70 L57 81 L62 81"/>
      <path d="M52 90 Q60 94 68 90"/>
      <path d="M34 58 C34 28 86 28 86 58 Z"/>
      <path d="M28 58 H92"/>
      <path d="M34 60 C28 80 29 94 37 104"/>
      <path d="M86 60 C92 80 91 94 83 104"/>
      <path d="M44 103 C52 114 68 114 76 103 L80 118 C66 126 54 126 40 118 Z"/>`
  },
  {
    id: "marlowe",
    name: "Dex Marlowe",
    patter: {
      beaten: "Ha! Someone finally bid like they meant it. The table's awake again.",
      victorious: "You didn't see the tell, but I bid anyway. That's the theatre, friend.",
    },

    title: "Professional gambler",
    tagline: "Bids big on anything. Much of it is theatre.",
    boldness: 0.85,
    bluff: 0.35,
    skills: { "Geography": 0.5, "History": 0.4, "Video Games & Streaming": 0.75, "Science": 0.4, "Sport": 0.85, "Film & TV": 0.55, "Music": 0.5, "Technology": 0.5, "Arts & Literature": 0.45 },
    portrait: `${BUST}
      <circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>
      <path d="M44 62 L56 62 M64 58 L76 62"/>
      <path d="M60 70 L57 81 L62 81"/>
      <path d="M51 90 Q61 96 71 86"/>
      <path d="M48 96 L49 97 M54 98 L55 99 M62 99 L63 100 M69 96 L70 97"/>
      <ellipse cx="60" cy="47" rx="44" ry="9"/>
      <path d="M37 47 C37 20 83 20 83 47"/>
      <path d="M37 40 H83"/>`
  },
  {
    id: "whitlock",
    name: "Prof. Ada Whitlock",
    patter: {
      beaten: "You outbid a historian with a colder head than mine. I tip my hat, sir.",
      victorious: "Methodical wins the day. It nearly always does.",
    },

    title: "Lecturer in history",
    tagline: "Slow, careful and rarely wrong. Hates to lose chips.",
    boldness: 0.2,
    bluff: 0.05,
    skills: { "Geography": 0.65, "Video Games & Streaming": 0.25, "History": 0.9, "Science": 0.85, "Sport": 0.3, "Film & TV": 0.4, "Music": 0.55, "Technology": 0.6, "Arts & Literature": 0.85 },
    portrait: `${BUST}
      <circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="50" cy="68" r="9"/>
      <circle cx="70" cy="68" r="9"/>
      <path d="M59 67 H61"/>
      <path d="M60 72 L57 82 L62 82"/>
      <path d="M53 91 Q60 94 67 91"/>
      <path d="M34 62 C32 36 88 36 86 62"/>
      <circle cx="60" cy="27" r="9"/>
      <path d="M52 34 C56 38 64 38 68 34"/>`
  },
  {
    id: "reyes",
    name: "Tommy Reyes",
    patter: {
      beaten: "And the paddle goes up! What a moment! The whole room felt that one!",
      victorious: "Tough luck, champ! That's sport! Back on the screens we go!",
    },

    title: "Radio sports commentator",
    tagline: "Talks the whole time. Knows sport and screens, bluffs on the rest.",
    boldness: 0.7,
    bluff: 0.3,
    skills: { "Geography": 0.5, "History": 0.35, "Video Games & Streaming": 0.85, "Science": 0.4, "Sport": 0.9, "Film & TV": 0.8, "Music": 0.55, "Technology": 0.45, "Arts & Literature": 0.6 },
    portrait: `${BUST}
      <circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>
      <path d="M44 61 L56 60 M64 60 L76 61"/>
      <path d="M60 70 L57 81 L62 81"/>
      <path d="M50 88 Q60 98 70 88 Z"/>
      <path d="M33 62 C26 22 94 22 87 62"/>
      <rect x="26" y="60" width="10" height="18" rx="3"/>
      <rect x="84" y="60" width="10" height="18" rx="3"/>
      <path d="M30 78 C30 96 44 100 54 95"/>
      <circle cx="56" cy="95" r="3.4"/>
      <path d="M40 40 L44 30 M52 36 L54 26 M64 36 L66 26 M76 40 L78 31"/>`
  },
  {
    id: "ricci",
    name: "Madame Solène Ricci",
    patter: {
      beaten: "You hear the room better than I do today. That is worth more than money.",
      victorious: "I only ever buy what sings to me. Today it sang.",
    },

    title: "Antiques dealer",
    tagline: "Buys with her ears. Strong on music and the past, lost on science.",
    boldness: 0.6,
    bluff: 0.35,
    skills: { "Geography": 0.55, "Video Games & Streaming": 0.45, "History": 0.8, "Science": 0.3, "Sport": 0.25, "Film & TV": 0.75, "Music": 0.9, "Technology": 0.55, "Arts & Literature": 0.9 },
    portrait: `${BUST}
      <circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>
      <path d="M43 60 C47 57 53 57 56 60 M64 60 C67 57 73 57 77 60"/>
      <path d="M60 70 L57 81 L62 81"/>
      <path d="M52 89 Q60 95 68 89 Q60 86 52 89 Z" fill="currentColor"/>
      <path d="M31 72 C12 44 38 12 60 17 C84 12 108 44 89 72"/>
      <path d="M36 52 C44 42 62 38 84 50"/>
      <circle cx="33" cy="84" r="3"/>
      <circle cx="87" cy="84" r="3"/>
      <path d="M84 26 C100 6 112 20 98 36"/>`
  },
  {
    id: "finch",
    name: "Mr. Harold Finch",
    patter: {
      beaten: "Well played. A tidy sale to you. I shall keep the books in order.",
      victorious: "Slow and steady, as the ledger always reads. No headroom for regret.",
    },

    title: "Retired accountant",
    tagline: "Knows a little of everything. Never bids more than he can afford to lose.",
    boldness: 0.1,
    bluff: 0,
    skills: { "Geography": 0.6, "Video Games & Streaming": 0.35, "History": 0.6, "Science": 0.6, "Sport": 0.55, "Film & TV": 0.55, "Music": 0.55, "Technology": 0.6, "Arts & Literature": 0.6 },
    portrait: `${BUST}
      <circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>
      <circle cx="70" cy="68" r="9"/>
      <path d="M44 61 L56 60 M62 58 L78 59"/>
      <path d="M60 70 L57 80 L62 80"/>
      <path d="M48 85 C54 78 60 82 60 84 C60 82 66 78 72 85 C66 91 54 91 48 85 Z"/>
      <path d="M79 72 C90 90 90 100 84 108"/>
      <path d="M36 46 C36 20 84 20 84 46 Z"/>
      <path d="M27 46 H93"/>`
  },
  {
    id: "rival-01",
    name: "Hollis Adeyemi",
    title: "florist",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.58,
    bluff: 0.23,
    skills: { "Geography": 0.87, "Video Games & Streaming": 0.51, "History": 0.22, "Science": 0.71, "Sport": 0.57, "Film & TV": 0.65, "Music": 0.66, "Technology": 0.79, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-01"),
  },
  {
    id: "rival-02",
    name: "Elspeth Lovelace",
    title: "organist",
    tagline: "Knows Music and Technology inside out. Draws a blank on Science.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.46,
    bluff: 0.11,
    skills: { "Geography": 0.62, "Video Games & Streaming": 0.69, "History": 0.61, "Science": 0.28, "Sport": 0.58, "Film & TV": 0.64, "Music": 0.83, "Technology": 0.78, "Arts & Literature": 0.27 },
    portrait: buildPortrait("rival-02"),
  },
  {
    id: "rival-03",
    name: "Graham Kingsmill",
    title: "chimney sweep",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.53,
    bluff: 0.2,
    skills: { "Geography": 0.79, "Video Games & Streaming": 0.84, "History": 0.25, "Science": 0.61, "Sport": 0.58, "Film & TV": 0.52, "Music": 0.58, "Technology": 0.58, "Arts & Literature": 0.63 },
    portrait: buildPortrait("rival-03"),
  },
  {
    id: "rival-04",
    name: "Edmund Jenkins",
    title: "tram driver",
    tagline: "Knows History and Science inside out. Draws a blank on Sport.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.47,
    bluff: 0.16,
    skills: { "Geography": 0.65, "Video Games & Streaming": 0.63, "History": 0.83, "Science": 0.86, "Sport": 0.24, "Film & TV": 0.24, "Music": 0.55, "Technology": 0.68, "Arts & Literature": 0.61 },
    portrait: buildPortrait("rival-04"),
  },
  {
    id: "rival-05",
    name: "Ivor Aldercroft",
    title: "auditor",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.32,
    bluff: 0.17,
    skills: { "Geography": 0.63, "Video Games & Streaming": 0.57, "History": 0.69, "Science": 0.66, "Sport": 0.7, "Film & TV": 0.57, "Music": 0.27, "Technology": 0.24, "Arts & Literature": 0.62 },
    portrait: buildPortrait("rival-05"),
  },
  {
    id: "rival-06",
    name: "Ferdinand Fairlight",
    title: "translator",
    tagline: "Knows Sport and Film & TV inside out. Draws a blank on Geography.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.53,
    bluff: 0.27,
    skills: { "Geography": 0.26, "Video Games & Streaming": 0.59, "History": 0.48, "Science": 0.5, "Sport": 0.86, "Film & TV": 0.84, "Music": 0.5, "Technology": 0.47, "Arts & Literature": 0.29 },
    portrait: buildPortrait("rival-06"),
  },
  {
    id: "rival-07",
    name: "Yolanda Whitmore",
    title: "accountant",
    tagline: "Knows Music and Technology inside out. Draws a blank on Video Games & Streaming.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.67,
    bluff: 0.16,
    skills: { "Geography": 0.67, "Video Games & Streaming": 0.26, "History": 0.27, "Science": 0.7, "Sport": 0.55, "Film & TV": 0.46, "Music": 0.84, "Technology": 0.79, "Arts & Literature": 0.66 },
    portrait: buildPortrait("rival-07"),
  },
  {
    id: "rival-08",
    name: "Lavinia Carmichael",
    title: "florist",
    tagline: "Knows Geography and Arts & Literature inside out. Draws a blank on Science.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.46,
    bluff: 0.21,
    skills: { "Geography": 0.78, "Video Games & Streaming": 0.68, "History": 0.54, "Science": 0.24, "Sport": 0.25, "Film & TV": 0.57, "Music": 0.69, "Technology": 0.46, "Arts & Literature": 0.84 },
    portrait: buildPortrait("rival-08"),
  },
  {
    id: "rival-09",
    name: "Wendell Ballantyne",
    title: "florist",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.23,
    bluff: 0.08,
    skills: { "Geography": 0.64, "Video Games & Streaming": 0.87, "History": 0.88, "Science": 0.57, "Sport": 0.57, "Film & TV": 0.65, "Music": 0.52, "Technology": 0.53, "Arts & Literature": 0.64 },
    portrait: buildPortrait("rival-09"),
  },
  {
    id: "rival-10",
    name: "Cyril Aldercroft",
    title: "civil engineer",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.58,
    bluff: 0.46,
    skills: { "Geography": 0.58, "Video Games & Streaming": 0.5, "History": 0.5, "Science": 0.79, "Sport": 0.72, "Film & TV": 0.75, "Music": 0.25, "Technology": 0.59, "Arts & Literature": 0.53 },
    portrait: buildPortrait("rival-10"),
  },
  {
    id: "rival-11",
    name: "Yolanda Carmichael",
    title: "florist",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.74,
    bluff: 0.46,
    skills: { "Geography": 0.25, "Video Games & Streaming": 0.52, "History": 0.48, "Science": 0.54, "Sport": 0.57, "Film & TV": 0.41, "Music": 0.71, "Technology": 0.75, "Arts & Literature": 0.74 },
    portrait: buildPortrait("rival-11"),
  },
  {
    id: "rival-12",
    name: "Daphne Thistlethwaite",
    title: "auctioneer\'s clerk",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.69,
    bluff: 0.32,
    skills: { "Geography": 0.83, "Video Games & Streaming": 0.8, "History": 0.25, "Science": 0.5, "Sport": 0.56, "Film & TV": 0.66, "Music": 0.53, "Technology": 0.66, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-12"),
  },
  {
    id: "rival-13",
    name: "Winifred Aldercroft",
    title: "postmaster",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.61,
    bluff: 0.49,
    skills: { "Geography": 0.57, "Video Games & Streaming": 0.51, "History": 0.74, "Science": 0.77, "Sport": 0.76, "Film & TV": 0.33, "Music": 0.49, "Technology": 0.54, "Arts & Literature": 0.47 },
    portrait: buildPortrait("rival-13"),
  },
  {
    id: "rival-14",
    name: "Octavia Halloway",
    title: "dentist",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.12,
    bluff: 0.05,
    skills: { "Geography": 0.51, "Video Games & Streaming": 0.43, "History": 0.36, "Science": 0.5, "Sport": 0.45, "Film & TV": 0.8, "Music": 0.25, "Technology": 0.32, "Arts & Literature": 0.3 },
    portrait: buildPortrait("rival-14"),
  },
  {
    id: "rival-15",
    name: "Wilfred Underhill",
    title: "bookbinder",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.49,
    bluff: 0.2,
    skills: { "Geography": 0.29, "Video Games & Streaming": 0.57, "History": 0.55, "Science": 0.59, "Sport": 0.51, "Film & TV": 0.62, "Music": 0.84, "Technology": 0.78, "Arts & Literature": 0.52 },
    portrait: buildPortrait("rival-15"),
  },
  {
    id: "rival-16",
    name: "Magnus Xiong",
    title: "chimney sweep",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.39,
    bluff: 0.11,
    skills: { "Geography": 0.84, "Video Games & Streaming": 0.23, "History": 0.69, "Science": 0.48, "Sport": 0.63, "Film & TV": 0.62, "Music": 0.51, "Technology": 0.69, "Arts & Literature": 0.87 },
    portrait: buildPortrait("rival-16"),
  },
  {
    id: "rival-17",
    name: "Frances Zielinski",
    title: "travel agent",
    tagline: "Knows Video Games & Streaming and History inside out. Draws a blank on Science.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.57,
    bluff: 0.25,
    skills: { "Geography": 0.62, "Video Games & Streaming": 0.9, "History": 0.82, "Science": 0.32, "Sport": 0.24, "Film & TV": 0.52, "Music": 0.52, "Technology": 0.47, "Arts & Literature": 0.48 },
    portrait: buildPortrait("rival-17"),
  },
  {
    id: "rival-18",
    name: "Magnus Nakamura",
    title: "travel agent",
    tagline: "Knows Science and Sport inside out. Draws a blank on Film & TV.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.38,
    bluff: 0.12,
    skills: { "Geography": 0.69, "Video Games & Streaming": 0.69, "History": 0.66, "Science": 0.87, "Sport": 0.88, "Film & TV": 0.29, "Music": 0.32, "Technology": 0.46, "Arts & Literature": 0.47 },
    portrait: buildPortrait("rival-18"),
  },
  {
    id: "rival-19",
    name: "Vivian Eastlake",
    title: "conductress",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.37,
    bluff: 0.2,
    skills: { "Geography": 0.61, "Video Games & Streaming": 0.68, "History": 0.58, "Science": 0.67, "Sport": 0.5, "Film & TV": 0.89, "Music": 0.86, "Technology": 0.23, "Arts & Literature": 0.66 },
    portrait: buildPortrait("rival-19"),
  },
  {
    id: "rival-20",
    name: "Quentin Hawthorne",
    title: "baker",
    tagline: "Knows Technology and Arts & Literature inside out. Draws a blank on Geography.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.68,
    bluff: 0.21,
    skills: { "Geography": 0.24, "Video Games & Streaming": 0.24, "History": 0.54, "Science": 0.68, "Sport": 0.5, "Film & TV": 0.48, "Music": 0.49, "Technology": 0.79, "Arts & Literature": 0.86 },
    portrait: buildPortrait("rival-20"),
  },
  {
    id: "rival-21",
    name: "Beatrice Adeyemi",
    title: "watchmaker",
    tagline: "Knows Geography and Video Games & Streaming inside out. Draws a blank on History.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.45,
    bluff: 0.16,
    skills: { "Geography": 0.81, "Video Games & Streaming": 0.86, "History": 0.27, "Science": 0.32, "Sport": 0.66, "Film & TV": 0.66, "Music": 0.57, "Technology": 0.57, "Arts & Literature": 0.5 },
    portrait: buildPortrait("rival-21"),
  },
  {
    id: "rival-22",
    name: "Octavia Thistlethwaite",
    title: "tram driver",
    tagline: "Knows History and Science inside out. Draws a blank on Sport.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.5,
    bluff: 0.15,
    skills: { "Geography": 0.49, "Video Games & Streaming": 0.65, "History": 0.88, "Science": 0.87, "Sport": 0.25, "Film & TV": 0.29, "Music": 0.46, "Technology": 0.62, "Arts & Literature": 0.6 },
    portrait: buildPortrait("rival-22"),
  },
  {
    id: "rival-23",
    name: "Dorothy Irving",
    title: "chimney sweep",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.58,
    bluff: 0.19,
    skills: { "Geography": 0.51, "Video Games & Streaming": 0.67, "History": 0.7, "Science": 0.6, "Sport": 0.79, "Film & TV": 0.89, "Music": 0.22, "Technology": 0.66, "Arts & Literature": 0.68 },
    portrait: buildPortrait("rival-23"),
  },
  {
    id: "rival-24",
    name: "Vivian Carmichael",
    title: "retired postal worker",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.32,
    bluff: 0.04,
    skills: { "Geography": 0.55, "Video Games & Streaming": 0.5, "History": 0.52, "Science": 0.53, "Sport": 0.58, "Film & TV": 0.54, "Music": 0.86, "Technology": 0.88, "Arts & Literature": 0.65 },
    portrait: buildPortrait("rival-24"),
  },
  {
    id: "rival-25",
    name: "Ines Chiltern",
    title: "chandler",
    tagline: "Knows Geography and Arts & Literature inside out. Draws a blank on Video Games & Streaming.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.43,
    bluff: 0.25,
    skills: { "Geography": 0.81, "Video Games & Streaming": 0.28, "History": 0.7, "Science": 0.47, "Sport": 0.55, "Film & TV": 0.53, "Music": 0.69, "Technology": 0.25, "Arts & Literature": 0.89 },
    portrait: buildPortrait("rival-25"),
  },
  {
    id: "rival-26",
    name: "Clarke Adeyemi",
    title: "harbour master",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.14,
    bluff: 0.09,
    skills: { "Geography": 0.4, "Video Games & Streaming": 0.81, "History": 0.3, "Science": 0.23, "Sport": 0.32, "Film & TV": 0.48, "Music": 0.47, "Technology": 0.47, "Arts & Literature": 0.42 },
    portrait: buildPortrait("rival-26"),
  },
  {
    id: "rival-27",
    name: "Henrietta Larkin",
    title: "harbour master",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.32,
    bluff: 0.1,
    skills: { "Geography": 0.59, "Video Games & Streaming": 0.68, "History": 0.59, "Science": 0.59, "Sport": 0.69, "Film & TV": 0.24, "Music": 0.28, "Technology": 0.66, "Arts & Literature": 0.68 },
    portrait: buildPortrait("rival-27"),
  },
  {
    id: "rival-28",
    name: "Nora Drummond",
    title: "curator",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.22,
    bluff: 0.05,
    skills: { "Geography": 0.66, "Video Games & Streaming": 0.55, "History": 0.8, "Science": 0.79, "Sport": 0.67, "Film & TV": 0.62, "Music": 0.63, "Technology": 0.59, "Arts & Literature": 0.5 },
    portrait: buildPortrait("rival-28"),
  },
  {
    id: "rival-29",
    name: "Oscar Venables",
    title: "radio host",
    tagline: "Knows Sport and Film & TV inside out. Draws a blank on Technology.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.69,
    bluff: 0.19,
    skills: { "Geography": 0.66, "Video Games & Streaming": 0.59, "History": 0.47, "Science": 0.45, "Sport": 0.87, "Film & TV": 0.81, "Music": 0.56, "Technology": 0.29, "Arts & Literature": 0.29 },
    portrait: buildPortrait("rival-29"),
  },
  {
    id: "rival-30",
    name: "Frances Zagar",
    title: "watchmaker",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.4,
    bluff: 0.17,
    skills: { "Geography": 0.25, "Video Games & Streaming": 0.55, "History": 0.49, "Science": 0.49, "Sport": 0.48, "Film & TV": 0.52, "Music": 0.86, "Technology": 0.82, "Arts & Literature": 0.61 },
    portrait: buildPortrait("rival-30"),
  },
  {
    id: "rival-31",
    name: "Egbert Prescott",
    title: "lab technician",
    tagline: "Knows Geography and Arts & Literature inside out. Draws a blank on Video Games & Streaming.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.55,
    bluff: 0.19,
    skills: { "Geography": 0.83, "Video Games & Streaming": 0.25, "History": 0.32, "Science": 0.53, "Sport": 0.49, "Film & TV": 0.59, "Music": 0.61, "Technology": 0.47, "Arts & Literature": 0.89 },
    portrait: buildPortrait("rival-31"),
  },
  {
    id: "rival-32",
    name: "Vivian Hawthorne",
    title: "auctioneer\'s clerk",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.57,
    bluff: 0.49,
    skills: { "Geography": 0.4, "Video Games & Streaming": 0.83, "History": 0.73, "Science": 0.82, "Sport": 0.26, "Film & TV": 0.56, "Music": 0.42, "Technology": 0.55, "Arts & Literature": 0.55 },
    portrait: buildPortrait("rival-32"),
  },
  {
    id: "rival-33",
    name: "Cecilia Carmichael",
    title: "civil engineer",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.14,
    bluff: 0.06,
    skills: { "Geography": 0.37, "Video Games & Streaming": 0.4, "History": 0.51, "Science": 0.42, "Sport": 0.82, "Film & TV": 0.22, "Music": 0.3, "Technology": 0.26, "Arts & Literature": 0.47 },
    portrait: buildPortrait("rival-33"),
  },
  {
    id: "rival-34",
    name: "Helena Fairlight",
    title: "curator",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.31,
    bluff: 0.01,
    skills: { "Geography": 0.62, "Video Games & Streaming": 0.56, "History": 0.65, "Science": 0.64, "Sport": 0.52, "Film & TV": 0.85, "Music": 0.82, "Technology": 0.65, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-34"),
  },
  {
    id: "rival-35",
    name: "Marlena Fairlight",
    title: "locksmith",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.62,
    bluff: 0.39,
    skills: { "Geography": 0.32, "Video Games & Streaming": 0.62, "History": 0.69, "Science": 0.58, "Sport": 0.69, "Film & TV": 0.68, "Music": 0.47, "Technology": 0.87, "Arts & Literature": 0.79 },
    portrait: buildPortrait("rival-35"),
  },
  {
    id: "rival-36",
    name: "Farrah Kowalski",
    title: "piano tuner",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.7,
    bluff: 0.43,
    skills: { "Geography": 0.7, "Video Games & Streaming": 0.77, "History": 0.78, "Science": 0.32, "Sport": 0.58, "Film & TV": 0.56, "Music": 0.54, "Technology": 0.42, "Arts & Literature": 0.53 },
    portrait: buildPortrait("rival-36"),
  },
  {
    id: "rival-37",
    name: "Winifred Gosling",
    title: "florist",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.68,
    bluff: 0.35,
    skills: { "Geography": 0.42, "Video Games & Streaming": 0.51, "History": 0.49, "Science": 0.76, "Sport": 0.75, "Film & TV": 0.76, "Music": 0.23, "Technology": 0.62, "Arts & Literature": 0.53 },
    portrait: buildPortrait("rival-37"),
  },
  {
    id: "rival-38",
    name: "Quincy Radnor",
    title: "barista",
    tagline: "Knows Music and Technology inside out. Draws a blank on Geography.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.56,
    bluff: 0.15,
    skills: { "Geography": 0.22, "Video Games & Streaming": 0.45, "History": 0.51, "Science": 0.6, "Sport": 0.67, "Film & TV": 0.64, "Music": 0.78, "Technology": 0.83, "Arts & Literature": 0.23 },
    portrait: buildPortrait("rival-38"),
  },
  {
    id: "rival-39",
    name: "Babette Sully",
    title: "drama coach",
    tagline: "Knows Geography and Arts & Literature inside out. Draws a blank on Video Games & Streaming.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.51,
    bluff: 0.24,
    skills: { "Geography": 0.82, "Video Games & Streaming": 0.31, "History": 0.26, "Science": 0.5, "Sport": 0.68, "Film & TV": 0.55, "Music": 0.64, "Technology": 0.54, "Arts & Literature": 0.81 },
    portrait: buildPortrait("rival-39"),
  },
  {
    id: "rival-40",
    name: "Ulric Chiltern",
    title: "retired postal worker",
    tagline: "Knows Video Games & Streaming and History inside out. Draws a blank on Science.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.54,
    bluff: 0.19,
    skills: { "Geography": 0.54, "Video Games & Streaming": 0.87, "History": 0.78, "Science": 0.23, "Sport": 0.3, "Film & TV": 0.5, "Music": 0.56, "Technology": 0.6, "Arts & Literature": 0.68 },
    portrait: buildPortrait("rival-40"),
  },
  {
    id: "rival-41",
    name: "Marlena Zielinski",
    title: "sports editor",
    tagline: "Knows Science and Sport inside out. Draws a blank on Film & TV.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.37,
    bluff: 0.25,
    skills: { "Geography": 0.46, "Video Games & Streaming": 0.65, "History": 0.6, "Science": 0.9, "Sport": 0.84, "Film & TV": 0.24, "Music": 0.22, "Technology": 0.63, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-41"),
  },
  {
    id: "rival-42",
    name: "Quentin Nakamura",
    title: "translator",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.48,
    bluff: 0.13,
    skills: { "Geography": 0.57, "Video Games & Streaming": 0.49, "History": 0.54, "Science": 0.5, "Sport": 0.6, "Film & TV": 0.81, "Music": 0.89, "Technology": 0.32, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-42"),
  },
  {
    id: "rival-43",
    name: "Rhoda Nakamura",
    title: "accountant",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.49,
    bluff: 0.18,
    skills: { "Geography": 0.31, "Video Games & Streaming": 0.46, "History": 0.65, "Science": 0.68, "Sport": 0.69, "Film & TV": 0.5, "Music": 0.5, "Technology": 0.9, "Arts & Literature": 0.8 },
    portrait: buildPortrait("rival-43"),
  },
  {
    id: "rival-44",
    name: "Alistair Hartley",
    title: "records officer",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.28,
    bluff: 0.09,
    skills: { "Geography": 0.89, "Video Games & Streaming": 0.84, "History": 0.65, "Science": 0.58, "Sport": 0.61, "Film & TV": 0.66, "Music": 0.61, "Technology": 0.6, "Arts & Literature": 0.55 },
    portrait: buildPortrait("rival-44"),
  },
  {
    id: "rival-45",
    name: "Verity Zielinski",
    title: "schoolteacher",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.5,
    bluff: 0.17,
    skills: { "Geography": 0.62, "Video Games & Streaming": 0.23, "History": 0.84, "Science": 0.9, "Sport": 0.63, "Film & TV": 0.61, "Music": 0.67, "Technology": 0.62, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-45"),
  },
  {
    id: "rival-46",
    name: "Erskine Hawthorne",
    title: "bookbinder",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.71,
    bluff: 0.43,
    skills: { "Geography": 0.63, "Video Games & Streaming": 0.66, "History": 0.28, "Science": 0.49, "Sport": 0.82, "Film & TV": 0.88, "Music": 0.66, "Technology": 0.52, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-46"),
  },
  {
    id: "rival-47",
    name: "Tabitha Jepson",
    title: "insurance clerk",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.72,
    bluff: 0.4,
    skills: { "Geography": 0.57, "Video Games & Streaming": 0.46, "History": 0.59, "Science": 0.29, "Sport": 0.51, "Film & TV": 0.59, "Music": 0.75, "Technology": 0.71, "Arts & Literature": 0.71 },
    portrait: buildPortrait("rival-47"),
  },
  {
    id: "rival-48",
    name: "Ottilie Rosenthal",
    title: "auditor",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.48,
    bluff: 0.17,
    skills: { "Geography": 0.87, "Video Games & Streaming": 0.89, "History": 0.55, "Science": 0.47, "Sport": 0.25, "Film & TV": 0.51, "Music": 0.5, "Technology": 0.59, "Arts & Literature": 0.6 },
    portrait: buildPortrait("rival-48"),
  },
  {
    id: "rival-49",
    name: "Giles Sully",
    title: "conductress",
    tagline: "Knows History and Science inside out. Draws a blank on Film & TV.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.49,
    bluff: 0.23,
    skills: { "Geography": 0.61, "Video Games & Streaming": 0.65, "History": 0.82, "Science": 0.84, "Sport": 0.61, "Film & TV": 0.29, "Music": 0.32, "Technology": 0.58, "Arts & Literature": 0.6 },
    portrait: buildPortrait("rival-49"),
  },
  {
    id: "rival-50",
    name: "Farrah de Vere",
    title: "meteorologist",
    tagline: "Knows Sport and Film & TV inside out. Draws a blank on Technology.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.45,
    bluff: 0.17,
    skills: { "Geography": 0.47, "Video Games & Streaming": 0.52, "History": 0.47, "Science": 0.7, "Sport": 0.78, "Film & TV": 0.87, "Music": 0.55, "Technology": 0.32, "Arts & Literature": 0.22 },
    portrait: buildPortrait("rival-50"),
  },
  {
    id: "rival-51",
    name: "Mabel Prescott",
    title: "chimney sweep",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.19,
    bluff: 0.06,
    skills: { "Geography": 0.3, "Video Games & Streaming": 0.28, "History": 0.31, "Science": 0.37, "Sport": 0.4, "Film & TV": 0.43, "Music": 0.86, "Technology": 0.52, "Arts & Literature": 0.39 },
    portrait: buildPortrait("rival-51"),
  },
  {
    id: "rival-52",
    name: "Lionel Grimshaw",
    title: "travel agent",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.13,
    bluff: 0.09,
    skills: { "Geography": 0.4, "Video Games & Streaming": 0.38, "History": 0.54, "Science": 0.31, "Sport": 0.31, "Film & TV": 0.32, "Music": 0.51, "Technology": 0.82, "Arts & Literature": 0.5 },
    portrait: buildPortrait("rival-52"),
  },
  {
    id: "rival-53",
    name: "Alistair Valentine",
    title: "cartographer",
    tagline: "Knows Geography and Arts & Literature inside out. Draws a blank on Music.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.35,
    bluff: 0.2,
    skills: { "Geography": 0.81, "Video Games & Streaming": 0.55, "History": 0.59, "Science": 0.48, "Sport": 0.57, "Film & TV": 0.54, "Music": 0.31, "Technology": 0.25, "Arts & Literature": 0.81 },
    portrait: buildPortrait("rival-53"),
  },
  {
    id: "rival-54",
    name: "York Ostrom",
    title: "organist",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.5,
    bluff: 0.23,
    skills: { "Geography": 0.68, "Video Games & Streaming": 0.83, "History": 0.83, "Science": 0.64, "Sport": 0.69, "Film & TV": 0.7, "Music": 0.63, "Technology": 0.63, "Arts & Literature": 0.29 },
    portrait: buildPortrait("rival-54"),
  },
  {
    id: "rival-55",
    name: "Ferdinand Aldercroft",
    title: "schoolteacher",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.37,
    bluff: 0.1,
    skills: { "Geography": 0.3, "Video Games & Streaming": 0.26, "History": 0.62, "Science": 0.64, "Sport": 0.67, "Film & TV": 0.63, "Music": 0.57, "Technology": 0.64, "Arts & Literature": 0.65 },
    portrait: buildPortrait("rival-55"),
  },
  {
    id: "rival-56",
    name: "Zelda Galt",
    title: "organist",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.53,
    bluff: 0.16,
    skills: { "Geography": 0.59, "Video Games & Streaming": 0.57, "History": 0.24, "Science": 0.25, "Sport": 0.65, "Film & TV": 0.66, "Music": 0.56, "Technology": 0.69, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-56"),
  },
  {
    id: "rival-57",
    name: "Graham Davenport",
    title: "watchmaker",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.58,
    bluff: 0.16,
    skills: { "Geography": 0.5, "Video Games & Streaming": 0.65, "History": 0.68, "Science": 0.81, "Sport": 0.83, "Film & TV": 0.27, "Music": 0.52, "Technology": 0.63, "Arts & Literature": 0.69 },
    portrait: buildPortrait("rival-57"),
  },
  {
    id: "rival-58",
    name: "Alistair Hawthorne",
    title: "barista",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.76,
    bluff: 0.44,
    skills: { "Geography": 0.57, "Video Games & Streaming": 0.56, "History": 0.48, "Science": 0.48, "Sport": 0.56, "Film & TV": 0.8, "Music": 0.81, "Technology": 0.73, "Arts & Literature": 0.28 },
    portrait: buildPortrait("rival-58"),
  },
  {
    id: "rival-59",
    name: "Xavier Fairlight",
    title: "barista",
    tagline: "Knows Geography and Arts & Literature inside out. Draws a blank on Video Games & Streaming.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.41,
    bluff: 0.24,
    skills: { "Geography": 0.85, "Video Games & Streaming": 0.22, "History": 0.28, "Science": 0.67, "Sport": 0.61, "Film & TV": 0.6, "Music": 0.67, "Technology": 0.46, "Arts & Literature": 0.82 },
    portrait: buildPortrait("rival-59"),
  },
  {
    id: "rival-60",
    name: "Xavier Jenkins",
    title: "auditor",
    tagline: "Knows Video Games & Streaming and History inside out. Draws a blank on Science.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.57,
    bluff: 0.29,
    skills: { "Geography": 0.59, "Video Games & Streaming": 0.9, "History": 0.8, "Science": 0.22, "Sport": 0.28, "Film & TV": 0.47, "Music": 0.51, "Technology": 0.63, "Arts & Literature": 0.67 },
    portrait: buildPortrait("rival-60"),
  },
  {
    id: "rival-61",
    name: "Archie Adeyemi",
    title: "mechanic",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.69,
    bluff: 0.34,
    skills: { "Geography": 0.65, "Video Games & Streaming": 0.59, "History": 0.62, "Science": 0.84, "Sport": 0.9, "Film & TV": 0.26, "Music": 0.61, "Technology": 0.56, "Arts & Literature": 0.48 },
    portrait: buildPortrait("rival-61"),
  },
  {
    id: "rival-62",
    name: "Archie Blackwood",
    title: "tram driver",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.36,
    bluff: 0.14,
    skills: { "Geography": 0.5, "Video Games & Streaming": 0.56, "History": 0.46, "Science": 0.69, "Sport": 0.68, "Film & TV": 0.82, "Music": 0.89, "Technology": 0.24, "Arts & Literature": 0.54 },
    portrait: buildPortrait("rival-62"),
  },
  {
    id: "rival-63",
    name: "Nora Rosenthal",
    title: "florist",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.15,
    bluff: 0.01,
    skills: { "Geography": 0.29, "Video Games & Streaming": 0.27, "History": 0.43, "Science": 0.55, "Sport": 0.46, "Film & TV": 0.39, "Music": 0.44, "Technology": 0.83, "Arts & Literature": 0.24 },
    portrait: buildPortrait("rival-63"),
  },
  {
    id: "rival-64",
    name: "Rosalind Quimby",
    title: "piano tuner",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.78,
    bluff: 0.4,
    skills: { "Geography": 0.71, "Video Games & Streaming": 0.78, "History": 0.3, "Science": 0.46, "Sport": 0.45, "Film & TV": 0.42, "Music": 0.56, "Technology": 0.54, "Arts & Literature": 0.84 },
    portrait: buildPortrait("rival-64"),
  },
  {
    id: "rival-65",
    name: "Archie Tavish",
    title: "harbour master",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.18,
    bluff: 0.02,
    skills: { "Geography": 0.54, "Video Games & Streaming": 0.53, "History": 0.8, "Science": 0.78, "Sport": 0.51, "Film & TV": 0.61, "Music": 0.56, "Technology": 0.62, "Arts & Literature": 0.68 },
    portrait: buildPortrait("rival-65"),
  },
  {
    id: "rival-66",
    name: "Oscar Gosling",
    title: "radio host",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.19,
    bluff: 0.09,
    skills: { "Geography": 0.39, "Video Games & Streaming": 0.39, "History": 0.42, "Science": 0.31, "Sport": 0.89, "Film & TV": 0.33, "Music": 0.3, "Technology": 0.41, "Arts & Literature": 0.43 },
    portrait: buildPortrait("rival-66"),
  },
  {
    id: "rival-67",
    name: "Henrietta Jepson",
    title: "radio host",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.61,
    bluff: 0.38,
    skills: { "Geography": 0.58, "Video Games & Streaming": 0.49, "History": 0.49, "Science": 0.59, "Sport": 0.52, "Film & TV": 0.87, "Music": 0.89, "Technology": 0.33, "Arts & Literature": 0.58 },
    portrait: buildPortrait("rival-67"),
  },
  {
    id: "rival-68",
    name: "Patricia Gosling",
    title: "curator",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.38,
    bluff: 0.18,
    skills: { "Geography": 0.29, "Video Games & Streaming": 0.63, "History": 0.56, "Science": 0.56, "Sport": 0.62, "Film & TV": 0.68, "Music": 0.65, "Technology": 0.69, "Arts & Literature": 0.29 },
    portrait: buildPortrait("rival-68"),
  },
  {
    id: "rival-69",
    name: "Hugo Quill",
    title: "baker",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.71,
    bluff: 0.33,
    skills: { "Geography": 0.62, "Video Games & Streaming": 0.26, "History": 0.67, "Science": 0.62, "Sport": 0.67, "Film & TV": 0.45, "Music": 0.55, "Technology": 0.85, "Arts & Literature": 0.9 },
    portrait: buildPortrait("rival-69"),
  },
  {
    id: "rival-70",
    name: "Rosalind Chiltern",
    title: "chandler",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.28,
    bluff: 0.01,
    skills: { "Geography": 0.85, "Video Games & Streaming": 0.85, "History": 0.55, "Science": 0.67, "Sport": 0.53, "Film & TV": 0.6, "Music": 0.55, "Technology": 0.59, "Arts & Literature": 0.65 },
    portrait: buildPortrait("rival-70"),
  },
  {
    id: "rival-71",
    name: "Admiral Quill",
    title: "auditor",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.74,
    bluff: 0.3,
    skills: { "Geography": 0.61, "Video Games & Streaming": 0.66, "History": 0.79, "Science": 0.84, "Sport": 0.26, "Film & TV": 0.64, "Music": 0.68, "Technology": 0.64, "Arts & Literature": 0.51 },
    portrait: buildPortrait("rival-71"),
  },
  {
    id: "rival-72",
    name: "Octavia Xiong",
    title: "undertaker",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.43,
    bluff: 0.12,
    skills: { "Geography": 0.47, "Video Games & Streaming": 0.53, "History": 0.5, "Science": 0.6, "Sport": 0.85, "Film & TV": 0.87, "Music": 0.29, "Technology": 0.45, "Arts & Literature": 0.48 },
    portrait: buildPortrait("rival-72"),
  },
  {
    id: "rival-73",
    name: "Desmond Xu",
    title: "chimney sweep",
    tagline: "Knows Music and Technology inside out. Draws a blank on Geography.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.55,
    bluff: 0.27,
    skills: { "Geography": 0.27, "Video Games & Streaming": 0.63, "History": 0.47, "Science": 0.64, "Sport": 0.61, "Film & TV": 0.68, "Music": 0.79, "Technology": 0.83, "Arts & Literature": 0.23 },
    portrait: buildPortrait("rival-73"),
  },
  {
    id: "rival-74",
    name: "Valerie Fairlight",
    title: "conductress",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.32,
    bluff: 0.12,
    skills: { "Geography": 0.63, "Video Games & Streaming": 0.22, "History": 0.23, "Science": 0.68, "Sport": 0.64, "Film & TV": 0.6, "Music": 0.6, "Technology": 0.64, "Arts & Literature": 0.68 },
    portrait: buildPortrait("rival-74"),
  },
  {
    id: "rival-75",
    name: "Alistair Mackenzie",
    title: "organist",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.53,
    bluff: 0.3,
    skills: { "Geography": 0.8, "Video Games & Streaming": 0.58, "History": 0.55, "Science": 0.28, "Sport": 0.61, "Film & TV": 0.61, "Music": 0.69, "Technology": 0.52, "Arts & Literature": 0.86 },
    portrait: buildPortrait("rival-75"),
  },
  {
    id: "rival-76",
    name: "Babette Mackenzie",
    title: "mechanic",
    tagline: "Knows Video Games & Streaming and History inside out. Draws a blank on Sport.",
    patter: {
      beaten: "A fair result. You knew your lot; so did I — just not mine.",
      victorious: "There\'s no argument with a specialist in his chair.",
    },
    boldness: 0.61,
    bluff: 0.15,
    skills: { "Geography": 0.49, "Video Games & Streaming": 0.81, "History": 0.87, "Science": 0.5, "Sport": 0.22, "Film & TV": 0.32, "Music": 0.47, "Technology": 0.57, "Arts & Literature": 0.6 },
    portrait: buildPortrait("rival-76"),
  },
  {
    id: "rival-77",
    name: "Ivor Ostrom",
    title: "sports editor",
    tagline: "Big paddle, small inhibitions. Bids first, thinks second.",
    patter: {
      beaten: "Right — the aggressive approach has been neutralised.",
      victorious: "Audacity, mate. It\'s a whole personality out there.",
    },
    boldness: 0.67,
    bluff: 0.39,
    skills: { "Geography": 0.6, "Video Games & Streaming": 0.63, "History": 0.58, "Science": 0.82, "Sport": 0.78, "Film & TV": 0.54, "Music": 0.3, "Technology": 0.47, "Arts & Literature": 0.48 },
    portrait: buildPortrait("rival-77"),
  },
  {
    id: "rival-78",
    name: "Sylvester Upton",
    title: "bookbinder",
    tagline: "Plays the room, not the question. Buys low, brags high.",
    patter: {
      beaten: "Ha! You cleaned me out fair. The table needed that.",
      victorious: "Bold as brass — right less often than I\'d like, but right today.",
    },
    boldness: 0.8,
    bluff: 0.48,
    skills: { "Geography": 0.43, "Video Games & Streaming": 0.55, "History": 0.48, "Science": 0.43, "Sport": 0.54, "Film & TV": 0.78, "Music": 0.71, "Technology": 0.73, "Arts & Literature": 0.32 },
    portrait: buildPortrait("rival-78"),
  },
  {
    id: "rival-79",
    name: "Yolanda Yardley",
    title: "sports editor",
    tagline: "Sixty years of rooms like this. Rarely caught in between.",
    patter: {
      beaten: "You\'ve beaten an old pro. Take the honour home.",
      victorious: "I\'ve outlasted louder paddles than yours, sir.",
    },
    boldness: 0.39,
    bluff: 0.13,
    skills: { "Geography": 0.79, "Video Games & Streaming": 0.23, "History": 0.69, "Science": 0.66, "Sport": 0.48, "Film & TV": 0.64, "Music": 0.5, "Technology": 0.6, "Arts & Literature": 0.88 },
    portrait: buildPortrait("rival-79"),
  },
  {
    id: "rival-80",
    name: "Ulric Ingram",
    title: "cobbler",
    tagline: "Polite, practised and in no hurry.",
    patter: {
      beaten: "Graceful. The room tips its hat.",
      victorious: "I stood my ground, and the ground held.",
    },
    boldness: 0.23,
    bluff: 0.06,
    skills: { "Geography": 0.52, "Video Games & Streaming": 0.82, "History": 0.88, "Science": 0.67, "Sport": 0.53, "Film & TV": 0.56, "Music": 0.63, "Technology": 0.57, "Arts & Literature": 0.54 },
    portrait: buildPortrait("rival-80"),
  },
  {
    id: "rival-81",
    name: "Desmond McTavish",
    title: "curator",
    tagline: "Only swears by one shelf — but that shelf is sacred.",
    patter: {
      beaten: "You got me out of my depth. I\'ll go browse instead.",
      victorious: "That was my shelf. Nobody knows it like I do.",
    },
    boldness: 0.18,
    bluff: 0.09,
    skills: { "Geography": 0.38, "Video Games & Streaming": 0.48, "History": 0.31, "Science": 0.85, "Sport": 0.29, "Film & TV": 0.28, "Music": 0.49, "Technology": 0.55, "Arts & Literature": 0.37 },
    portrait: buildPortrait("rival-81"),
  },
  {
    id: "rival-82",
    name: "Patricia Mackenzie",
    title: "schoolteacher",
    tagline: "Turns up every week. Bids steady. Wins slowly.",
    patter: {
      beaten: "Solid work. You\'d survive this room on nerves alone.",
      victorious: "Steady wins. I\'ve never had cause to change that.",
    },
    boldness: 0.48,
    bluff: 0.24,
    skills: { "Geography": 0.52, "Video Games & Streaming": 0.51, "History": 0.53, "Science": 0.59, "Sport": 0.87, "Film & TV": 0.9, "Music": 0.23, "Technology": 0.69, "Arts & Literature": 0.62 },
    portrait: buildPortrait("rival-82"),
  },
  {
    id: "rival-83",
    name: "Yusuf Fitzgibbon",
    title: "undertaker",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.39,
    bluff: 0.1,
    skills: { "Geography": 0.64, "Video Games & Streaming": 0.66, "History": 0.66, "Science": 0.64, "Sport": 0.55, "Film & TV": 0.64, "Music": 0.69, "Technology": 0.27, "Arts & Literature": 0.32 },
    portrait: buildPortrait("rival-83"),
  },
  {
    id: "rival-84",
    name: "Henrietta de Vere",
    title: "letter carrier",
    tagline: "Reads a bit of everything. Nothing ruins an appetite like a dabbler.",
    patter: {
      beaten: "Well formed on every front. An education to watch.",
      victorious: "Shallow as a pamphlet — and twice as useful.",
    },
    boldness: 0.36,
    bluff: 0.18,
    skills: { "Geography": 0.27, "Video Games & Streaming": 0.25, "History": 0.65, "Science": 0.61, "Sport": 0.57, "Film & TV": 0.63, "Music": 0.59, "Technology": 0.66, "Arts & Literature": 0.61 },
    portrait: buildPortrait("rival-84"),
  },
]);


// Guests at a room table are NOT the daily saleroom's characters, so they get their own
// chalk-style guest portraits — no faces borrowed from the six rivals.
const GUEST_PORTRAITS = [
  `
  <ellipse cx="60" cy="68" rx="26" ry="32"/>
  <path d="M10 140 C12 112 34 103 60 103 C86 103 108 112 110 140"/>
  <path d="M30 55 C30 28 90 28 90 55"/>
  <path d="M21 55 H99"/>
  <path d="M52 108 L60 116 L68 108"/>
  <circle cx="50" cy="71" r="2" fill="currentColor" stroke="none"/>
  <circle cx="70" cy="71" r="2" fill="currentColor" stroke="none"/>
  <path d="M50 84 C56 87 64 87 70 84"/>`,
  `
  <ellipse cx="60" cy="68" rx="26" ry="32"/>
  <path d="M10 140 C12 112 34 103 60 103 C86 103 108 112 110 140"/>
  <circle cx="48" cy="70" r="7.5"/>
  <circle cx="72" cy="70" r="7.5"/>
  <path d="M55.5 70 H64.5"/>
  <path d="M40.5 69 H30 M79.5 69 H90"/>
  <circle cx="50" cy="70" r="1.4" fill="currentColor" stroke="none"/>
  <circle cx="70" cy="70" r="1.4" fill="currentColor" stroke="none"/>
  <path d="M50 90 C56 94 64 94 70 90"/>`,
  `
  <ellipse cx="60" cy="68" rx="26" ry="32"/>
  <path d="M10 140 C12 112 34 103 60 103 C86 103 108 112 110 140"/>
  <path d="M26 58 C24 20 92 22 80 56 C76 44 40 44 26 58 Z"/>
  <circle cx="50" cy="72" r="2" fill="currentColor" stroke="none"/>
  <circle cx="70" cy="72" r="2" fill="currentColor" stroke="none"/>
  <circle cx="89" cy="84" r="2.5"/>
  <path d="M50 89 C56 95 66 95 74 89"/>`,
];

// Room guests and hosts: humans at the table get pseudo-rival entries so every
// card, ledger and panel can render them the same as the saleroom's fixtures.
const ROOM_SEAT_REGISTRY = new Map();

const ROOM_SKILLS = { "Geography": 0.5, "History": 0.5, "Science": 0.5, "Sport": 0.5, "Film & TV": 0.5, "Music": 0.5, "Technology": 0.5, "Arts & Literature": 0.5, "Video Games & Streaming": 0.55 };

export function registerRoomSeats(seats) {
  ROOM_SEAT_REGISTRY.clear();
  if (!Array.isArray(seats)) return;
  let guestIndex = 0;
  for (const seat of seats) {
    if (seat.kind !== "human") continue;
    const portrait = GUEST_PORTRAITS[guestIndex % GUEST_PORTRAITS.length];
    guestIndex += 1;
    ROOM_SEAT_REGISTRY.set(seat.id, {
      id: seat.id,
      name: seat.name,
      title: "A guest at the table",
      tagline: "Playing with you, not against the house.",
      patter: { beaten: "Good sale. The table was lively today.", victorious: "Good sale to the house." },
      boldness: 0.5,
      bluff: 0.1,
      skills: { ...ROOM_SKILLS },
      portrait,
    });
  }
}

export function getRivalById(id) {
  return ROOM_SEAT_REGISTRY.get(id) || ROSTER.find((r) => r.id === id) || null;
}

// Strong = skill of 0.75 or more, weak = skill of 0.4 or less. Used for the "ledger" chips on rival cards.
export function describeSkills(rival, categories) {
  const strong = [];
  const weak = [];
  for (const category of categories) {
    const s = rival.skills[category];
    if (s >= 0.75) strong.push(category);
    else if (s <= 0.4) weak.push(category);
  }
  return { strong, weak };
}

// Going Once: the six bidders who can appear as rivals.
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
  }
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

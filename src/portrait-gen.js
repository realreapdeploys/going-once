// Going Once: generated portrait busts for the ninety-strong saleroom.
// Inner SVG markup for a 120 x 140 viewBox, stroked in currentColor, mirroring the hand-drawn style of the
// six fixtures. Deterministic per id — the same rival always wears the same face.

const BUST = `
  <path d="M10 140 C12 112 34 103 60 103 C86 103 108 112 110 140"/>
  <path d="M50 94 L50 104 M70 94 L70 104"/>
  <ellipse cx="60" cy="68" rx="26" ry="32"/>
  <path d="M34 66 C27 64 27 77 35 77"/>
  <path d="M86 66 C93 64 93 77 85 77"/>
`;

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const BROWS = [
  `<path d="M42 56 L54 54 M66 54 L78 56"/>`,
  `<path d="M42 57 L54 57 M66 57 L78 57"/>`,
  `<path d="M42 53 C46 50 53 50 57 53 M63 53 C67 50 74 50 78 53"/>`,
  `<path d="M41 58 L55 56 M65 56 L79 58"/>`,
  `<path d="M44 54 L52 52 M68 52 L76 54"/>`,
  `<path d="M43 55 L53 57 M67 57 L77 55"/>`,
];
const EYES = [
  `<circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/><circle cx="70" cy="68" r="2" fill="currentColor" stroke="none"/>`,
  `<path d="M45 68 Q50 65 55 68 M65 68 Q70 65 75 68"/>`,
  `<circle cx="50" cy="68" r="2" fill="currentColor" stroke="none"/><path d="M65 68 Q70 65 75 68"/>`,
];
const MOUTHS = [
  `<path d="M52 90 Q60 94 68 90"/>`,
  `<path d="M52 91 L68 91"/>`,
  `<path d="M50 88 Q60 95 70 88"/>`,
  `<path d="M55 90 L65 90"/>`,
  `<path d="M51 88 L69 90"/>`,
];
const HAIRS = [
  `<path d="M33 57 C31 26 89 26 87 57"/><path d="M36 52 C44 40 76 40 84 52"/>`,         // slick side sweep
  `<path d="M32 58 C28 20 92 20 88 58"/><path d="M35 48 C50 32 72 34 86 50"/>`,          // high crown
  `<path d="M34 58 L34 42 C34 30 86 30 86 42 L86 58"/>`,                                  // flat top
  `<path d="M34 58 L33 36 C40 24 80 24 87 36 L86 58"/>`,                                  // domed slab
  `<path d="M31 58 C28 32 44 20 60 21 C76 20 92 32 89 58"/><path d="M40 34 L80 34"/>`,    // neat bowl
  `<path d="M40 40 C36 24 84 24 80 40 C88 24 60 12 34 32 Z"/>`,                           // quiff sweep
  `<path d="M34 58 C33 44 38 30 60 28 C82 30 87 44 86 58 Z"/>`,                            // smooth cap
  `<path d="M38 58 C36 40 44 32 60 30 C76 32 84 40 82 58"/>`,                              // waves
  `<path d="M34 60 C30 52 32 40 46 32 M60 24 L60 24 M74 32 C88 40 90 52 86 60"/>`,        // thinning (stroke wisps)
  `<path d="M33 58 C29 48 33 36 60 34 C87 36 91 48 87 58"/><path d="M44 38 C52 34 68 34 76 38"/>`, // tight cap + fringe
];
const FACIAL_HAIR = [
  ``,
  `<path d="M44 82 L54 80 M66 80 L76 82"/>`,                                         // moustache
  `<path d="M46 80 L56 78 M64 78 L74 80"/><path d="M48 92 C52 99 68 99 72 92"/>`,     // moustache + beard
  `<path d="M52 90 C52 100 68 100 68 90"/>`,                                          // goatee
  `<path d="M38 74 L44 82 M82 74 L76 82"/>`,                                          // sideburns
  `<path d="M51 86 L69 86"/><path d="M54 92 C58 96 62 96 66 92"/>`,                   // caterpillar + chin
];
const ACCESSORIES = [
  ``,
  `<circle cx="50" cy="68" r="8"/><circle cx="70" cy="68" r="8"/><path d="M58 68 L62 68"/>`,  // glasses
  `<circle cx="70" cy="68" r="9"/><path d="M79 64 L88 58"/>`,                                  // monocle
  `<circle cx="33" cy="82" r="2.4" fill="currentColor" stroke="none"/><circle cx="87" cy="82" r="2.4" fill="currentColor" stroke="none"/>`, // earrings
  `<path d="M48 108 L60 116 L72 108"/>`,                                                       // bow tie
  `<path d="M52 106 L60 132 L68 106"/>`,                                                       // necktie
  `<path d="M44 110 Q60 120 76 110"/>`,                                                        // cravat / necklace
  `<path d="M34 52 L26 44 M86 52 L94 44"/><path d="M24 42 C32 38 40 40 44 46 M96 42 C88 38 80 40 76 46"/>`, // hat with brim
];
const EARS = [
  `<path d="M34 66 C28 64 28 78 36 78"/><path d="M86 66 C92 64 92 78 84 78"/>`,
  `<path d="M33 66 C26 64 27 79 36 79"/><path d="M87 66 C94 64 93 79 84 79"/>`,
];

/** Inner SVG markup for a generated rival bust. Deterministic: same id, same face. */
export function buildPortrait(id) {
  const rng = mulberry32(hashString(`rival-portrait:${id}`));
  const nose = `<path d="M60 70 L57 81 L63 81"/>`;
  return [
    buildPortraitTorso(rng),
    `<ellipse cx="60" cy="68" rx="26" ry="32"/>`,
    pick(rng, EARS),
    pick(rng, HAIRS),
    pick(rng, BROWS),
    pick(rng, EYES),
    nose,
    pick(rng, FACIAL_HAIR),
    pick(rng, MOUTHS),
    pick(rng, ACCESSORIES),
  ].join("\n  ");
}

function buildPortraitTorso(rng) {
  const variants = [
    `<path d="M10 140 C12 112 34 103 60 103 C86 103 108 112 110 140"/><path d="M50 94 L50 104 M70 94 L70 104"/>`,
    `<path d="M14 140 C16 114 36 105 60 105 C84 105 104 114 106 140"/><path d="M52 96 L49 106 M68 96 L71 106"/>`,
    `<path d="M8 140 C10 110 36 100 60 100 C84 100 110 110 112 140"/><path d="M48 92 L48 102 M72 92 L72 102"/><path d="M38 112 L82 112"/>`,
  ];
  return pick(rng, variants);
}

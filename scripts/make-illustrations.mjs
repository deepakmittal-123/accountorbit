// Generates AccountOrbit's original SVG illustrations and icons into src/assets/illustrations/.
// Every shape is drawn here from simple geometry. Nothing is copied from any reference site, and no scene contains readable pseudo-text.
// Usage: npm run illustrations
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'src/assets/illustrations';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const C = { teal: '#15998E', deep: '#075D58', mint: '#E7F8F5', mint2: '#BFE9E2', mint3: '#7FD3C7', gold: '#FFC247', gold2: '#F2A93B', ink: '#132B32', slate: '#526A70', white: '#FFFFFF', coral: '#F2845C', line: '#DCEBE8', steel: '#9DB4B8', wood: '#B98A5E' };
const at = (x, y, s, body, r = 0) => `<g transform="translate(${x} ${y}) scale(${s})${r ? ` rotate(${r})` : ''}">${body}</g>`;
const rr = (x, y, w, h, r, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}"${extra ? ' ' + extra : ''}/>`;
const circ = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${extra ? ' ' + extra : ''}/>`;
const p = (d, f, extra = '') => `<path d="${d}" fill="${f}"${extra ? ' ' + extra : ''}/>`;
const line = (d, s = C.ink, w = 4) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const bars = (x, y, w, n, gap = 14, col = C.line) => Array.from({ length: n }, (_, i) => rr(x, y + i * gap, i % 3 === 2 ? w * 0.6 : w, 6, 3, col)).join('');
const rupee = (x, y, s = 1, col = C.deep) => at(x, y, s, line('M-9 -13H9M-9 -5H9M-4 -13C7 -13 7 3 -4 3H-9L6 15', col, 3.6));

// Props, each drawn around roughly a 100 x 100 box.
const props = {
  ledger: () => rr(8, 6, 84, 92, 8, C.deep) + rr(16, 12, 72, 80, 5, C.white) + rr(16, 12, 12, 80, 3, C.mint2) + bars(36, 26, 44, 4, 14) + rr(36, 80, 28, 7, 3, C.gold),
  invoice: () => p('M16 4H84V94L74 87L64 94L54 87L44 94L34 87L24 94L16 88Z', C.white, `stroke="${C.line}" stroke-width="2"`) + circ(34, 24, 9, C.mint2) + rupee(34, 24, 0.5) + bars(50, 18, 26, 2, 11) + bars(28, 46, 46, 3, 12) + rr(52, 73, 22, 7, 3, C.gold),
  calculator: () => rr(16, 4, 68, 92, 10, C.ink) + rr(25, 13, 50, 20, 4, C.mint2) + [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => rr(25 + c * 18, 41 + r * 17, 14, 12, 3, r === 2 && c === 2 ? C.gold : C.white))).join(''),
  coin: () => circ(50, 50, 40, C.gold2) + circ(50, 46, 40, C.gold) + circ(50, 46, 30, 'none', `stroke="${C.gold2}" stroke-width="3"`) + rupee(50, 46, 1.2, C.ink),
  coins: () => [0, 1, 2, 3].map((i) => rr(22, 72 - i * 13, 56, 16, 8, i % 2 ? C.gold : C.gold2)).join('') + circ(70, 26, 18, C.gold) + rupee(70, 26, 0.65, C.ink),
  chart: () => rr(6, 8, 88, 84, 8, C.white, `stroke="${C.line}" stroke-width="2"`) + rr(20, 56, 12, 24, 3, C.mint3) + rr(38, 42, 12, 38, 3, C.teal) + rr(56, 50, 12, 30, 3, C.mint3) + rr(74, 24, 12, 56, 3, C.gold),
  pie: () => circ(50, 50, 42, C.mint3) + p('M50 50L50 8A42 42 0 0 1 92 50Z', C.gold) + p('M50 50L92 50A42 42 0 0 1 58 91Z', C.deep) + circ(50, 50, 15, C.white),
  plant: () => p('M34 66H66L61 96H39Z', C.coral) + p('M50 66C30 56 22 36 26 16C42 24 52 42 50 66Z', C.teal) + p('M50 66C70 54 78 40 76 22C60 28 50 46 50 66Z', C.deep) + p('M50 66C42 50 44 28 52 6C60 26 58 50 50 66Z', C.mint3),
  briefcase: () => rr(36, 14, 28, 18, 4, 'none', `stroke="${C.ink}" stroke-width="5"`) + rr(8, 28, 84, 62, 8, C.deep) + rr(8, 28, 84, 28, 8, C.teal) + rr(43, 48, 14, 14, 3, C.gold),
  phone: () => rr(26, 4, 48, 92, 9, C.ink) + rr(31, 13, 38, 70, 3, C.mint) + circ(50, 89, 3, C.white) + bars(36, 22, 28, 3, 11, C.mint3) + rr(36, 60, 28, 14, 4, C.gold),
  shop: () => rr(14, 42, 72, 52, 3, C.white, `stroke="${C.line}" stroke-width="2"`) + [0, 1, 2, 3, 4].map((i) => p(`M${8 + i * 17} 16H${25 + i * 17}V36A8.5 8.5 0 0 1 ${8 + i * 17} 36Z`, i % 2 ? C.gold : C.teal)).join('') + rr(22, 56, 24, 38, 2, C.deep) + rr(54, 56, 24, 22, 2, C.mint2),
  factory: () => p('M8 94V48L32 62V48L56 62V30H90V94Z', C.deep) + rr(62, 8, 11, 24, 2, C.ink) + rr(78, 18, 9, 14, 2, C.ink) + circ(70, 2, 6, C.mint2) + [18, 40, 62].map((x) => rr(x, 72, 14, 12, 2, C.gold)).join(''),
  truck: () => rr(4, 28, 60, 44, 4, C.teal) + p('M64 42H84L96 58V72H64Z', C.deep) + rr(72, 47, 12, 11, 2, C.mint) + circ(24, 76, 11, C.ink) + circ(24, 76, 4, C.white) + circ(78, 76, 11, C.ink) + circ(78, 76, 4, C.white) + rr(12, 38, 26, 7, 3, C.gold),
  boxes: () => rr(10, 54, 40, 40, 3, C.wood) + rr(50, 54, 40, 40, 3, '#CFA275') + rr(30, 14, 40, 40, 3, '#DDB88F') + rr(44, 14, 12, 14, 0, C.white, 'opacity=".55"') + rr(24, 54, 12, 14, 0, C.white, 'opacity=".55"') + rr(64, 54, 12, 14, 0, C.white, 'opacity=".55"'),
  stethoscope: () => line('M28 10V36A22 22 0 0 0 72 36V10', C.deep, 7) + line('M50 58V70A18 18 0 0 0 86 70V58', C.deep, 7) + circ(86, 50, 10, C.gold) + circ(28, 8, 5, C.ink) + circ(72, 8, 5, C.ink),
  scales: () => rr(46, 10, 8, 76, 3, C.deep) + rr(26, 86, 48, 8, 4, C.ink) + rr(12, 20, 76, 6, 3, C.deep) + line('M20 24L8 58M20 24L32 58', C.slate, 3) + line('M80 24L68 50M80 24L92 50', C.slate, 3) + p('M4 58H36A16 12 0 0 1 4 58Z', C.gold) + p('M64 50H96A16 12 0 0 1 64 50Z', C.gold),
  plate: () => circ(50, 52, 34, C.white, `stroke="${C.line}" stroke-width="2"`) + circ(50, 52, 22, C.mint) + rr(4, 22, 6, 62, 3, C.deep) + line('M2 22V38M12 22V38', C.deep, 3) + rr(90, 22, 6, 62, 3, C.deep) + p('M90 20C100 28 100 44 90 50Z', C.deep),
  building: () => rr(20, 6, 60, 90, 4, C.deep) + [0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => rr(29 + c * 16, 16 + r * 18, 10, 11, 2, r === 1 && c === 1 ? C.gold : C.mint2))).join('') + rr(43, 80, 14, 16, 2, C.ink),
  pin: () => p('M50 96C28 66 16 52 16 36A34 34 0 0 1 84 36C84 52 72 66 50 96Z', C.coral) + circ(50, 36, 14, C.white),
  shield: () => p('M50 4L88 18V50C88 72 70 88 50 96C30 88 12 72 12 50V18Z', C.teal) + p('M50 4L88 18V50C88 72 70 88 50 96Z', C.deep) + line('M32 50L45 63L70 36', C.white, 8),
  magnifier: () => circ(42, 42, 30, C.mint, `stroke="${C.deep}" stroke-width="8"`) + rr(62, 66, 38, 11, 5, C.ink, 'transform="rotate(45 66 70)"') + bars(28, 32, 28, 2, 12, C.teal),
  gear: () => Array.from({ length: 8 }, (_, i) => rr(42, 4, 16, 92, 4, C.slate, `transform="rotate(${i * 22.5} 50 50)"`)).join('') + circ(50, 50, 32, C.slate) + circ(50, 50, 14, C.white),
  calendar: () => rr(8, 14, 84, 80, 8, C.white, `stroke="${C.line}" stroke-width="2"`) + rr(8, 14, 84, 22, 8, C.teal) + rr(26, 4, 7, 20, 3, C.ink) + rr(67, 4, 7, 20, 3, C.ink) + [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => rr(18 + c * 17, 46 + r * 15, 11, 9, 2, r === 1 && c === 2 ? C.gold : C.mint2))).join(''),
  cart: () => line('M6 14H22L34 66H80L90 28H26', C.deep, 7) + circ(42, 84, 8, C.ink) + circ(72, 84, 8, C.ink) + rr(40, 30, 16, 20, 2, C.gold) + rr(60, 36, 14, 14, 2, C.teal),
  rocket: () => p('M50 2C72 22 74 52 66 74H34C26 52 28 22 50 2Z', C.white, `stroke="${C.line}" stroke-width="2"`) + circ(50, 36, 11, C.teal) + p('M34 56L14 78L34 74Z', C.coral) + p('M66 56L86 78L66 74Z', C.coral) + p('M40 76H60L50 98Z', C.gold),
  gem: () => p('M26 14H74L94 40L50 94L6 40Z', C.mint3) + p('M26 14L38 40H6ZM74 14L62 40H94ZM38 40H62L50 94Z', C.teal) + p('M38 40L50 14L62 40Z', C.mint2),
  shirt: () => p('M32 8L10 22L18 44L30 38V94H70V38L82 44L90 22L68 8C64 18 36 18 32 8Z', C.teal) + p('M32 8C36 18 64 18 68 8L60 6C56 12 44 12 40 6Z', C.deep) + rr(56, 44, 9, 2, 1, C.gold),
  wheel: () => circ(50, 50, 44, C.ink) + circ(50, 50, 26, C.steel) + Array.from({ length: 5 }, (_, i) => rr(47, 26, 6, 48, 3, C.ink, `transform="rotate(${i * 36} 50 50)"`)).join('') + circ(50, 50, 8, C.gold),
  sofa: () => rr(16, 26, 68, 38, 10, C.teal) + rr(4, 44, 22, 36, 8, C.deep) + rr(74, 44, 22, 36, 8, C.deep) + rr(20, 56, 60, 24, 6, C.mint3) + rr(16, 80, 8, 12, 2, C.ink) + rr(76, 80, 8, 12, 2, C.ink),
  chip: () => rr(22, 22, 56, 56, 6, C.deep) + rr(36, 36, 28, 28, 3, C.gold) + [28, 42, 56, 70].flatMap((n) => [rr(n - 2, 8, 4, 14, 2, C.slate), rr(n - 2, 78, 4, 14, 2, C.slate), rr(8, n - 2, 14, 4, 2, C.slate), rr(78, n - 2, 14, 4, 2, C.slate)]).join(''),
  book: () => p('M50 18C38 8 20 8 6 12V86C20 82 38 82 50 92Z', C.teal) + p('M50 18C62 8 80 8 94 12V86C80 82 62 82 50 92Z', C.deep) + bars(16, 28, 24, 3, 12, C.mint2) + bars(60, 28, 24, 3, 12, C.mint2),
  sack: () => p('M34 14C28 22 16 44 16 66C16 86 30 94 50 94S84 86 84 66C84 44 72 22 66 14Z', C.wood) + rr(32, 10, 36, 9, 4, C.ink) + circ(50, 62, 18, C.gold) + circ(44, 58, 3, C.coral) + circ(55, 66, 3, C.coral) + circ(55, 55, 3, C.coral),
  toy: () => rr(8, 56, 38, 38, 6, C.coral) + rr(54, 56, 38, 38, 6, C.teal) + rr(30, 16, 40, 40, 6, C.gold) + circ(50, 36, 9, C.white) + circ(27, 75, 8, C.white) + circ(73, 75, 8, C.white),
  coil: () => circ(50, 50, 44, C.steel) + circ(50, 50, 34, '#B8CBCE') + circ(50, 50, 24, C.steel) + circ(50, 50, 14, C.ink),
  speech: () => p('M10 10H90A6 6 0 0 1 96 16V62A6 6 0 0 1 90 68H44L24 88V68H10A6 6 0 0 1 4 62V16A6 6 0 0 1 10 10Z', C.teal) + bars(18, 24, 64, 3, 12, C.white),
  callout: () => p('M26 8L40 34L30 44C36 56 44 64 56 70L66 60L92 74C90 86 80 94 68 92C38 86 14 62 8 32C6 20 14 10 26 8Z', C.deep) + line('M60 12A28 28 0 0 1 88 40M60 28A12 12 0 0 1 72 40', C.gold, 5),
  checklist: () => rr(14, 6, 72, 90, 8, C.white, `stroke="${C.line}" stroke-width="2"`) + rr(36, 0, 28, 13, 4, C.deep) + [0, 1, 2, 3].map((i) => line(`M24 ${28 + i * 16}L29 ${33 + i * 16}L37 ${24 + i * 16}`, C.teal, 3.5) + rr(44, 26 + i * 16, 32, 6, 3, C.line)).join(''),
  folder: () => p('M6 26A6 6 0 0 1 12 20H38L48 32H88A6 6 0 0 1 94 38V84A6 6 0 0 1 88 90H12A6 6 0 0 1 6 84Z', C.gold) + rr(6, 42, 88, 48, 6, C.gold2) + rr(20, 12, 44, 30, 3, C.white, 'opacity=".9"'),
  lock: () => rr(30, 8, 40, 50, 18, 'none', `stroke="${C.deep}" stroke-width="8"`) + rr(14, 42, 72, 52, 8, C.teal) + circ(50, 62, 8, C.white) + rr(47, 62, 6, 16, 3, C.white),
  clock: () => circ(50, 50, 44, C.white, `stroke="${C.deep}" stroke-width="7"`) + line('M50 24V52L68 62', C.ink, 6) + circ(50, 50, 5, C.gold),
  globe: () => circ(50, 50, 44, C.mint3) + p('M28 22C42 14 56 20 54 34C52 44 34 44 32 56C30 66 18 58 14 46C14 36 20 28 28 22ZM66 52C76 48 88 52 90 58C86 74 74 86 62 90C56 76 58 58 66 52Z', C.deep),
  plane: () => p('M4 50L96 8L66 92L50 60Z', C.teal) + p('M50 60L96 8L58 76Z', C.deep),
  printer: () => rr(26, 6, 48, 30, 3, C.white, `stroke="${C.line}" stroke-width="2"`) + rr(8, 34, 84, 40, 8, C.deep) + rr(26, 60, 48, 34, 3, C.white, `stroke="${C.line}" stroke-width="2"`) + bars(34, 68, 32, 2, 10, C.mint3) + circ(78, 46, 4, C.gold),
  cross: () => circ(50, 50, 44, C.white, `stroke="${C.line}" stroke-width="2"`) + rr(40, 22, 20, 56, 4, C.teal) + rr(22, 40, 56, 20, 4, C.teal),
  map: () => p('M6 18L34 8L66 18L94 8V82L66 92L34 82L6 92Z', C.mint2) + p('M34 8V82L6 92V18ZM94 8V82L66 92V18Z', C.mint3) + line('M18 62C30 48 44 58 54 44S76 30 84 26', C.deep, 3) + circ(84, 26, 6, C.coral),
  signed: () => rr(14, 4, 72, 92, 6, C.white, `stroke="${C.line}" stroke-width="2"`) + bars(26, 18, 48, 3, 12) + line('M26 72C34 56 38 84 46 68S58 74 66 66', C.deep, 3.5) + rr(26, 80, 48, 3, 1, C.line),
  bulb: () => p('M50 6A32 32 0 0 1 68 64V74H32V64A32 32 0 0 1 50 6Z', C.gold) + rr(34, 76, 32, 7, 3, C.ink) + rr(40, 87, 20, 7, 3, C.ink) + line('M42 72V52L50 44L58 52V72', C.gold2, 3),
  laptop: () => rr(16, 10, 68, 50, 5, C.ink) + rr(21, 15, 58, 40, 2, C.mint) + rr(28, 36, 7, 14, 1, C.teal) + rr(40, 28, 7, 22, 1, C.gold) + rr(52, 22, 7, 28, 1, C.deep) + rr(64, 32, 7, 18, 1, C.mint3) + p('M6 62H94L88 74H12Z', C.slate),
  team: () => circ(32, 34, 15, C.deep) + p('M8 90C8 66 18 54 32 54S56 66 56 90Z', C.deep) + circ(68, 34, 15, C.teal) + p('M44 90C44 66 54 54 68 54S92 66 92 90Z', C.teal),
  link: () => rr(8, 34, 52, 32, 16, 'none', `stroke="${C.deep}" stroke-width="9"`) + rr(40, 34, 52, 32, 16, 'none', `stroke="${C.gold2}" stroke-width="9"`),
  key: () => circ(30, 32, 22, 'none', `stroke="${C.gold2}" stroke-width="10"`) + line('M46 48L88 90M72 74L84 62M84 86L94 76', C.gold2, 10),
  growth: () => line('M8 80L34 54L52 66L90 18', C.teal, 9) + p('M70 12H96V38Z', C.gold),
  noted: () => rr(12, 12, 76, 76, 8, C.gold) + bars(24, 28, 52, 3, 14, C.gold2) + p('M88 60V88H60Z', C.gold2),
};

// A person from the chest up, drawn so a desk can sit in front of them. Each option changes who they look like.
const SKIN = ['#F2C9A5', '#C98F63', '#8D5A3C', '#E4AE85'];
const person = (o = {}) => {
  const skin = SKIN[o.skin ?? 0], top = o.top || C.gold, hair = o.hairCol || C.ink, style = o.hair || 'short';
  const back = style === 'long' ? p('M52 48C46 12 114 12 108 48L114 118H46Z', hair) : style === 'bun' ? circ(80, 8, 13, hair) : '';
  const front = {
    short: p('M54 44C50 16 110 14 106 44C96 32 68 30 54 44Z', hair),
    long: p('M54 44C50 16 110 14 106 44C94 34 80 30 72 26C66 34 60 38 54 44Z', hair),
    bun: p('M54 44C50 18 110 16 106 44C94 34 66 34 54 44Z', hair),
    bald: p('M56 34C62 20 98 20 104 34C90 28 70 28 56 34Z', hair),
    turban: p('M50 40C46 8 114 8 110 40C94 26 66 26 50 40Z', C.coral) + p('M50 40C66 18 94 18 110 40L100 42C88 28 68 30 60 44Z', '#D96D47'),
  }[style] || '';
  const beard = o.beard ? p('M58 50C60 80 100 80 102 50C96 62 64 62 58 50Z', hair) : '';
  const specs = o.glasses ? circ(68, 48, 8, 'none', `stroke="${C.ink}" stroke-width="2.5"`) + circ(92, 48, 8, 'none', `stroke="${C.ink}" stroke-width="2.5"`) + line('M76 48H84', C.ink, 2.5) : '';
  return back + p('M14 200C14 118 40 94 80 94S146 118 146 200Z', top) + rr(68, 70, 24, 32, 10, skin) + p('M66 96L80 112L94 96L88 92H72Z', C.white) + p('M56 44C56 76 68 84 80 84S104 76 104 44C104 28 56 28 56 44Z', skin) + front + beard + specs + circ(69, 50, 2.4, C.ink) + circ(91, 50, 2.4, C.ink) + line('M73 66C77 70 83 70 87 66', C.ink, 2.2);
};

const dots = (x, y, n, m, col = C.mint3) => Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => circ(x + i * 14, y + j * 14, 2, col)).join('')).join('');
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="presentation">${body}</svg>\n`;

// The main scene: a person at a desk with the page's subject beside them, and related items floating around.
function scene({ big, floats = [], who = {}, tone = 0, screen = 'laptop' }) {
  const blob = ['M70 250C30 130 150 30 300 40C450 50 610 90 600 250C592 390 470 440 310 430C170 420 100 360 70 250Z', 'M40 220C50 90 190 20 340 40C490 60 620 130 590 270C565 400 430 450 280 420C130 395 30 350 40 220Z', 'M90 200C110 80 250 20 390 50C530 80 610 170 570 290C530 410 380 450 240 410C110 375 70 310 90 200Z'][tone % 3];
  const slots = [[300, 34, 0.62], [430, 28, 0.74], [552, 112, 0.5], [44, 120, 0.6]];
  return svg(640, 480,
    p(blob, C.mint2) + circ(590, 66, 22, 'none', `stroke="${C.gold}" stroke-width="8"`) + dots(40, 34, 6, 4) +
    at(28, 296, 0.92, props.plant()) +
    at(92, 120, 1.34, person(who)) +
    rr(66, 372, 508, 16, 8, C.ink) + rr(120, 388, 12, 62, 4, C.slate) + rr(508, 388, 12, 62, 4, C.slate) +
    at(158, 262, 1.14, props[screen]()) +
    at(378, 170, 1.96, props[big]()) +
    floats.slice(0, 4).map((f, i) => at(slots[i][0], slots[i][1], slots[i][2], `<g>${rr(-14, -14, 128, 128, 26, C.white)}${at(0, 0, 1, props[f]())}</g>`)).join('')
  );
}

// A smaller scene for call-to-action bands. No person, so it stays light.
const bandScene = (a, b, c) => svg(420, 300, circ(210, 158, 130, 'rgba(255,255,255,.14)') + circ(350, 56, 22, 'none', `stroke="${C.gold}" stroke-width="8"`) + at(120, 66, 1.8, props[a]()) + at(34, 40, 0.8, `${rr(-12, -12, 124, 124, 24, C.white)}${props[b]()}`) + at(310, 170, 0.8, `${rr(-12, -12, 124, 124, 24, C.white)}${props[c]()}`));

// One round icon for cards.
const icon = (name) => svg(96, 96, circ(48, 48, 48, C.mint) + at(20, 20, 0.56, props[name]()));

const W = (i, extra = {}) => ({ skin: i % 4, hair: ['short', 'long', 'bun', 'short', 'turban', 'bald'][i % 6], top: [C.gold, C.teal, C.coral, C.deep, C.mint3, C.gold2][(i * 5) % 6], glasses: i % 3 === 0, beard: i % 5 === 1 && ['short', 'turban', 'bald'].includes(['short', 'long', 'bun', 'short', 'turban', 'bald'][i % 6]), ...extra });

// Every illustrated route has its own subject and supporting items. Legal pages stay plain, so nothing interrupts reading.
const SCENES = {
  'home': ['ledger', ['invoice', 'coin', 'chart', 'speech']],
  'how-it-works': ['speech', ['checklist', 'callout', 'team', 'shield']],
  'about-us': ['shield', ['bulb', 'speech', 'checklist', 'team']],
  'contact-us': ['callout', ['speech', 'map', 'checklist', 'clock']],
  'request-an-accountant': ['checklist', ['speech', 'callout', 'lock', 'folder']],
  'for-accounting-professionals': ['briefcase', ['scales', 'link', 'checklist', 'signed']],
  'not-found': ['magnifier', ['ledger', 'map', 'invoice', 'speech']],
  'services': ['ledger', ['calculator', 'chart', 'invoice', 'gear']],
  'industries': ['building', ['shop', 'factory', 'stethoscope', 'cart']],
  'guides': ['book', ['bulb', 'checklist', 'magnifier', 'noted']],
  'locations': ['map', ['pin', 'building', 'shop', 'factory']],
  'accounting-bookkeeping': ['ledger', ['calculator', 'invoice', 'chart', 'folder']],
  'outsourced-accounting': ['link', ['folder', 'team', 'laptop', 'clock']],
  'tally-zoho-accounting': ['laptop', ['gear', 'ledger', 'chart', 'invoice']],
  'payroll-services': ['team', ['coin', 'calendar', 'signed', 'shield']],
  'gst-registration': ['signed', ['shield', 'building', 'checklist', 'key']],
  'gst-return-filing': ['calendar', ['invoice', 'checklist', 'clock', 'folder']],
  'gst-notice-litigation': ['scales', ['signed', 'magnifier', 'clock', 'speech']],
  'income-tax-return-filing': ['invoice', ['calculator', 'coin', 'calendar', 'checklist']],
  'income-tax-notice-handling': ['signed', ['magnifier', 'scales', 'clock', 'shield']],
  'tds-return-filing': ['pie', ['coin', 'calendar', 'invoice', 'team']],
  'company-llp-registration': ['building', ['signed', 'key', 'team', 'briefcase']],
  'roc-mca-compliance': ['folder', ['calendar', 'signed', 'building', 'checklist']],
  'msme-udyam-registration': ['factory', ['key', 'checklist', 'shield', 'growth']],
  'audit-support': ['magnifier', ['ledger', 'checklist', 'folder', 'scales']],
  'virtual-cfo': ['growth', ['chart', 'pie', 'bulb', 'briefcase']],
  'accounting-for-doctors': ['stethoscope', ['cross', 'invoice', 'coin', 'calendar']],
  'accounting-for-lawyers': ['scales', ['briefcase', 'signed', 'book', 'clock']],
  'accounting-for-clinics': ['cross', ['stethoscope', 'team', 'invoice', 'gear']],
  'accounting-for-retail-shops': ['shop', ['coin', 'phone', 'invoice', 'boxes']],
  'accounting-for-traders': ['boxes', ['truck', 'ledger', 'coin', 'link']],
  'accounting-for-ecommerce-sellers': ['cart', ['phone', 'boxes', 'truck', 'pie']],
  'accounting-for-small-businesses': ['shop', ['ledger', 'bulb', 'calendar', 'coin']],
  'accounting-for-restaurants': ['plate', ['invoice', 'phone', 'coin', 'team']],
  'accounting-for-manufacturers': ['factory', ['gear', 'boxes', 'truck', 'chart']],
  'accounting-for-consultants': ['briefcase', ['laptop', 'clock', 'invoice', 'globe']],
  'accounting-for-startups': ['rocket', ['growth', 'bulb', 'team', 'coin']],
  'accounting-for-real-estate-businesses': ['building', ['key', 'signed', 'pin', 'coin']],
  'accountant-vs-chartered-accountant': ['scales', ['team', 'shield', 'ledger', 'magnifier']],
  'how-to-hire-an-accountant-in-delhi': ['team', ['checklist', 'speech', 'map', 'signed']],
  'monthly-accounting-documents-checklist': ['checklist', ['folder', 'calendar', 'invoice', 'noted']],
  'bookkeeping-vs-outsourced-accounting': ['ledger', ['link', 'team', 'folder', 'scales']],
  'documents-required-for-gst-return-filing': ['folder', ['invoice', 'calendar', 'checklist', 'magnifier']],
  'what-is-tally-accounting': ['laptop', ['ledger', 'chart', 'book', 'gear']],
  'accounting-for-small-businesses-guide': ['book', ['shop', 'ledger', 'bulb', 'coin']],
  'accounting-services-cost-in-delhi': ['coins', ['invoice', 'calculator', 'magnifier', 'pie']],
  'commercial-professional': ['building', ['briefcase', 'laptop', 'stethoscope', 'pin']],
  'wholesale-trading': ['boxes', ['truck', 'shop', 'ledger', 'pin']],
  'industrial-manufacturing': ['factory', ['gear', 'truck', 'map', 'boxes']],
  'accounting-services-in-nehru-place': ['chip', ['laptop', 'gear', 'invoice', 'building']],
  'accounting-services-in-gandhi-nagar': ['shirt', ['boxes', 'ledger', 'link', 'truck']],
  'accounting-services-in-khari-baoli': ['sack', ['truck', 'link', 'invoice', 'plant']],
  'accounting-services-in-sadar-bazaar': ['toy', ['boxes', 'calendar', 'plane', 'invoice']],
  'accounting-services-in-chandni-chowk': ['gem', ['book', 'shirt', 'bulb', 'map']],
  'accounting-services-in-kashmere-gate': ['wheel', ['truck', 'gear', 'invoice', 'link']],
  'accounting-services-in-kirti-nagar': ['sofa', ['signed', 'boxes', 'plant', 'team']],
  'accounting-services-in-karol-bagh': ['phone', ['gem', 'shirt', 'gear', 'magnifier']],
  'accounting-services-in-okhla-industrial-area': ['plane', ['shirt', 'printer', 'factory', 'signed']],
  'accounting-services-in-wazirpur-industrial-area': ['coil', ['factory', 'pie', 'truck', 'gear']],
  'accounting-services-in-mayapuri-industrial-area': ['wheel', ['coil', 'boxes', 'magnifier', 'coin']],
  'accounting-services-in-bawana-industrial-area': ['map', ['factory', 'key', 'signed', 'calendar']],
};

let i = 0;
for (const [slug, [big, floats]] of Object.entries(SCENES)) {
  writeFileSync(`${OUT}/${slug}.svg`, scene({ big, floats, who: W(i), tone: i, screen: big === 'laptop' ? 'ledger' : 'laptop' }));
  i++;
}
writeFileSync(`${OUT}/band-enquiry.svg`, bandScene('speech', 'checklist', 'callout'));
writeFileSync(`${OUT}/band-about.svg`, bandScene('shield', 'team', 'ledger'));
writeFileSync(`${OUT}/band-start.svg`, bandScene('callout', 'noted', 'lock'));
// A monogram, not a person, so nothing here could be mistaken for a photograph of the owner. Replace with the approved portrait when supplied.
writeFileSync(`${OUT}/owner-monogram.svg`, svg(480, 560, rr(0, 0, 480, 560, 0, C.mint2) + circ(420, 70, 120, C.teal, 'opacity=".22"') + circ(50, 520, 110, C.white, 'opacity=".5"') + circ(240, 280, 150, C.deep) + circ(240, 280, 150, 'none', `stroke="${C.gold}" stroke-width="6" stroke-dasharray="2 14" stroke-linecap="round" transform="scale(1.1) translate(-21.8 -25.5)"`) + p('M150 215H193C232 215 256 241 256 280S232 345 193 345H150ZM174 237V323H192C217 323 231 306 231 280S217 237 192 237Z', C.white, 'fill-rule="evenodd"') + p('M268 345V215H292L320 282L348 215H372V345H349V259L328 310H312L291 259V345Z', C.gold)));
for (const n of ['ledger', 'invoice', 'calculator', 'coin', 'pie', 'chart', 'building', 'speech', 'magnifier', 'callout', 'stethoscope', 'cross', 'scales', 'briefcase', 'shop', 'boxes', 'cart', 'plate', 'factory', 'rocket', 'checklist', 'map', 'shield', 'team', 'book', 'lock', 'signed', 'folder', 'laptop', 'bulb']) writeFileSync(`${OUT}/icon-${n}.svg`, icon(n));

// Stop if a built route has no illustration, unless it is meant to be plain.
const PLAIN = new Set(['privacy-policy', 'terms-and-conditions', 'disclaimer', 'about-me']);
const built = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built);
const slugOf = (u) => (u === '/' ? 'home' : u.replace(/\/$/, '').split('/').pop());
const missing = built.map((r) => slugOf(r.url)).filter((s) => !SCENES[s] && !PLAIN.has(s));
if (missing.length) throw new Error(`No illustration for: ${missing.join(', ')}`);
console.log(`${Object.keys(SCENES).length} scenes and icons written to ${OUT}`);

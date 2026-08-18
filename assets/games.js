/* Language-independent game formats, prize-tier tables (best rank first), and example draws.
   Ranges: main numbers go from mainMin..mainMax, bonus numbers (if any) from bonusMin..bonusMax.
   Tiers are [mainMatches, bonusMatches] tuples; for bonusCount === 0 games only the main
   count is compared. This is an unofficial simplification for demo purposes. */
const GAME_ORDER = ["euromillions", "eurojackpot", "lotto49", "loto", "lotto645"];

const GAME_SPECS = {
  euromillions: {
    icon: "🌟",
    mainCount: 5, mainMin: 1, mainMax: 50,
    bonusCount: 2, bonusMin: 1, bonusMax: 12,
    tiers: [[5, 2], [5, 1], [5, 0], [4, 2], [4, 1], [3, 2], [4, 0], [2, 2], [3, 1], [3, 0], [1, 2], [2, 1], [2, 0]],
    examples: [
      { main: [7, 14, 22, 35, 41], bonus: [3, 9] },
      { main: [2, 18, 27, 33, 49], bonus: [6, 11] }
    ]
  },
  eurojackpot: {
    icon: "🚀",
    mainCount: 5, mainMin: 1, mainMax: 50,
    bonusCount: 2, bonusMin: 1, bonusMax: 12,
    tiers: [[5, 2], [5, 1], [5, 0], [4, 2], [4, 1], [3, 2], [4, 0], [2, 2], [3, 1], [3, 0], [1, 2], [2, 1]],
    examples: [
      { main: [4, 12, 29, 38, 45], bonus: [5, 10] },
      { main: [9, 16, 24, 31, 47], bonus: [2, 7] }
    ]
  },
  lotto49: {
    icon: "🇩🇪",
    mainCount: 6, mainMin: 1, mainMax: 49,
    bonusCount: 1, bonusMin: 0, bonusMax: 9,
    tiers: [[6, 1], [6, 0], [5, 1], [5, 0], [4, 1], [4, 0], [3, 1], [3, 0], [2, 1]],
    examples: [
      { main: [3, 11, 19, 27, 34, 44], bonus: [6] },
      { main: [5, 14, 22, 30, 39, 48], bonus: [2] }
    ]
  },
  loto: {
    icon: "🇫🇷",
    mainCount: 5, mainMin: 1, mainMax: 49,
    bonusCount: 1, bonusMin: 1, bonusMax: 10,
    tiers: [[5, 1], [5, 0], [4, 1], [4, 0], [3, 1], [3, 0], [2, 1], [1, 1], [0, 1]],
    examples: [
      { main: [6, 13, 21, 29, 44], bonus: [7] },
      { main: [2, 9, 18, 27, 41], bonus: [3] }
    ]
  },
  lotto645: {
    icon: "🇳🇱",
    mainCount: 6, mainMin: 1, mainMax: 45,
    bonusCount: 0, bonusMin: 0, bonusMax: 0,
    tiers: [[6, 0], [5, 0], [4, 0], [3, 0]],
    examples: [
      { main: [4, 10, 17, 23, 31, 40], bonus: [] },
      { main: [3, 12, 19, 28, 36, 44], bonus: [] }
    ]
  }
};

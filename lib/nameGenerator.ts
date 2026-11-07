// Indian-style name generator for filler leaderboard entries

const firstNames = [
  "Aarav", "Arjun", "Vivaan", "Aditya", "Vihaan", "Sai", "Rohan", "Rahul",
  "Krishna", "Kartik", "Ishaan", "Shaurya", "Atharv", "Ananya", "Diya",
  "Priya", "Kavya", "Isha", "Pooja", "Meera", "Shreya", "Tanvi", "Ritika",
  "Neha", "Riya", "Simran", "Aisha", "Divya", "Nisha", "Preeti", "Sneha",
  "Kiran", "Deepa", "Anjali", "Swati", "Rupali", "Rekha", "Sunita", "Usha",
  "Vandana", "Mohan", "Suresh", "Ramesh", "Dinesh", "Mahesh", "Ganesh",
  "Lokesh", "Rajesh", "Mukesh", "Naresh", "Hitesh", "Jitesh", "Ritesh",
  "Umesh", "Yogesh", "Manish", "Danish", "Ashish", "Harish", "Girish",
  "Nilesh", "Paresh", "Kamlesh", "Brijesh", "Santosh", "Rakesh", "Ramesh",
];

const lastNames = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Mehta",
  "Joshi", "Pandey", "Mishra", "Tiwari", "Shukla", "Dubey", "Yadav",
  "Chauhan", "Rajput", "Thakur", "Rao", "Reddy", "Naidu", "Pillai",
  "Nair", "Menon", "Iyer", "Krishnan", "Rajan", "Varma", "Murthy",
  "Agarwal", "Bansal", "Garg", "Goyal", "Jain", "Khanna", "Kapoor",
  "Malhotra", "Sethi", "Arora", "Bhatia", "Chopra", "Dhawan", "Grover",
  "Lal", "Mittal", "Nanda", "Oberoi", "Qureshi", "Rastogi", "Saxena",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateFillerName(rank: number, hackathonId: string): string {
  const seed = rank * 31337 + hackathonId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  const first = firstNames[Math.floor(rng() * firstNames.length)];
  const last = lastNames[Math.floor(rng() * lastNames.length)];
  return `${first} ${last}`;
}

/**
 * Generate filler scores for every rank NOT held by a real participant.
 * Real participants are fixed anchors at the ranks the admin chose; filler
 * scores are linearly interpolated between neighbouring anchors, so the whole
 * leaderboard is non-increasing with rank (ties only if the admin gave a lower
 * rank a higher score).
 */
export function generateFillerScores(
  realEntries: { rank: number; score: number }[],
  totalSlots: number
): Map<number, number> {
  const TOP = 99;
  const BOTTOM = 1;

  const anchors = new Map<number, number>();
  for (const e of realEntries) anchors.set(e.rank, e.score);
  if (!anchors.has(1)) anchors.set(1, TOP);
  if (!anchors.has(totalSlots)) anchors.set(totalSlots, BOTTOM);

  // Anchors sorted by rank, forced to be non-increasing so interpolation never inverts.
  const sorted = [...anchors.entries()].sort((a, b) => a[0] - b[0]);
  let running = Infinity;
  const fixed = sorted.map(([rank, score]) => {
    running = Math.min(running, score);
    return { rank, score: running };
  });

  const realRanks = new Set(realEntries.map((e) => e.rank));
  const scores = new Map<number, number>();
  // Endpoint anchors that aren't real participants are filler slots too.
  for (const f of fixed) if (!realRanks.has(f.rank)) scores.set(f.rank, f.score);
  for (let k = 0; k < fixed.length - 1; k++) {
    const a = fixed[k];
    const b = fixed[k + 1];
    for (let rank = a.rank + 1; rank < b.rank; rank++) {
      const t = (rank - a.rank) / (b.rank - a.rank);
      const value = a.score + (b.score - a.score) * t;
      scores.set(rank, Math.max(0, parseFloat(value.toFixed(2))));
    }
  }
  return scores;
}

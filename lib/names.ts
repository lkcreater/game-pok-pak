const ADJ = ["Swift", "Brave", "Lucky", "Mighty", "Sneaky", "Cosmic", "Fuzzy", "Golden", "Rapid", "Silent", "Wild", "Jolly"];
const NOUN = ["Comet", "Falcon", "Tiger", "Panda", "Rocket", "Otter", "Dragon", "Pixel", "Mango", "Ninja", "Phoenix", "Badger"];

const pick = <T,>(xs: T[], rng: () => number) => xs[Math.floor(rng() * xs.length)];

export function randomName(rng: () => number = Math.random): string {
  return `${pick(ADJ, rng)}${pick(NOUN, rng)}-${100 + Math.floor(rng() * 900)}`;
}

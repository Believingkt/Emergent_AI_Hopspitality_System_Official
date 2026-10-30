import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Random password with letters and digits, avoiding look-alike characters (0/O, 1/l/I)
export function generatePassword(length = 14) {
  const letters = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const values = crypto.getRandomValues(new Uint32Array(length));
  const chars = Array.from(values, (v) => all[v % all.length]);
  chars[0] = letters[values[0] % letters.length];
  chars[length - 1] = digits[values[length - 1] % digits.length];
  return chars.join("");
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | { toString: () => string }): string {
  const num = typeof price === "number" ? price : parseFloat(price.toString());
  const safeNum = isNaN(num) ? 0 : num;
  return `RM ${safeNum.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

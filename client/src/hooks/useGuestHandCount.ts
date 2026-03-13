/**
 * Tracks how many hands an anonymous (guest) user has viewed.
 * Stored in localStorage. Resets when the user logs in.
 *
 * Returns:
 *   count        — current view count
 *   increment()  — call when a guest views a hand
 *   shouldGate   — true when count >= GUEST_LIMIT (3)
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "poker_guest_hand_count";
const GUEST_LIMIT = 3;

export function useGuestHandCount() {
  const [count, setCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCount(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return {
    count,
    increment,
    reset,
    shouldGate: count >= GUEST_LIMIT,
    limit: GUEST_LIMIT,
  };
}

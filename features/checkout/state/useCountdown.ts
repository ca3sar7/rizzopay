import { useState, useEffect } from "react";

export interface CountdownResult {
  formatted: string; // MM:SS
  secondsLeft: number;
  isWarning: boolean; // < 2 minutos
  isExpired: boolean;
}

export function useCountdown(expiresAt: string | null | undefined, onExpire?: () => void): CountdownResult {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    const calculate = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsLeft(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    calculate();
    const timer = setInterval(calculate, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    formatted,
    secondsLeft,
    isWarning: secondsLeft > 0 && secondsLeft < 120,
    isExpired: secondsLeft <= 0 && Boolean(expiresAt),
  };
}

import { useState, useRef, useCallback, useEffect } from "react";

interface RateLimitState {
  isBlocked: boolean;
  remainingSeconds: number;
  message: string;
}

export function useAuthRateLimit() {
  const loginFailures = useRef(0);
  const signupTimestamps = useRef<number[]>([]);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = useCallback((until: number) => {
    setLockUntil(until);
    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left <= 0) {
        setRemainingSeconds(0);
        setLockUntil(null);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setRemainingSeconds(left);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  const recordLoginFailure = useCallback(() => {
    loginFailures.current += 1;
    const failures = loginFailures.current;

    if (failures >= 10) {
      startCountdown(Date.now() + 5 * 60 * 1000);
    } else if (failures >= 5) {
      startCountdown(Date.now() + 30 * 1000);
    }
  }, [startCountdown]);

  const resetLoginFailures = useCallback(() => {
    loginFailures.current = 0;
    setLockUntil(null);
    setRemainingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const canSignup = useCallback((): boolean => {
    const now = Date.now();
    signupTimestamps.current = signupTimestamps.current.filter((t) => now - t < 60_000);
    return signupTimestamps.current.length < 3;
  }, []);

  const recordSignup = useCallback(() => {
    signupTimestamps.current.push(Date.now());
  }, []);

  const isBlocked = lockUntil !== null && Date.now() < lockUntil;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  const state: RateLimitState = {
    isBlocked,
    remainingSeconds,
    message: isBlocked
      ? `Demasiados intentos. Esperá ${formatTime(remainingSeconds)} para intentar de nuevo.`
      : "",
  };

  return {
    state,
    recordLoginFailure,
    resetLoginFailures,
    canSignup,
    recordSignup,
  };
}

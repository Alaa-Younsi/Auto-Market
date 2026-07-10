import { useEffect, useRef } from "react";

export function useHoneypot() {
  const mountedAt = useRef<number | null>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const isSpam = (honeypotValue: string | undefined) =>
    !!honeypotValue || mountedAt.current === null || Date.now() - mountedAt.current < 1500;

  return { isSpam };
}

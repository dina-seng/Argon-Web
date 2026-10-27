import { useEffect, useState } from 'react';

interface CountdownBadgeProps {
  /** Target expiry date */
  expiresAt: Date | string;
  /** Called when countdown reaches zero */
  onExpire?: () => void;
}

/**
 * CountdownBadge – live countdown for the 10-minute booking hold.
 * TODO: Implement interval-based countdown, format mm:ss, apply warning/error styling.
 */
export function CountdownBadge({ expiresAt, onExpire }: CountdownBadgeProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    // TODO: implement full countdown tick logic
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return <span>⏱ {formatted}</span>;
}

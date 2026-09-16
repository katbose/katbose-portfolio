"use client";

import { useEffect, useState } from "react";
import { formatLocalTime } from "../data/localTime";

export function LiveClock({ timezone }: { timezone: string }) {
  // Server output and the first client render must agree across timezones.
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const update = () => setTime(formatLocalTime(timezone));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  return (
    <span data-testid="local-time" className="tabular-nums text-xs sm:text-sm">
      {time}
    </span>
  );
}

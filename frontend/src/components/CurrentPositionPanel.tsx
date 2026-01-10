import { useEffect, useState } from "react";
import type { Position } from "../types/types";
import { GREEN, YELLOW } from "../lib/colors";

function formatTimeUntilNow(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / 1000 / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes}min ago`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours}hr ago`;
  }

  return `${hours}hr ${minutes}min ago`;
}

interface CurrentPositionPanelProps {
  position: Position;
  title: string;
  isPredicted: boolean;
}

export function CurrentPositionPanel({
  position,
  title,
  isPredicted,
}: CurrentPositionPanelProps) {
  const [, setTick] = useState(0);

  // Redraw the component every 5 seconds to update the "time until now" text
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000 * 5);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-dark-frosty border border-slate-700/50 rounded-xl p-4 shadow-2xl min-w-[calc(100vw-1rem)] md:min-w-[240px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
        <div
          className={`w-3 h-3 rounded-full ${!isPredicted ? "animate-pulse" : ""}`}
          style={{ backgroundColor: isPredicted ? YELLOW : GREEN }}
        />
        <h3 className="text-slate-100 font-semibold text-sm tracking-wide">
          {title}
        </h3>
      </div>

      <table className="text-sm">
        <tbody>
          <tr className="">
            <td className="text-slate-400 pr-4 md:pb-2">Last position</td>
            <td className="text-slate-200 md:pb-2 font-mono">
              {formatTimeUntilNow(position.timestamp)}
            </td>
          </tr>

          <tr className="hidden md:table-row">
            <td className="text-slate-400 pr-4 pb-2">Latitude</td>
            <td className="text-slate-200 pb-2 font-mono">
              {position.latitude.toFixed(5)}°
            </td>
          </tr>

          <tr className="hidden md:table-row">
            <td className="text-slate-400 pr-4 pb-2">Longitude</td>
            <td className="text-slate-200 pb-2 font-mono">
              {position.longitude.toFixed(5)}°
            </td>
          </tr>

          <tr className="hidden md:table-row">
            <td className="text-slate-400 pr-4 pb-2">Speed</td>
            <td className="text-slate-200 pb-2 font-mono">
              {position.speed_over_ground.toFixed(1)} knots
            </td>
          </tr>

          <tr className="hidden md:table-row">
            <td className="text-slate-400 pr-4">Course</td>
            <td className="text-slate-200 font-mono">
              {position.course_over_ground.toFixed(1)}°
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

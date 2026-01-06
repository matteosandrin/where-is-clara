import type { Position } from "../types";

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
  dotColor: string;
}

export function CurrentPositionPanel({
  position,
  title,
  dotColor,
}: CurrentPositionPanelProps) {
  return (
    <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl min-w-[260px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: dotColor }}
        />
        <h3 className="text-slate-100 font-semibold text-sm tracking-wide">
          {title}
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Last position</span>
          <span className="text-slate-200 font-mono">
            {formatTimeUntilNow(position.timestamp)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Latitude</span>
          <span className="text-slate-200 font-mono">
            {position.latitude.toFixed(5)}°
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Longitude</span>
          <span className="text-slate-200 font-mono">
            {position.longitude.toFixed(5)}°
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Speed</span>
          <span className="text-slate-200 font-mono">
            {position.speed_over_ground.toFixed(1)} knots
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Course</span>
          <span className="text-slate-200 font-mono">
            {position.course_over_ground.toFixed(1)}°
          </span>
        </div>
      </div>
    </div>
  );
}

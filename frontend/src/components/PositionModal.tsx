import { Popup } from "react-map-gl/mapbox";
import type { Position } from "../types";

interface PositionModalProps {
  position: Position | null;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PositionModal({
  position,
  title,
  isOpen,
  onClose,
}: PositionModalProps) {
  if (!isOpen || !position) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <Popup
      longitude={position.longitude}
      latitude={position.latitude}
      onClose={onClose}
      anchor="bottom"
      closeButton={true}
      closeOnClick={false}
      className="position-popup"
    >
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center mb-3 gap-2">
          <h2 className="text-slate-200 text-lg font-semibold">{title}</h2>
        </div>

        <table className="text-sm">
          <tbody>
            <tr>
              <td className="text-slate-400 pr-4 pb-2">Time</td>
              <td className="font-mono text-xs text-slate-200 pb-2 w-fit">
                {formatTimestamp(position.timestamp)}
              </td>
            </tr>
            <tr>
              <td className="text-slate-400 pr-4 pb-2">Speed</td>
              <td className="font-mono text-xs text-slate-200 pb-2">
                {position.speed_over_ground.toFixed(2)} knots
              </td>
            </tr>
            <tr>
              <td className="text-slate-400 pr-4">Course</td>
              <td className="font-mono text-xs text-slate-200">
                {position.course_over_ground.toFixed(1)}°
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Popup>
  );
}

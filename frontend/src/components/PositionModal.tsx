import { Popup } from "react-map-gl/mapbox";
import type { Position } from "../types/types";
import { formatTimestamp } from "../lib/utils";
import { X } from "lucide-react";

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

  return (
    <Popup
      longitude={position.longitude}
      latitude={position.latitude}
      onClose={onClose}
      anchor="bottom"
      closeButton={false}
      closeOnClick={false}
      className="position-popup"
    >
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-slate-200 text-lg font-semibold">{title}</h2>
          <button
            className="text-slate-400 hover:text-slate-200 text-xl w-4 h-4"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
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

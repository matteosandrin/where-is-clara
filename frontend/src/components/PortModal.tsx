import { Popup } from "react-map-gl/mapbox";
import type { Port } from "../types/types";
import { formatTimestamp } from "../lib/utils";
import { X } from "lucide-react";
import { getFlagEmoji } from "../lib/utils";

interface PortModalProps {
  port: Port;
  isOpen: boolean;
  onClose: () => void;
}

export function PortModal({ port, isOpen, onClose }: PortModalProps) {
  if (!isOpen) {
    return null;
  }
  return (
    <Popup
      longitude={port.lon}
      latitude={port.lat}
      onClose={onClose}
      anchor="bottom"
      closeButton={false}
      closeOnClick={false}
      className="port-popup"
      offset={[0, -30]}
    >
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center mb-3 gap-2 justify-between">
          <h2 className="text-slate-200 text-lg font-semibold">
            <span className="text-xl -mb-1">
              {getFlagEmoji(port.country.flag.code)}
            </span>
            <span className="ml-2">{port.title}</span>
          </h2>
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
              <td className="text-slate-400 pr-4 pb-2">Day</td>
              <td className="font-mono text-xs text-slate-200 pb-2 w-fit">
                {port.day}
              </td>
            </tr>
            <tr>
              <td className="text-slate-400 pr-4 pb-2">Departure</td>
              <td className="font-mono text-xs text-slate-200 pb-2 w-fit">
                {formatTimestamp(port.dep_datetime)}
              </td>
            </tr>
            <tr>
              <td className="text-slate-400 pr-4 pb-2">Timezone</td>
              <td className="font-mono text-xs text-slate-200 pb-2 w-fit">
                {port.timezone}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Popup>
  );
}

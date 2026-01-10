import { useState, useMemo } from "react";
import type { Port, Position } from "../types/types";
import { getClosestPort, getNextPort, isInPort } from "../lib/utils";
import { getFlagEmoji } from "../lib/utils";
import { ChevronDown } from "lucide-react";

// Format departure datetime nicely
function formatDeparture(datetime: string | null): string {
  if (!datetime) return "End of cruise";
  const date = new Date(datetime);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface PortsListPanelProps {
  ports: Port[];
  currentPosition: Position | null;
  onPortClick?: (port: Port) => void;
}

export function PortsListPanel({
  ports,
  currentPosition,
  onPortClick,
}: PortsListPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { nextPort, currentPort } = useMemo(() => {
    if (!currentPosition) {
      return { nextPort: ports[0] || null, currentPort: null };
    }
    const inPort = isInPort(ports, currentPosition);
    if (inPort) {
      return {
        nextPort: null,
        currentPort: getClosestPort(ports, currentPosition) || null,
      };
    }
    const next = getNextPort(ports, currentPosition);
    return { nextPort: next, currentPort: null };
  }, [ports, currentPosition]);

  const getPortStatus = (
    port: Port,
  ): "past" | "current" | "next" | "future" => {
    if (currentPort && port.id === currentPort.id) return "current";
    if (nextPort && port.id === nextPort.id) return "next";

    if (!port.dep_datetime) return "future"; // Last port with no departure

    const depTime = new Date(port.dep_datetime).getTime();
    const now = Date.now();

    if (depTime < now) return "past";
    return "future";
  };

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Desktop version (always visible)
  const desktopPanel = (
    <div className="hidden md:block absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl w-72 max-h-[60vh] max-w-[240px] overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-slate-100 font-semibold text-sm tracking-wide">
          Cruise Itinerary
        </h3>
        <p className="text-slate-400 text-xs mt-1">{ports.length} ports</p>
      </div>
      <div className="overflow-y-auto max-h-[calc(60vh-60px)]">
        {ports.map((port, index) => {
          const status = getPortStatus(port);
          return (
            <PortRow
              key={port.id}
              port={port}
              status={status}
              number={index + 1}
              onClick={() => onPortClick?.(port)}
            />
          );
        })}
      </div>
    </div>
  );

  // Mobile version (expandable)
  const mobilePanel = (
    <div className="md:hidden absolute bottom-2 left-2 z-10">
      {!isExpanded ? (
        <button
          onClick={toggleExpanded}
          className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl py-2 px-2 shadow-2xl flex items-center gap-2"
        >
          <span className="text-slate-200 text-sm">
            <span className="font-semibold">{ports.length}</span> ports
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl w-[calc(100vw-1rem)] max-h-[70vh] overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="text-slate-100 font-semibold text-sm tracking-wide">
                Cruise Itinerary
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {ports.length} ports
              </p>
            </div>
            <button
              onClick={toggleExpanded}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
            {ports.map((port, index) => {
              const status = getPortStatus(port);
              return (
                <PortRow
                  key={port.id}
                  port={port}
                  status={status}
                  number={index + 1}
                  onClick={() => {
                    onPortClick?.(port);
                    setIsExpanded(false);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {desktopPanel}
      {mobilePanel}
    </>
  );
}

interface PortRowProps {
  port: Port;
  status: "past" | "current" | "next" | "future";
  number: number;
  onClick?: () => void;
}

function PortRow({ port, status, number, onClick }: PortRowProps) {
  const isPastOrDimmed = status === "past";
  const isHighlighted = status === "current" || status === "next";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-slate-700/30 hover:bg-slate-700/40 transition-colors flex items-start gap-3 ${
        isPastOrDimmed ? "opacity-50" : ""
      }`}
    >
      <div
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isHighlighted
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-slate-700/50 text-slate-400"
        }`}
      >
        {number}
      </div>

      {/* Port info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              isHighlighted ? "text-slate-100" : "text-slate-300"
            } ${isPastOrDimmed ? "line-through" : ""}`}
          >
            {getFlagEmoji(port.country.flag.code)} {port.title}
          </span>
        </div>
        <div className="mt-0.5">
          <span className="text-xs text-slate-500">
            {formatDeparture(port.dep_datetime)}
          </span>
        </div>
      </div>
    </button>
  );
}

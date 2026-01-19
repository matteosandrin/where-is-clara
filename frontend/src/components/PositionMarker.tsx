import { GREEN, YELLOW } from "../lib/colors";

interface PositionMarkerProps {
  isPredicted?: boolean;
  onClick?: () => void;
}

export function PositionMarker({
  isPredicted = false,
  onClick,
}: PositionMarkerProps) {
  const ringColor = isPredicted ? YELLOW : GREEN;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      onClick={onClick}
    >
      <div
        className="relative w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg z-10"
        style={{
          borderColor: ringColor,
          boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 0 20px ${ringColor}40`,
        }}
      >
        <img
          src="/clara.jpg"
          alt="Clara"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export function PortPin({ number }: { number: number }) {
  return (
    <div className="relative flex flex-col items-center cursor-pointer group">
      {/* Pin head with number */}
      <div
        className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        <span className="text-xs font-bold text-white">{number}</span>
      </div>
      {/* Pin tail */}
      <div
        className="w-0 h-0 -mt-[2px]"
        style={{
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "8px solid #1e293b",
        }}
      />
    </div>
  );
}

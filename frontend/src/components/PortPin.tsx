export function PortPin({ number }: { number: number }) {
  return (
    <div className="relative flex flex-col items-center cursor-pointer group">
      {/* Pin head with number */}
      <div
        className="w-7 h-7 rounded-full bg-white border-2 border-slate-800 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        <span className="text-xs font-bold text-slate-800">{number}</span>
      </div>
      {/* Pin tail */}
      <div
        className="w-0 h-0 -mt-px"
        style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "8px solid #1e293b",
        }}
      />
      {/* Shadow dot under pin */}
      <div className="w-2 h-1 rounded-full bg-black/20 -mt-0.5" />
    </div>
  );
}

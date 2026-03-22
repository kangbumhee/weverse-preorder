"use client";

interface FilterBarProps {
  filters: { key: string; label: string; count: number }[];
  onFilter: (key: string) => void;
  activeFilter: string;
}

export default function FilterBar({
  filters,
  onFilter,
  activeFilter,
}: FilterBarProps) {
  return (
    <div className="flex gap-2 flex-wrap py-3">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onFilter(f.key)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            activeFilter === f.key
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-purple-400 hover:text-purple-600"
          }`}
        >
          {f.label} {f.count}
        </button>
      ))}
    </div>
  );
}

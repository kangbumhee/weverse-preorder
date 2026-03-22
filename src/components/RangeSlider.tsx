"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}

export default function RangeSlider({ min, max, valueMin, valueMax, onChange }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);

  const getPercent = (val: number) =>
    max <= min ? 0 : ((val - min) / (max - min)) * 100;

  const getValueFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + percent * (max - min));
  }, [min, max]);

  const handleMouseDown = (handle: "min" | "max") => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(handle);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const val = getValueFromX(clientX);

      if (dragging === "min") {
        const newMin = Math.min(val, valueMax - 1);
        onChange(Math.max(min, newMin), valueMax);
      } else {
        const newMax = Math.max(val, valueMin + 1);
        onChange(valueMin, Math.min(max, newMax));
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragging, valueMin, valueMax, min, max, onChange, getValueFromX]);

  const leftPercent = getPercent(valueMin);
  const rightPercent = getPercent(valueMax);

  return (
    <div className="w-full px-2 py-4">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>최소 <strong className="text-purple-600">{valueMin}개</strong></span>
        <span>최대 <strong className="text-purple-600">{valueMax}개</strong></span>
      </div>
      <div ref={trackRef} className="relative h-2 bg-gray-200 rounded-full cursor-pointer select-none">
        {/* 선택 영역 */}
        <div
          className="absolute h-2 bg-purple-500 rounded-full"
          style={{ left: `${leftPercent}%`, width: `${rightPercent - leftPercent}%` }}
        />
        {/* 최소 핸들 */}
        <div
          onMouseDown={handleMouseDown("min")}
          onTouchStart={handleMouseDown("min")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-purple-600 rounded-full shadow cursor-grab active:cursor-grabbing z-10 hover:scale-110 transition-transform"
          style={{ left: `${leftPercent}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            {valueMin}
          </div>
        </div>
        {/* 최대 핸들 */}
        <div
          onMouseDown={handleMouseDown("max")}
          onTouchStart={handleMouseDown("max")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-purple-600 rounded-full shadow cursor-grab active:cursor-grabbing z-10 hover:scale-110 transition-transform"
          style={{ left: `${rightPercent}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            {valueMax}
          </div>
        </div>
      </div>
      {/* 눈금 */}
      <div className="flex justify-between text-[9px] text-gray-300 mt-1 px-0.5">
        <span>{min}</span>
        <span>{Math.round((max - min) * 0.25 + min)}</span>
        <span>{Math.round((max - min) * 0.5 + min)}</span>
        <span>{Math.round((max - min) * 0.75 + min)}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

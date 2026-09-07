'use client';

import React from 'react';

interface TemperatureLegendProps {
  T0: number;
  Tmelt: number;
  peakTemp: number;
}

export const TemperatureLegend: React.FC<TemperatureLegendProps> = ({ T0, Tmelt, peakTemp }) => {
  const maxDisplay = Math.max(Tmelt, Math.ceil(peakTemp / 100) * 100);

  return (
    <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-xs">
      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
        <iconify-icon icon="solar:thermometer-linear" width="14" height="14" className="text-indigo-600"></iconify-icon>
        <span className="text-xs">Temp:</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <div
          className="w-44 h-2.5 rounded-full shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #64748b 0%, #eab308 30%, #f97316 60%, #ef4444 85%, #ffffff 100%)',
          }}
        />
        <div className="flex justify-between text-xs text-slate-500 font-mono w-44">
          <span>{T0}°C</span>
          <span className="text-slate-400">~{(Tmelt * 0.5).toFixed(0)}°C</span>
          <span className="text-amber-700 font-semibold">{Tmelt}°C</span>
        </div>
      </div>
    </div>
  );
};

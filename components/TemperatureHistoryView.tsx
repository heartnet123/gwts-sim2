'use client';

import React, { useEffect, useRef } from 'react';
import { MaterialProperties, ProbeConfig, SimulationResults, WorkpieceConfig } from '@/lib/types';

interface TemperatureHistoryViewProps {
  workpiece: WorkpieceConfig;
  material: MaterialProperties;
  probe: ProbeConfig;
  onUpdateProbe: (newProbe: ProbeConfig) => void;
  results: SimulationResults;
}

export const TemperatureHistoryView: React.FC<TemperatureHistoryViewProps> = ({
  workpiece,
  material,
  probe,
  onUpdateProbe,
  results,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const padLeft = 65;
    const padRight = 35;
    const padTop = 35;
    const padBottom = 50;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Dark background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // X Range: 0 to Math.max(10, results.totalTime)
    const maxTime = Math.max(10, results.totalTime);
    // Y Range: 0 to Math.max(material.meltingPoint + 200, results.peakProbeTemp + 100, 1600)
    const maxTemp = Math.max(material.meltingPoint + 150, Math.ceil((results.peakProbeTemp + 200) / 200) * 200, 1600);

    const scaleX = (t: number) => padLeft + (t / maxTime) * plotW;
    const scaleY = (T: number) => padTop + plotH - (T / maxTemp) * plotH;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Time ticks
    const timeStep = maxTime > 30 ? 5 : 2;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';

    for (let t = 0; t <= maxTime; t += timeStep) {
      const cx = scaleX(t);
      ctx.beginPath();
      ctx.moveTo(cx, padTop);
      ctx.lineTo(cx, padTop + plotH);
      ctx.stroke();

      ctx.fillText(`${t}s`, cx, padTop + plotH + 16);
    }

    // Temperature ticks
    ctx.textAlign = 'right';
    const tempStep = maxTemp > 2000 ? 500 : 250;
    for (let T = 0; T <= maxTemp; T += tempStep) {
      const cy = scaleY(T);
      ctx.beginPath();
      ctx.moveTo(padLeft, cy);
      ctx.lineTo(padLeft + plotW, cy);
      ctx.stroke();

      ctx.fillText(`${T}°C`, padLeft - 8, cy + 4);
    }

    // Reference Line: Melting Point Tmelt
    const Tmelt = material.meltingPoint;
    if (Tmelt <= maxTemp) {
      const yMelt = scaleY(Tmelt);
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444'; // red-500
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(padLeft, yMelt);
      ctx.lineTo(padLeft + plotW, yMelt);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Melting/Solidus: ${Tmelt} °C`, padLeft + plotW - 10, yMelt - 6);
    }

    // Steel Reference Lines: 800°C and 500°C for t8/5
    if (material.isSteel) {
      // 800°C line
      const y800 = scaleY(800);
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padLeft, y800);
      ctx.lineTo(padLeft + plotW, y800);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`800 °C`, padLeft + 10, y800 - 4);

      // 500°C line
      const y500 = scaleY(500);
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padLeft, y500);
      ctx.lineTo(padLeft + plotW, y500);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`500 °C`, padLeft + 10, y500 - 4);
    }

    // Border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Plot Probe Thermal History Curve
    const history = results.probeHistory;
    if (history.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 2.5;

      for (let i = 0; i < history.length; i++) {
        const pt = history[i];
        const px = scaleX(pt.time);
        const py = scaleY(pt.temp);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Current simulation time cursor
      const curX = scaleX(results.currentTime);
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(curX, padTop);
      ctx.lineTo(curX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current probe point dot
      const curY = scaleY(results.currentProbeTemp);
      ctx.beginPath();
      ctx.arc(curX, curY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    // Axes Labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Simulation Time t [seconds]', padLeft + plotW / 2, height - 12);

    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Temperature T [°C]', 0, 0);
    ctx.restore();

  }, [results.probeHistory, results.currentTime, results.currentProbeTemp, material, results.peakProbeTemp, results.totalTime]);

  return (
    <div className="w-full h-full min-h-[460px] flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl p-4">
      {/* Top Header & Probe Coordinate Inputs */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <iconify-icon icon="solar:chart-2-linear" width="16" height="16" className="text-indigo-400"></iconify-icon>
            Thermal Cycle Curve T(t)
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Material: {material.name.split(' ')[0]}</span>
        </div>

        {/* Live Probe Location Controls */}
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80">
          <span className="font-medium text-slate-200">Probe Position:</span>

          <label className="flex items-center gap-1">
            <span className="text-slate-400">X:</span>
            <input
              type="number"
              min={0}
              max={workpiece.length}
              value={probe.x}
              onChange={(e) => onUpdateProbe({ ...probe, x: parseFloat(e.target.value) || 0 })}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500 text-xs">mm</span>
          </label>

          <label className="flex items-center gap-1">
            <span className="text-slate-400">Y:</span>
            <input
              type="number"
              min={-workpiece.width / 2}
              max={workpiece.width / 2}
              value={probe.y}
              onChange={(e) => onUpdateProbe({ ...probe, y: parseFloat(e.target.value) || 0 })}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500 text-xs">mm</span>
          </label>

          <label className="flex items-center gap-1">
            <span className="text-slate-400">Depth Z:</span>
            <input
              type="number"
              min={0}
              max={workpiece.thickness}
              value={probe.z}
              onChange={(e) => onUpdateProbe({ ...probe, z: parseFloat(e.target.value) || 0 })}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500 text-xs">mm</span>
          </label>
        </div>
      </div>

      {/* Numerical Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 shadow-xs">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">CURRENT PROBE TEMP</div>
          <div className="text-lg font-semibold font-mono text-indigo-400 mt-0.5">
            {results.currentProbeTemp.toFixed(1)} °C
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 shadow-xs">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">PEAK PROBE TEMP</div>
          <div className="text-lg font-semibold font-mono text-amber-400 mt-0.5">
            {results.peakProbeTemp.toFixed(1)} °C
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 shadow-xs">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">SOLIDUS / MELTING</div>
          <div className="text-lg font-semibold font-mono text-rose-400 mt-0.5">
            {material.meltingPoint} °C
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 shadow-xs">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">STEEL COOLING t8/5</div>
          <div className="text-lg font-semibold font-mono text-emerald-400 mt-0.5">
            {results.t85 !== null ? `${results.t85.toFixed(2)} s` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Status Notice about t8/5 */}
      {material.isSteel && results.t85 === null && (
        <div className="mt-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
          <iconify-icon icon="solar:info-circle-linear" width="16" height="16" className="text-indigo-400"></iconify-icon>
          <span>t8/5 not available for this thermal history (requires heating above 800°C and cooling through 500°C).</span>
        </div>
      )}

      {/* Plot Canvas */}
      <div className="w-full flex-1 relative mt-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={840}
          height={420}
          className="w-full h-full object-contain rounded-xl border border-slate-800/80 shadow-inner"
        />
      </div>
    </div>
  );
};

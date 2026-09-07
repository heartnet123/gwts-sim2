'use client';

import React, { useEffect, useRef } from 'react';
import {
  MaterialProperties,
  SimulationResults,
  ThermalGridData,
  WeldingConfig,
  WorkpieceConfig,
} from '@/lib/types';
import { getTemperatureColor, getTorchTrajectoryPosition } from '@/lib/thermalEngine';

interface TopViewProps {
  workpiece: WorkpieceConfig;
  material: MaterialProperties;
  welding: WeldingConfig;
  grid: ThermalGridData;
  results: SimulationResults;
}

export const TopView: React.FC<TopViewProps> = ({
  workpiece,
  material,
  welding,
  grid,
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

    // Padding for physical axes
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 50;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Coordinate conversion:
    // X: 0 to workpiece.length -> padLeft to padLeft + plotW
    // Y: -workpiece.width/2 to +workpiece.width/2 -> padTop + plotH to padTop
    const scaleX = (x: number) => padLeft + (x / workpiece.length) * plotW;
    const scaleY = (y: number) => padTop + plotH / 2 - (y / (workpiece.width / 2)) * (plotH / 2);

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // X grid lines & ticks
    const xStep = workpiece.length > 200 ? 50 : 25;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';

    for (let x = 0; x <= workpiece.length; x += xStep) {
      const cx = scaleX(x);
      ctx.beginPath();
      ctx.moveTo(cx, padTop);
      ctx.lineTo(cx, padTop + plotH);
      ctx.stroke();

      ctx.fillText(`${x}`, cx, padTop + plotH + 16);
    }

    // Y grid lines & ticks
    const yStep = workpiece.width > 100 ? 25 : 10;
    ctx.textAlign = 'right';
    for (let y = -workpiece.width / 2; y <= workpiece.width / 2; y += yStep) {
      const cy = scaleY(y);
      ctx.beginPath();
      ctx.moveTo(padLeft, cy);
      ctx.lineTo(padLeft + plotW, cy);
      ctx.stroke();

      ctx.fillText(`${y.toFixed(0)}`, padLeft - 8, cy + 4);
    }

    // Plate Base Metal Area
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Weld Centerline (y = 0)
    ctx.beginPath();
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padLeft, scaleY(0));
    ctx.lineTo(padLeft + plotW, scaleY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw 2D Temperature Field Heatmap
    // We sample grid top surface (k = 0)
    const { nx, ny } = grid;
    const cellW = plotW / (nx - 1);
    const cellH = plotH / (ny - 1);
    const Tmelt = material.meltingPoint;
    const T0 = workpiece.initialTemp;

    for (let i = 0; i < nx - 1; i++) {
      const x_mm = i * grid.dx;
      const px = scaleX(x_mm);

      for (let j = 0; j < ny - 1; j++) {
        const y_mm = -workpiece.width / 2 + j * grid.dy;
        const py = scaleY(y_mm + grid.dy); // invert Y for canvas

        const gridIdx = (i * ny + j) * grid.nz + 0;
        const temp = grid.T[gridIdx] || T0;

        // Only draw cells warmer than ambient to preserve contrast
        if (temp > T0 + 10) {
          const col = getTemperatureColor(temp, Tmelt, T0);
          ctx.fillStyle = col.hex;
          ctx.fillRect(px, py, cellW + 1, cellH + 1);

          // Highlight molten pool (T >= Tmelt)
          if (temp >= Tmelt) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + cellW * 0.2, py + cellH * 0.2, cellW * 0.6, cellH * 0.6);
          }
        }
      }
    }

    // Draw planned welding trajectory
    ctx.beginPath();
    ctx.strokeStyle = '#6366f1'; // indigo-500
    ctx.lineWidth = 2;
    const totalTime = Math.max(1, (workpiece.length - 20) / Math.max(0.1, welding.travelSpeed));
    const steps = 150;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * totalTime;
      const pos = getTorchTrajectoryPosition(t, welding, workpiece);
      const cx = scaleX(pos.x);
      const cy = scaleY(pos.y);
      if (s === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Draw Current Torch Position
    const torchPos = results.torchPos;
    const tx = scaleX(torchPos.x);
    const ty = scaleY(torchPos.y);

    // Torch arc outer glow
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.fill();

    // Torch center marker
    ctx.beginPath();
    ctx.arc(tx, ty, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b'; // amber
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Torch Crosshair
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.moveTo(tx - 10, ty);
    ctx.lineTo(tx + 10, ty);
    ctx.moveTo(tx, ty - 10);
    ctx.lineTo(tx, ty + 10);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Plate Length X [mm] (Welding Direction →)', padLeft + plotW / 2, height - 12);

    ctx.save();
    ctx.translate(16, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Transverse Width Y [mm]', 0, 0);
    ctx.restore();

    // Overlay Legend badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(padLeft + 12, padTop + 12, 220, 52);
    ctx.strokeRect(padLeft + 12, padTop + 12, 220, 52);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Torch: X = ${torchPos.x.toFixed(1)} mm, Y = ${torchPos.y.toFixed(1)} mm`, padLeft + 20, padTop + 30);
    ctx.fillText(`Max Temp: ${results.peakTemp.toFixed(0)} °C | Solidus: ${Tmelt} °C`, padLeft + 20, padTop + 48);

  }, [workpiece, material, welding, grid, results.currentTime, results.peakTemp, results.torchPos]);

  return (
    <div className="w-full h-full min-h-[460px] flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl p-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <iconify-icon icon="solar:map-arrow-up-linear" width="16" height="16" className="text-indigo-400"></iconify-icon>
            2D Top-Down Thermal Map (X-Y Plane)
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Plate: {workpiece.length} × {workpiece.width} mm</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block"></span> Planned Trajectory
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 bg-white border border-red-500 rounded-full inline-block"></span> Molten Pool (≥ {material.meltingPoint}°C)
          </span>
        </div>
      </div>

      <div className="w-full flex-1 relative mt-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={840}
          height={480}
          className="w-full h-full object-contain rounded-xl border border-slate-800/80 shadow-inner"
        />
      </div>
    </div>
  );
};

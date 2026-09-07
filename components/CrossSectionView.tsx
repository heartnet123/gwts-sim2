'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MaterialProperties,
  SimulationResults,
  ThermalGridData,
  WorkpieceConfig,
} from '@/lib/types';
import { getTemperatureColor } from '@/lib/thermalEngine';

interface CrossSectionViewProps {
  workpiece: WorkpieceConfig;
  material: MaterialProperties;
  grid: ThermalGridData;
  results: SimulationResults;
}

export const CrossSectionView: React.FC<CrossSectionViewProps> = ({
  workpiece,
  material,
  grid,
  results,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [followTorch, setFollowTorch] = useState(true);
  const [manualX, setManualX] = useState(25);

  const currentX = followTorch ? results.torchPos.x : manualX;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Margins
    const padLeft = 70;
    const padRight = 50;
    const padTop = 40;
    const padBottom = 60;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Dark background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Coordinate mapping:
    // Y (transverse width): -width/2 to +width/2 -> padLeft to padLeft + plotW
    // Z (depth): 0 (top surface) to workpiece.thickness (bottom) -> padTop to padTop + plotH
    const scaleY = (y: number) => padLeft + ((y + workpiece.width / 2) / workpiece.width) * plotW;
    const scaleZ = (z: number) => padTop + (z / workpiece.thickness) * plotH;

    // Draw Grid and Axis Ticks
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Y ticks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    const yStep = workpiece.width > 100 ? 20 : 10;
    for (let y = -workpiece.width / 2; y <= workpiece.width / 2; y += yStep) {
      const cy = scaleY(y);
      ctx.beginPath();
      ctx.moveTo(cy, padTop);
      ctx.lineTo(cy, padTop + plotH);
      ctx.stroke();

      ctx.fillText(`${y.toFixed(0)}`, cy, padTop + plotH + 16);
    }

    // Z (depth) ticks
    ctx.textAlign = 'right';
    const zStep = Math.max(1, Math.floor(workpiece.thickness / 5));
    for (let z = 0; z <= workpiece.thickness; z += zStep) {
      const cz = scaleZ(z);
      ctx.beginPath();
      ctx.moveTo(padLeft, cz);
      ctx.lineTo(padLeft + plotW, cz);
      ctx.stroke();

      ctx.fillText(`${z.toFixed(0)}`, padLeft - 8, cz + 4);
    }

    // Plate Base Metal Profile
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // Temperature Slice at currentX
    // Sample along grid Y and Z at X = currentX
    const { ny, nz } = grid;
    const cellW = plotW / (ny - 1);
    const cellH = plotH / (nz - 1);
    const Tmelt = material.meltingPoint;
    const T0 = workpiece.initialTemp;

    let sliceMaxDepth = 0;
    let sliceMaxTemp = 0;
    let sliceReachesBottom = false;

    for (let j = 0; j < ny - 1; j++) {
      const y_mm = -workpiece.width / 2 + j * grid.dy;
      const px = scaleY(y_mm);

      for (let k = 0; k < nz - 1; k++) {
        const z_mm = k * grid.dz;
        const pz = scaleZ(z_mm);

        const temp = grid.getTempAt(currentX, y_mm, z_mm);
        if (temp > sliceMaxTemp) sliceMaxTemp = temp;

        if (temp >= Tmelt) {
          if (z_mm > sliceMaxDepth) sliceMaxDepth = z_mm;
          if (k === nz - 2 || z_mm >= workpiece.thickness * 0.95) {
            sliceReachesBottom = true;
          }
        }

        if (temp > T0 + 5) {
          const col = getTemperatureColor(temp, Tmelt, T0);
          ctx.fillStyle = col.hex;
          ctx.fillRect(px, pz, cellW + 1, cellH + 1);

          if (temp >= Tmelt) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + cellW * 0.15, pz + cellH * 0.15, cellW * 0.7, cellH * 0.7);
          }
        }
      }
    }

    // Draw Butt Joint Groove Profile Overlay
    const { grooveType, grooveAngle, rootGap, rootFace, thickness } = workpiece;
    const midY = scaleY(0);
    const gapPx = (rootGap / workpiece.width) * plotW;
    const halfGapPx = gapPx / 2;

    ctx.save();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.75;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';

    if (grooveType === 'square') {
      // Square butt with root gap
      const leftEdge = midY - halfGapPx;
      const rightEdge = midY + halfGapPx;

      ctx.beginPath();
      ctx.moveTo(leftEdge, scaleZ(0));
      ctx.lineTo(leftEdge, scaleZ(thickness));
      ctx.moveTo(rightEdge, scaleZ(0));
      ctx.lineTo(rightEdge, scaleZ(thickness));
      ctx.stroke();
    } else if (grooveType === 'single_v') {
      // Single-V groove: V at top, root face at bottom
      const rootFaceDepth = thickness - rootFace;
      const rad = (grooveAngle * Math.PI) / 360; // half angle
      const topVHalfWidth_mm = rootGap / 2 + Math.tan(rad) * rootFaceDepth;
      const topVHalfPx = (topVHalfWidth_mm / workpiece.width) * plotW;

      ctx.beginPath();
      // Left groove wall
      ctx.moveTo(midY - topVHalfPx, scaleZ(0));
      ctx.lineTo(midY - halfGapPx, scaleZ(rootFaceDepth));
      ctx.lineTo(midY - halfGapPx, scaleZ(thickness));
      // Right groove wall
      ctx.moveTo(midY + topVHalfPx, scaleZ(0));
      ctx.lineTo(midY + halfGapPx, scaleZ(rootFaceDepth));
      ctx.lineTo(midY + halfGapPx, scaleZ(thickness));
      ctx.stroke();
    } else if (grooveType === 'double_v') {
      // Double-V groove
      const midDepth = thickness / 2;
      const halfAngleRad = (grooveAngle * Math.PI) / 360;
      const topVHalf_mm = rootGap / 2 + Math.tan(halfAngleRad) * (midDepth - rootFace / 2);
      const topVHalfPx = (topVHalf_mm / workpiece.width) * plotW;

      ctx.beginPath();
      // Top V
      ctx.moveTo(midY - topVHalfPx, scaleZ(0));
      ctx.lineTo(midY - halfGapPx, scaleZ(midDepth - rootFace / 2));
      ctx.lineTo(midY - halfGapPx, scaleZ(midDepth + rootFace / 2));
      ctx.lineTo(midY - topVHalfPx, scaleZ(thickness));

      ctx.moveTo(midY + topVHalfPx, scaleZ(0));
      ctx.lineTo(midY + halfGapPx, scaleZ(midDepth - rootFace / 2));
      ctx.lineTo(midY + halfGapPx, scaleZ(midDepth + rootFace / 2));
      ctx.lineTo(midY + topVHalfPx, scaleZ(thickness));
      ctx.stroke();
    }
    ctx.restore();

    // Plate Outer Boundary Outline
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Top Surface Line (Z = 0)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft + plotW, padTop);
    ctx.stroke();

    // Bottom Surface Line (Z = thickness)
    ctx.strokeStyle = sliceReachesBottom ? '#ef4444' : '#64748b';
    ctx.lineWidth = sliceReachesBottom ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Melt Depth Dimension Callout
    if (sliceMaxDepth > 0.2) {
      const calloutY = midY + 45;
      const z0 = scaleZ(0);
      const zMelt = scaleZ(sliceMaxDepth);

      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.moveTo(calloutY, z0);
      ctx.lineTo(calloutY, zMelt);
      ctx.stroke();

      // Top & bottom ticks
      ctx.beginPath();
      ctx.moveTo(calloutY - 5, z0);
      ctx.lineTo(calloutY + 5, z0);
      ctx.moveTo(calloutY - 5, zMelt);
      ctx.lineTo(calloutY + 5, zMelt);
      ctx.stroke();

      // Dimension Text
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Melt Depth: ${sliceMaxDepth.toFixed(1)} mm`, calloutY + 8, (z0 + zMelt) / 2 + 4);
    }

    // Axes Labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Transverse Width Y [mm]', padLeft + plotW / 2, height - 14);

    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Depth Z [mm] (from top surface)', 0, 0);
    ctx.restore();

    // Top Right Annotation box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(width - padRight - 260, padTop + 10, 250, 68);
    ctx.strokeRect(width - padRight - 260, padTop + 10, 250, 68);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Section at X = ${currentX.toFixed(1)} mm ${followTorch ? '(Tracking Torch)' : '(Manual)'}`, width - padRight - 250, padTop + 28);
    ctx.fillText(`Slice Peak Temp: ${sliceMaxTemp.toFixed(0)} °C`, width - padRight - 250, padTop + 46);
    ctx.fillText(`Melt Penetration: ${((sliceMaxDepth / thickness) * 100).toFixed(1)}% of ${thickness} mm`, width - padRight - 250, padTop + 64);

  }, [workpiece, material, grid, results.currentTime, currentX, followTorch]);

  return (
    <div className="w-full h-full min-h-[460px] flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl p-4">
      {/* Header & Section Controls */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <iconify-icon icon="solar:knife-linear" width="16" height="16" className="text-indigo-400"></iconify-icon>
            Cross Section Slice (Y-Z Plane)
          </span>
          <span className="text-slate-600">|</span>
          <span className="capitalize font-mono text-slate-400">
            Groove: {workpiece.grooveType.replace('_', '-')}
          </span>
        </div>

        {/* Follow Torch & Slider Controls */}
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-200">
            <input
              type="checkbox"
              checked={followTorch}
              onChange={(e) => setFollowTorch(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            Follow Torch
          </label>

          {!followTorch && (
            <div className="flex items-center gap-2 pl-2.5 border-l border-slate-700">
              <span className="text-slate-400">X Position:</span>
              <input
                type="range"
                min={0}
                max={workpiece.length}
                step={1}
                value={manualX}
                onChange={(e) => setManualX(parseFloat(e.target.value))}
                className="w-28 accent-indigo-500 cursor-pointer"
              />
              <span className="font-mono text-indigo-400 w-12 text-right">{manualX.toFixed(0)} mm</span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
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

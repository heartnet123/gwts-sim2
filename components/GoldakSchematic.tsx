'use client';

import React from 'react';
import { GoldakConfig } from '@/lib/types';

interface GoldakSchematicProps {
  goldak: GoldakConfig;
}

export const GoldakSchematic: React.FC<GoldakSchematicProps> = ({ goldak }) => {
  const { a, b, cf, cr, ff, fr } = goldak;

  // Viewbox coordinates: center at (150, 85)
  const cx = 150;
  const cy = 85;

  // Visual scaling factors (clamp for clean display)
  const scale = 5.2;
  const r_cf = Math.max(12, cf * scale);
  const r_cr = Math.max(16, cr * scale);
  const r_a = Math.max(10, a * scale);
  const r_b = Math.max(10, b * scale);

  return (
    <div className="w-full bg-slate-900 text-slate-100 rounded-xl p-3.5 border border-slate-800">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Goldak Double-Ellipsoid Schematic
        </span>
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
          <span>ff={ff.toFixed(2)}</span>
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>fr={fr.toFixed(2)}</span>
        </div>
      </div>

      <div className="relative w-full aspect-[2.4/1] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 320 170" className="w-full h-full select-none">
          <defs>
            <marker
              id="arrowhead-red"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#f43f5e" />
            </marker>
            <marker
              id="arrowhead-blue"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#6366f1" />
            </marker>
            <marker
              id="arrowhead-green"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#10b981" />
            </marker>
            <marker
              id="arrowhead-amber"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Grid lines */}
          <line x1="20" y1={cy} x2="300" y2={cy} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
          <line x1={cx} y1="20" x2={cx} y2="150" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />

          {/* Travel direction arrow */}
          <g>
            <line
              x1={cx + 10}
              y1={25}
              x2={cx + 70}
              y2={25}
              stroke="#10b981"
              strokeWidth="2"
              markerEnd="url(#arrowhead-green)"
            />
            <text x={cx + 40} y={18} fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">
              TRAVEL DIRECTION (+x)
            </text>
          </g>

          {/* Rear Ellipsoid (x < 0, trailing behind) */}
          <path
            d={`M ${cx} ${cy - r_a} A ${r_cr} ${r_a} 0 0 0 ${cx} ${cy + r_a} Z`}
            fill="rgba(99, 102, 241, 0.18)"
            stroke="#6366f1"
            strokeWidth="1.75"
          />

          {/* Front Ellipsoid (x > 0, heading forward) */}
          <path
            d={`M ${cx} ${cy - r_a} A ${r_cf} ${r_a} 0 0 1 ${cx} ${cy + r_a} Z`}
            fill="rgba(244, 63, 94, 0.18)"
            stroke="#f43f5e"
            strokeWidth="1.75"
          />

          {/* Center heat origin */}
          <circle cx={cx} cy={cy} r="3.5" fill="#facc15" stroke="#ffffff" strokeWidth="1" />

          {/* Dimension: cf (front length) */}
          <line x1={cx} y1={cy + r_a + 12} x2={cx + r_cf} y2={cy + r_a + 12} stroke="#f43f5e" strokeWidth="1.2" markerEnd="url(#arrowhead-red)" />
          <line x1={cx} y1={cy + r_a + 6} x2={cx} y2={cy + r_a + 18} stroke="#f43f5e" strokeWidth="1" />
          <line x1={cx + r_cf} y1={cy + r_a + 6} x2={cx + r_cf} y2={cy + r_a + 18} stroke="#f43f5e" strokeWidth="1" />
          <text x={cx + r_cf / 2} y={cy + r_a + 25} fill="#fb7185" fontSize="10" textAnchor="middle" fontWeight="600">
            cf = {cf.toFixed(0)} mm
          </text>

          {/* Dimension: cr (rear length) */}
          <line x1={cx} y1={cy + r_a + 12} x2={cx - r_cr} y2={cy + r_a + 12} stroke="#6366f1" strokeWidth="1.2" markerEnd="url(#arrowhead-blue)" />
          <line x1={cx - r_cr} y1={cy + r_a + 6} x2={cx - r_cr} y2={cy + r_a + 18} stroke="#6366f1" strokeWidth="1" />
          <text x={cx - r_cr / 2} y={cy + r_a + 25} fill="#a5b4fc" fontSize="10" textAnchor="middle" fontWeight="600">
            cr = {cr.toFixed(0)} mm
          </text>

          {/* Dimension: a (semi-width) */}
          <line x1={cx - r_cr - 12} y1={cy} x2={cx - r_cr - 12} y2={cy - r_a} stroke="#f59e0b" strokeWidth="1.2" markerEnd="url(#arrowhead-amber)" />
          <line x1={cx - r_cr - 18} y1={cy} x2={cx - r_cr - 6} y2={cy} stroke="#f59e0b" strokeWidth="1" />
          <line x1={cx - r_cr - 18} y1={cy - r_a} x2={cx - r_cr - 6} y2={cy - r_a} stroke="#f59e0b" strokeWidth="1" />
          <text x={cx - r_cr - 24} y={cy - r_a / 2 + 3} fill="#fbbf24" fontSize="10" textAnchor="end" fontWeight="600">
            a = {a.toFixed(0)} mm
          </text>

          {/* Dimension: b (penetration depth annotation) */}
          <text x="25" y="32" fill="#94a3b8" fontSize="10">
            Depth b = <tspan fill="#facc15" fontWeight="bold">{b.toFixed(0)} mm</tspan>
          </text>

          {/* Section labels */}
          <text x={cx - r_cr / 2} y={cy - r_a - 8} fill="#a5b4fc" fontSize="9" textAnchor="middle" fontWeight="bold">
            REAR ELLIPSOID
          </text>
          <text x={cx + r_cf / 2 + 5} y={cy - r_a - 8} fill="#fb7185" fontSize="9" textAnchor="middle" fontWeight="bold">
            FRONT ELLIPSOID
          </text>
        </svg>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
        <span>Top-down projection (x-y)</span>
        <span className="font-mono text-slate-300">Total length: {(cf + cr).toFixed(0)} mm | Width: {(2 * a).toFixed(0)} mm</span>
      </div>
    </div>
  );
};

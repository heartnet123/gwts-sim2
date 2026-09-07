'use client';

import React from 'react';
import { MaterialProperties, SimulationResults, WeldingConfig, WorkpieceConfig } from '@/lib/types';

interface ThermalAssessmentViewProps {
  workpiece: WorkpieceConfig;
  material: MaterialProperties;
  welding: WeldingConfig;
  results: SimulationResults;
}

export const ThermalAssessmentView: React.FC<ThermalAssessmentViewProps> = ({
  workpiece,
  material,
  welding,
  results,
}) => {
  const {
    arcPower,
    effectivePower,
    heatInputJmm,
    heatInputKJmm,
    peakTemp,
    maxMeltDepth,
    maxMeltWidth,
    penetrationRatio,
    thermalStatus,
    t85,
  } = results;

  const isFullThickness = thermalStatus === 'FULL_THICKNESS';
  const isPartial = thermalStatus === 'PARTIAL_DEPTH';
  const isNoMelting = thermalStatus === 'NO_MELTING';

  return (
    <div className="w-full h-full min-h-[460px] flex flex-col bg-slate-950 rounded-2xl overflow-y-auto border border-slate-800 shadow-xl p-6 text-slate-100">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <iconify-icon icon="solar:document-text-linear" width="20" height="20" className="text-indigo-400"></iconify-icon>
            Thermal Assessment & Prediction Summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quantitative analysis derived from the Goldak transient finite-difference thermal model.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isFullThickness && (
            <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5">
              <iconify-icon icon="solar:danger-triangle-linear" width="14" height="14"></iconify-icon>
              FULL-THICKNESS MELTING
            </span>
          )}
          {isPartial && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
              <iconify-icon icon="solar:check-circle-linear" width="14" height="14"></iconify-icon>
              PARTIAL-DEPTH MELTING
            </span>
          )}
          {isNoMelting && (
            <span className="px-3 py-1 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 text-xs font-semibold">
              NO MELTING PREDICTED
            </span>
          )}
        </div>
      </div>

      {/* Prominent Warning Callout if Full-Thickness */}
      {isFullThickness && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
            <iconify-icon icon="solar:danger-triangle-linear" width="18" height="18" className="text-rose-400"></iconify-icon>
            FULL-THICKNESS MELTING PREDICTED
          </div>
          <p className="mt-1.5 text-xs text-rose-200/90 leading-relaxed">
            The thermal model predicts that the melting-temperature region reaches the bottom surface of the plate.
            This may indicate risk of excessive penetration or burn-through, but this simulation is not a weld-quality certification.
          </p>
        </div>
      )}

      {/* Primary Engineering Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
        {/* Arc Power */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-xs">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">ARC POWER (P = V · I)</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {arcPower.toFixed(0)} <span className="text-sm font-normal text-slate-400">W</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {welding.voltage.toFixed(2)} V × {welding.current.toFixed(2)} A
          </div>
        </div>

        {/* Effective Heat Power */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-xs">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">EFFECTIVE HEAT POWER (Q = η · P)</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {effectivePower.toFixed(0)} <span className="text-sm font-normal text-slate-400">W</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Thermal Efficiency η = {(welding.efficiency * 100).toFixed(1)}%
          </div>
        </div>

        {/* Heat Input */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-xs">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">HEAT INPUT PER UNIT LENGTH (H)</div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
            {heatInputKJmm.toFixed(2)} <span className="text-sm font-normal text-slate-400">kJ/mm</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {heatInputJmm.toFixed(0)} J/mm @ v = {welding.travelSpeed.toFixed(2)} mm/s
          </div>
        </div>

        {/* Peak Temperature */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-xs">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">CALCULATED PEAK TEMPERATURE</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {peakTemp.toFixed(0)} <span className="text-sm font-normal text-slate-400">°C</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Material Melting Point: {material.meltingPoint} °C
          </div>
        </div>

        {/* Predicted Melt Depth & Penetration Ratio */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-xs">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">PREDICTED MELT DEPTH / THICKNESS</div>
          <div className="text-xl font-bold font-mono text-white mt-1 flex items-baseline gap-2">
            <span>{maxMeltDepth.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ {workpiece.thickness.toFixed(1)} mm</span></span>
            <span className={`text-sm font-semibold ${penetrationRatio >= 95 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ({penetrationRatio.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${penetrationRatio >= 95 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, penetrationRatio)}%` }}
            />
          </div>
        </div>

        {/* Predicted Molten Width */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-xs">
          <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">PREDICTED MOLTEN POOL WIDTH</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {maxMeltWidth.toFixed(1)} <span className="text-sm font-normal text-slate-400">mm</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Based on T ≥ {material.meltingPoint} °C isotherm
          </div>
        </div>
      </div>

      {/* Steel Metallurgy & Cooling Section */}
      <div className="mt-4 p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <iconify-icon icon="solar:fire-linear" width="16" height="16" className="text-amber-400"></iconify-icon>
          Cooling Time Assessment (t8/5)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <div className="text-sm font-medium text-slate-200">
              Cooling Duration between 800 °C and 500 °C:
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {t85 !== null ? `${t85.toFixed(2)} seconds` : 'Not Available'}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {material.isSteel
                ? t85 !== null
                  ? 't8/5 governs the formation of martensitic or bainitic microstructures in the heat-affected zone (HAZ) of structural steels.'
                  : 't8/5 not available for this thermal history (probe temperature must exceed 800°C and cool through 500°C).'
                : 't8/5 is only applicable to steel alloys exhibiting austenite decomposition transformations.'}
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
            <span className="font-semibold text-slate-300 block mb-1">Thermal Penetration Principle:</span>
            Predicted melt depth is computed directly from transient 3D conduction where the temperature exceeds the material solidus temperature. It is not an empirical formula based solely on heat input.
          </div>
        </div>
      </div>

      {/* Model Assumptions & Limitations */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400">
        <div className="font-semibold text-slate-300 mb-1">Model Assumptions & Limitations:</div>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
          <li>Homogeneous and isotropic material assumed with constant thermal conductivity and specific heat.</li>
          <li>Double-ellipsoid volumetric heat source distribution following Goldak formulation (ff + fr = 2).</li>
          <li>Simplified surface natural convection boundary condition (h = {workpiece.convectionCoeff} W/m²·K).</li>
          <li>Does not simulate molten pool fluid dynamics (Marangoni convection), droplet transfer, or keyholing.</li>
          <li>Predicted Melt Zone is based on calculated thermal field exceeding selected solidus temperature ({material.meltingPoint} °C).</li>
        </ul>
      </div>
    </div>
  );
};

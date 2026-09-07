'use client';

import React, { useState } from 'react';
import {
  GoldakConfig,
  GrooveType,
  MaterialProperties,
  MaterialType,
  TrajectoryType,
  WeldingConfig,
  WeldingProcess,
  WorkpieceConfig,
} from '@/lib/types';
import { DEFAULT_CUSTOM_MATERIAL, DEFAULT_EFFICIENCIES, PRESET_MATERIALS } from '@/lib/materials';
import { GoldakSchematic } from './GoldakSchematic';

interface SidebarControlsProps {
  workpiece: WorkpieceConfig;
  setWorkpiece: React.Dispatch<React.SetStateAction<WorkpieceConfig>>;
  materialType: MaterialType;
  setMaterialType: (type: MaterialType) => void;
  material: MaterialProperties;
  setMaterial: React.Dispatch<React.SetStateAction<MaterialProperties>>;
  welding: WeldingConfig;
  setWelding: React.Dispatch<React.SetStateAction<WeldingConfig>>;
  goldak: GoldakConfig;
  setGoldak: React.Dispatch<React.SetStateAction<GoldakConfig>>;
  onRunSimulation: () => void;
  onLoadExample: () => void;
  isRunning: boolean;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  workpiece,
  setWorkpiece,
  materialType,
  setMaterialType,
  material,
  setMaterial,
  welding,
  setWelding,
  goldak,
  setGoldak,
  onRunSimulation,
  onLoadExample,
  isRunning,
}) => {
  const [activeTab, setActiveTab] = useState<'SETUP' | 'WELDING' | 'GOLDAK'>('SETUP');
  const [showAssumptionsModal, setShowAssumptionsModal] = useState(false);

  // Live Electrical Calculations
  const arcPower = welding.voltage * welding.current;
  const effectivePower = welding.efficiency * arcPower;
  const v = Math.max(0.1, welding.travelSpeed);
  const heatInputJmm = effectivePower / v;
  const heatInputKJmm = heatInputJmm / 1000;

  // Handle Material Selection
  const handleSelectMaterial = (type: MaterialType) => {
    setMaterialType(type);
    if (type === 'custom') {
      setMaterial(DEFAULT_CUSTOM_MATERIAL);
    } else {
      setMaterial(PRESET_MATERIALS[type]);
    }
  };

  // Handle Welding Process Selection
  const handleSelectProcess = (proc: WeldingProcess) => {
    const defaultEff = DEFAULT_EFFICIENCIES[proc] || 0.8;
    setWelding((prev) => ({
      ...prev,
      process: proc,
      efficiency: defaultEff,
    }));
  };

  // Enforce Goldak ff + fr = 2
  const handleUpdateFractions = (newFf: number) => {
    const clampedFf = Math.max(0.1, Math.min(1.9, newFf));
    const newFr = parseFloat((2.0 - clampedFf).toFixed(2));
    setGoldak((prev) => ({
      ...prev,
      ff: clampedFf,
      fr: newFr,
    }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-slate-200 text-slate-800 select-none">
      {/* Primary Action Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <button
          onClick={onRunSimulation}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <iconify-icon icon="solar:play-circle-linear" width="18" height="18"></iconify-icon>
          <span>RUN WELDING SIMULATION</span>
        </button>

        <div className="flex items-center justify-between gap-2 mt-2.5">
          <button
            onClick={onLoadExample}
            className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Load verified benchmark example parameters"
          >
            <iconify-icon icon="solar:refresh-circle-linear" width="14" height="14"></iconify-icon>
            LOAD EXAMPLE
          </button>

          <button
            onClick={() => setShowAssumptionsModal(true)}
            className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View Model Assumptions & Limitations"
          >
            <iconify-icon icon="solar:document-linear" width="14" height="14"></iconify-icon>
            Assumptions
          </button>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('SETUP')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'SETUP'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. SETUP
        </button>
        <button
          onClick={() => setActiveTab('WELDING')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'WELDING'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. WELDING
        </button>
        <button
          onClick={() => setActiveTab('GOLDAK')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'GOLDAK'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. GOLDAK MODEL
        </button>
      </div>

      {/* Tab Contents - Scrollable Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ==================================================== */}
        {/* 1. SETUP TAB                                         */}
        {/* ==================================================== */}
        {activeTab === 'SETUP' && (
          <div className="space-y-4">
            {/* BASE METAL */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs">
                  <iconify-icon icon="solar:layers-minimalistic-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                  BASE METAL
                </span>
                <span className="text-xs text-slate-400 font-normal">Constant properties</span>
              </div>

              <select
                value={materialType}
                onChange={(e) => handleSelectMaterial(e.target.value as MaterialType)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="carbon_steel">Carbon Steel (AISI 1020)</option>
                <option value="stainless_304">Stainless Steel 304</option>
                <option value="aluminum_6061">Aluminum 6061-T6</option>
                <option value="custom">Custom Material...</option>
              </select>

              {/* Physical Properties Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Density ρ [kg/m³]</div>
                  {materialType === 'custom' ? (
                    <input
                      type="number"
                      value={material.density}
                      onChange={(e) => setMaterial({ ...material, density: parseFloat(e.target.value) || 7800 })}
                      className="w-full font-mono text-slate-900 mt-0.5 border-b border-slate-300 focus:outline-none"
                    />
                  ) : (
                    <div className="font-mono font-semibold text-slate-800 mt-0.5">{material.density}</div>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Conductivity k [W/m·K]</div>
                  {materialType === 'custom' ? (
                    <input
                      type="number"
                      value={material.thermalConductivity}
                      onChange={(e) => setMaterial({ ...material, thermalConductivity: parseFloat(e.target.value) || 45 })}
                      className="w-full font-mono text-slate-900 mt-0.5 border-b border-slate-300 focus:outline-none"
                    />
                  ) : (
                    <div className="font-mono font-semibold text-slate-800 mt-0.5">{material.thermalConductivity}</div>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Specific Heat Cp [J/kg·K]</div>
                  {materialType === 'custom' ? (
                    <input
                      type="number"
                      value={material.specificHeat}
                      onChange={(e) => setMaterial({ ...material, specificHeat: parseFloat(e.target.value) || 500 })}
                      className="w-full font-mono text-slate-900 mt-0.5 border-b border-slate-300 focus:outline-none"
                    />
                  ) : (
                    <div className="font-mono font-semibold text-slate-800 mt-0.5">{material.specificHeat}</div>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Melting / Solidus [°C]</div>
                  {materialType === 'custom' ? (
                    <input
                      type="number"
                      value={material.meltingPoint}
                      onChange={(e) => setMaterial({ ...material, meltingPoint: parseFloat(e.target.value) || 1500 })}
                      className="w-full font-mono text-slate-900 mt-0.5 border-b border-slate-300 focus:outline-none"
                    />
                  ) : (
                    <div className="font-mono font-semibold text-slate-800 mt-0.5">{material.meltingPoint} °C</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-400 italic">
                “Constant thermal properties assumed.”
              </div>
            </div>

            {/* WORKPIECE DIMENSIONS */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <iconify-icon icon="solar:ruler-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                WORKPIECE DIMENSIONS
              </div>

              {/* Length */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Plate Length [mm]</span>
                  <span className="font-mono font-semibold text-slate-800">{workpiece.length} mm</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={300}
                  step={10}
                  value={workpiece.length}
                  onChange={(e) => setWorkpiece({ ...workpiece, length: Math.max(50, parseFloat(e.target.value)) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Width */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Plate Width [mm]</span>
                  <span className="font-mono font-semibold text-slate-800">{workpiece.width} mm</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={150}
                  step={5}
                  value={workpiece.width}
                  onChange={(e) => setWorkpiece({ ...workpiece, width: Math.max(30, parseFloat(e.target.value)) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Thickness */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Plate Thickness [mm]</span>
                  <span className="font-mono font-semibold text-slate-800">{workpiece.thickness.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={20}
                  step={0.5}
                  value={workpiece.thickness}
                  onChange={(e) => setWorkpiece({ ...workpiece, thickness: Math.max(1, parseFloat(e.target.value)) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* JOINT GEOMETRY (BUTT JOINT) */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs">
                  <iconify-icon icon="solar:minimize-square-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                  JOINT GEOMETRY
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-semibold uppercase">
                  BUTT JOINT
                </span>
              </div>

              <div>
                <span className="text-slate-600 mb-1.5 block">Groove Selection:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['square', 'single_v', 'double_v'] as GrooveType[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setWorkpiece({ ...workpiece, grooveType: g })}
                      className={`py-1.5 px-2 text-center rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        workpiece.grooveType === g
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {g === 'square' ? 'Square Butt' : g === 'single_v' ? 'Single-V' : 'Double-V'}
                    </button>
                  ))}
                </div>
              </div>

              {workpiece.grooveType !== 'square' && (
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Groove Included Angle</span>
                    <span className="font-mono font-semibold text-slate-800">{workpiece.grooveAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={5}
                    value={workpiece.grooveAngle}
                    onChange={(e) => setWorkpiece({ ...workpiece, grooveAngle: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Root Gap [mm]</div>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={workpiece.rootGap}
                    onChange={(e) => setWorkpiece({ ...workpiece, rootGap: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full font-mono text-slate-800 font-semibold mt-0.5 border-b border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Root Face [mm]</div>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={workpiece.rootFace}
                    onChange={(e) => setWorkpiece({ ...workpiece, rootFace: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full font-mono text-slate-800 font-semibold mt-0.5 border-b border-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* INITIAL / AMBIENT CONDITIONS */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <iconify-icon icon="solar:sun-2-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                INITIAL / AMBIENT CONDITIONS
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">T0 [°C]</div>
                  <input
                    type="number"
                    value={workpiece.initialTemp}
                    onChange={(e) => setWorkpiece({ ...workpiece, initialTemp: parseFloat(e.target.value) || 25 })}
                    className="w-full font-mono text-slate-800 font-semibold mt-0.5 border-b border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">T∞ [°C]</div>
                  <input
                    type="number"
                    value={workpiece.ambientTemp}
                    onChange={(e) => setWorkpiece({ ...workpiece, ambientTemp: parseFloat(e.target.value) || 25 })}
                    className="w-full font-mono text-slate-800 font-semibold mt-0.5 border-b border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">h [W/m²·K]</div>
                  <input
                    type="number"
                    value={workpiece.convectionCoeff}
                    onChange={(e) => setWorkpiece({ ...workpiece, convectionCoeff: parseFloat(e.target.value) || 15 })}
                    className="w-full font-mono text-slate-800 font-semibold mt-0.5 border-b border-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. WELDING TAB                                       */}
        {/* ==================================================== */}
        {activeTab === 'WELDING' && (
          <div className="space-y-4">
            {/* PROCESS SELECTION */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 block uppercase tracking-wider text-xs">Welding Process:</span>
              <div className="grid grid-cols-3 gap-2">
                {(['GTAW', 'GMAW', 'SMAW'] as WeldingProcess[]).map((proc) => (
                  <button
                    key={proc}
                    onClick={() => handleSelectProcess(proc)}
                    className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      welding.process === proc
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {proc}
                  </button>
                ))}
              </div>
            </div>

            {/* ELECTRICAL PARAMETERS */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <iconify-icon icon="solar:bolt-circle-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                ELECTRICAL PARAMETERS
              </div>

              {/* Current */}
              <div>
                <div className="flex justify-between items-center text-slate-600 mb-1">
                  <span>Current I [A]</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={1}
                      min={40}
                      max={400}
                      value={welding.current}
                      onChange={(e) => setWelding({ ...welding, current: parseFloat(e.target.value) || 0 })}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-mono text-right font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="font-mono text-slate-400 text-xs">A</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={350}
                  step={5}
                  value={welding.current}
                  onChange={(e) => setWelding({ ...welding, current: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="text-xs text-slate-400 text-right font-mono">
                  Display: {welding.current.toFixed(2)} A
                </div>
              </div>

              {/* Voltage */}
              <div>
                <div className="flex justify-between items-center text-slate-600 mb-1">
                  <span>Voltage V [V]</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.5}
                      min={10}
                      max={45}
                      value={welding.voltage}
                      onChange={(e) => setWelding({ ...welding, voltage: parseFloat(e.target.value) || 0 })}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-mono text-right font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="font-mono text-slate-400 text-xs">V</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={12}
                  max={36}
                  step={0.5}
                  value={welding.voltage}
                  onChange={(e) => setWelding({ ...welding, voltage: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="text-xs text-slate-400 text-right font-mono">
                  Display: {welding.voltage.toFixed(2)} V
                </div>
              </div>

              {/* Efficiency */}
              <div>
                <div className="flex justify-between items-center text-slate-600 mb-1">
                  <span>Thermal Efficiency η</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(welding.efficiency * 100).toFixed(1)} %
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={0.95}
                  step={0.01}
                  value={welding.efficiency}
                  onChange={(e) => setWelding({ ...welding, efficiency: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Travel Speed */}
              <div>
                <div className="flex justify-between items-center text-slate-600 mb-1">
                  <span>Travel Speed v [mm/s]</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.25}
                      min={0.5}
                      max={20}
                      value={welding.travelSpeed}
                      onChange={(e) => setWelding({ ...welding, travelSpeed: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-mono text-right font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="font-mono text-slate-400 text-xs">mm/s</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={0.25}
                  value={welding.travelSpeed}
                  onChange={(e) => setWelding({ ...welding, travelSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="text-xs text-slate-400 text-right font-mono">
                  Display: {welding.travelSpeed.toFixed(2)} mm/s
                </div>
              </div>
            </div>

            {/* LIVE WELDING CALCULATIONS CARD */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <iconify-icon icon="solar:calculator-linear" width="16" height="16" className="text-indigo-600"></iconify-icon>
                LIVE WELDING CALCULATIONS
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Arc Power [W]</div>
                  <div className="font-mono font-semibold text-slate-900 text-sm mt-0.5">
                    {arcPower.toFixed(0)} W
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Effective Power [W]</div>
                  <div className="font-mono font-semibold text-indigo-600 text-sm mt-0.5">
                    {effectivePower.toFixed(0)} W
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Heat Input [J/mm]</div>
                  <div className="font-mono font-semibold text-slate-900 text-sm mt-0.5">
                    {heatInputJmm.toFixed(0)} J/mm
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-slate-400">Heat Input [kJ/mm]</div>
                  <div className="font-mono font-semibold text-indigo-600 text-sm mt-0.5">
                    {heatInputKJmm.toFixed(2)} kJ/mm
                  </div>
                </div>
              </div>
            </div>

            {/* WELDING TRAJECTORY SELECTION */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <iconify-icon icon="solar:route-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                WELDING TRAJECTORY
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'straight', label: '1. STRAIGHT', desc: 'xs(t)=vt, ys(t)=0', icon: 'solar:minus-linear' },
                  { id: 'zigzag', label: '2. ZIGZAG', desc: 'Triangular weave', icon: 'solar:chart-2-linear' },
                  { id: 'sinusoidal', label: '3. SINUSOIDAL', desc: 'ys(t)=A sin(2πft)', icon: 'solar:pulse-2-linear' },
                  { id: 'circular', label: '4. CIRCULAR', desc: 'Trochoidal oscillation', icon: 'solar:refresh-circle-linear' },
                ].map((traj) => (
                  <button
                    key={traj.id}
                    onClick={() => setWelding({ ...welding, trajectory: traj.id as TrajectoryType })}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                      welding.trajectory === traj.id
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{traj.label}</span>
                      <iconify-icon icon={traj.icon} width="14" height="14"></iconify-icon>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{traj.desc}</span>
                  </button>
                ))}
              </div>

              {welding.trajectory !== 'straight' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Weaving Amplitude A [mm]</span>
                      <span className="font-mono font-semibold text-slate-800">{welding.weaveAmplitude.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={8}
                      step={0.5}
                      value={welding.weaveAmplitude}
                      onChange={(e) => setWelding({ ...welding, weaveAmplitude: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Weaving Frequency f [Hz]</span>
                      <span className="font-mono font-semibold text-slate-800">{welding.weaveFrequency.toFixed(2)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={2.5}
                      step={0.05}
                      value={welding.weaveFrequency}
                      onChange={(e) => setWelding({ ...welding, weaveFrequency: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. GOLDAK MODEL TAB                                  */}
        {/* ==================================================== */}
        {activeTab === 'GOLDAK' && (
          <div className="space-y-4">
            {/* Live Schematic Component */}
            <GoldakSchematic goldak={goldak} />

            {/* Geometric Parameters Controls */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="font-semibold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs">
                  <iconify-icon icon="solar:compass-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                  GEOMETRIC PARAMETERS [mm]
                </span>
                <span className="text-xs text-slate-400">0 decimal places</span>
              </div>

              {/* a: Semi-width */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Semi-width a (transverse)</span>
                  <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                    {goldak.a.toFixed(0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={goldak.a}
                  onChange={(e) => setGoldak({ ...goldak, a: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* b: Semi-depth */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Penetration Semi-depth b</span>
                  <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                    {goldak.b.toFixed(0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={goldak.b}
                  onChange={(e) => setGoldak({ ...goldak, b: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* cf: Front length */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Front Length cf (leading)</span>
                  <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                    {goldak.cf.toFixed(0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={goldak.cf}
                  onChange={(e) => setGoldak({ ...goldak, cf: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* cr: Rear length */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Rear Length cr (trailing)</span>
                  <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                    {goldak.cr.toFixed(0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={25}
                  step={1}
                  value={goldak.cr}
                  onChange={(e) => setGoldak({ ...goldak, cr: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* HEAT FRACTIONS (ff + fr = 2) */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs">
                  <iconify-icon icon="solar:pie-chart-2-linear" width="16" height="16" className="text-slate-600"></iconify-icon>
                  HEAT FRACTIONS
                </span>
                <span className="text-xs font-mono text-slate-400">ff + fr = 2.00</span>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Front Heat Fraction (ff)</span>
                  <span className="font-mono font-semibold text-red-600">{goldak.ff.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.8}
                  step={0.05}
                  value={goldak.ff}
                  onChange={(e) => handleUpdateFractions(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Rear Heat Fraction (fr)</span>
                  <span className="font-mono font-semibold text-sky-600">{goldak.fr.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${(goldak.ff / 2) * 100}%` }}
                    title={`Front: ${(goldak.ff / 2) * 100}%`}
                  />
                  <div
                    className="bg-sky-500 h-full transition-all"
                    style={{ width: `${(goldak.fr / 2) * 100}%` }}
                    title={`Rear: ${(goldak.fr / 2) * 100}%`}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Front: {((goldak.ff / 2) * 100).toFixed(0)}%</span>
                  <span>Rear: {((goldak.fr / 2) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assumptions Modal */}
      {showAssumptionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
                <iconify-icon icon="solar:document-text-linear" width="20" height="20" className="text-indigo-600"></iconify-icon>
                Model Assumptions & Limitations
              </h3>
              <button
                onClick={() => setShowAssumptionsModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-600 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
              <p>
                This educational application implements the classic <strong>Goldak Double-Ellipsoid Heat Source Model</strong> coupled with transient 3D heat conduction:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 text-center">
                ρ Cp (∂T/∂t) = k ∇²T + q(x, y, z, t) - (2h / thickness)(T - T∞)
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                <li>Homogeneous, isotropic material with constant thermal conductivity and specific heat.</li>
                <li>Single-pass butt joint configuration.</li>
                <li>Natural surface convection boundary condition.</li>
                <li>No molten pool fluid flow (Marangoni convection) or keyhole physics.</li>
                <li>No filler metal deposition or arc pressure cratering.</li>
                <li>No metallurgical phase transformations or residual stress solver.</li>
              </ul>
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                <strong>Important Notice:</strong> Predicted Melt Zone is based strictly on the calculated thermal field exceeding the selected material melting/solidus temperature. This is an educational thermal-model prediction and is not a weld-quality certification.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAssumptionsModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

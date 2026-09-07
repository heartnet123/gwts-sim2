'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoldakConfig,
  MaterialProperties,
  MaterialType,
  ProbeConfig,
  SimulationResults,
  WeldingConfig,
  WorkpieceConfig,
} from '@/lib/types';
import { PRESET_MATERIALS } from '@/lib/materials';
import { ThermalSimulation } from '@/lib/thermalEngine';
import { SidebarControls } from '@/components/SidebarControls';
import { ThreeDView } from '@/components/ThreeDView';
import { TopView } from '@/components/TopView';
import { CrossSectionView } from '@/components/CrossSectionView';
import { TemperatureHistoryView } from '@/components/TemperatureHistoryView';
import { ThermalAssessmentView } from '@/components/ThermalAssessmentView';
import { TemperatureLegend } from '@/components/TemperatureLegend';

const initialWorkpiece: WorkpieceConfig = {
  length: 150,
  width: 80,
  thickness: 6.0,
  initialTemp: 25,
  ambientTemp: 25,
  convectionCoeff: 15.0,
  grooveType: 'single_v',
  grooveAngle: 60,
  rootGap: 1.5,
  rootFace: 1.5,
};

const initialWelding: WeldingConfig = {
  process: 'GMAW',
  current: 180.0,
  voltage: 24.0,
  efficiency: 0.8,
  travelSpeed: 5.0,
  trajectory: 'straight',
  weaveAmplitude: 3.0,
  weaveFrequency: 0.5,
};

const initialGoldak: GoldakConfig = {
  a: 4.0,
  b: 5.0,
  cf: 3.0,
  cr: 9.0,
  ff: 0.5,
  fr: 1.5,
};

const initialProbe: ProbeConfig = {
  x: 40,
  y: 0,
  z: 1.0,
};

export default function Home() {
  // 1. Material State
  const [materialType, setMaterialType] = useState<MaterialType>('carbon_steel');
  const [material, setMaterial] = useState<MaterialProperties>(PRESET_MATERIALS.carbon_steel);

  // 2. Workpiece State
  const [workpiece, setWorkpiece] = useState<WorkpieceConfig>(initialWorkpiece);

  // 3. Welding Parameters State
  const [welding, setWelding] = useState<WeldingConfig>(initialWelding);

  // 4. Goldak Model Parameters State
  const [goldak, setGoldak] = useState<GoldakConfig>(initialGoldak);

  // 5. Probe State
  const [probe, setProbe] = useState<ProbeConfig>(initialProbe);

  // 6. Navigation Tabs
  type ResultTab = '3D' | 'TOP_VIEW' | 'CROSS_SECTION' | 'TEMP_HISTORY' | 'ASSESSMENT';
  const [activeTab, setActiveTab] = useState<ResultTab>('3D');

  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 7. Simulation Engine Reference (held in ref, never read during render)
  const simRef = useRef<ThermalSimulation | null>(null);

  // Initialize initial results in state once
  const [results, setResults] = useState<SimulationResults>(() => {
    const initSim = new ThermalSimulation(
      initialWorkpiece,
      PRESET_MATERIALS.carbon_steel,
      initialWelding,
      initialGoldak,
      initialProbe
    );
    return initSim.calculateResults();
  });

  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize simRef in effect
  useEffect(() => {
    if (simRef.current === null) {
      simRef.current = new ThermalSimulation(
        workpiece,
        material,
        welding,
        goldak,
        probe
      );
    }
  }, [workpiece, material, welding, goldak, probe]);

  // Load Verified Example
  const handleLoadExample = useCallback(() => {
    const cs = PRESET_MATERIALS.carbon_steel;
    setMaterialType('carbon_steel');
    setMaterial(cs);
    const wp: WorkpieceConfig = {
      length: 150,
      width: 80,
      thickness: 6.0,
      initialTemp: 25,
      ambientTemp: 25,
      convectionCoeff: 15.0,
      grooveType: 'single_v',
      grooveAngle: 60,
      rootGap: 1.5,
      rootFace: 1.5,
    };
    setWorkpiece(wp);
    const weld: WeldingConfig = {
      process: 'GMAW',
      current: 180.0,
      voltage: 24.0,
      efficiency: 0.8,
      travelSpeed: 5.0,
      trajectory: 'straight',
      weaveAmplitude: 3.0,
      weaveFrequency: 0.5,
    };
    setWelding(weld);
    const gold: GoldakConfig = {
      a: 4.0,
      b: 5.0,
      cf: 3.0,
      cr: 9.0,
      ff: 0.5,
      fr: 1.5,
    };
    setGoldak(gold);
    const pr: ProbeConfig = { x: 45, y: 0, z: 1.5 };
    setProbe(pr);

    const newSim = new ThermalSimulation(wp, cs, weld, gold, pr);
    simRef.current = newSim;
    setResults(newSim.calculateResults());
    setIsPlaying(false);
  }, []);

  // Run Welding Simulation
  const handleRunSimulation = useCallback(() => {
    const sim = new ThermalSimulation(workpiece, material, welding, goldak, probe);
    sim.isRunning = true;
    sim.isPaused = false;
    simRef.current = sim;
    setIsPlaying(true);
    setResults(sim.calculateResults());
  }, [workpiece, material, welding, goldak, probe]);

  // Play / Pause Toggle
  const handleTogglePlayPause = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !sim.isRunning) {
      handleRunSimulation();
      return;
    }
    const nextPaused = !sim.isPaused;
    sim.isPaused = nextPaused;
    setIsPlaying(!nextPaused);
    setResults(sim.calculateResults());
  }, [handleRunSimulation]);

  // Restart Simulation
  const handleRestart = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.reset();
    setIsPlaying(false);
    setResults(sim.calculateResults());
  }, []);

  // Animation Loop for Simulation
  useEffect(() => {
    let animId: number;

    const loop = () => {
      animId = requestAnimationFrame(loop);

      const sim = simRef.current;
      if (sim && isPlaying && !sim.isPaused) {
        sim.step(0.04);
        const res = sim.calculateResults();
        setResults(res);

        if (sim.isPaused) {
          setIsPlaying(false);
        }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden select-none font-sans">
      {/* ==================================================== */}
      {/* 1. TOP APPLICATION HEADER & LIVE RESULTS STRIP       */}
      {/* ==================================================== */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-20 shrink-0">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle button */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Toggle Controls Sidebar"
          >
            <iconify-icon icon="solar:hamburger-menu-linear" width="20" height="20"></iconify-icon>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs tracking-tight shadow-sm">
              GW
            </div>
            <div>
              <h1 className="text-sm md:text-base font-semibold tracking-tight text-slate-900 leading-tight">
                Goldak Welding Thermal Simulator
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block font-normal">
                Double-Ellipsoid Heat Source Transient Thermal Model
              </p>
            </div>
          </div>
        </div>

        {/* Live Result Header Metrics */}
        <div className="hidden lg:flex items-center gap-5 text-xs">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">SIMULATION TIME</span>
            <span className="font-mono font-semibold text-slate-800">
              {results.currentTime.toFixed(2)} s
            </span>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">HEAT INPUT</span>
            <span className="font-mono font-semibold text-indigo-600">
              {results.heatInputKJmm.toFixed(2)} kJ/mm
            </span>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">MAX TEMP</span>
            <span className="font-mono font-semibold text-amber-600">
              {results.peakTemp.toFixed(0)} °C
            </span>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">MELT DEPTH</span>
            <span className="font-mono font-semibold text-slate-800">
              {results.maxMeltDepth.toFixed(1)} / {workpiece.thickness.toFixed(1)} mm
            </span>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">THERMAL STATUS</span>
            <span
              className={`font-semibold text-xs px-2.5 py-1 rounded-md border ${
                results.thermalStatus === 'FULL_THICKNESS'
                  ? 'bg-red-50 text-red-700 border-red-200/80'
                  : results.thermalStatus === 'PARTIAL_DEPTH'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {results.thermalStatus === 'FULL_THICKNESS'
                ? 'FULL-THICKNESS MELTING'
                : results.thermalStatus === 'PARTIAL_DEPTH'
                ? 'PARTIAL-DEPTH MELTING'
                : 'NO MELTING PREDICTED'}
            </span>
          </div>
        </div>

        {/* Action button header: RUN SIMULATION */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSimulation}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <iconify-icon icon="solar:play-circle-linear" width="16" height="16"></iconify-icon>
            RUN SIMULATION
          </button>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. MAIN SPLIT VIEW (LEFT CONTROLS + RIGHT RESULTS)   */}
      {/* ==================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop fixed width, Mobile overlay drawer) */}
        <aside
          className={`w-80 md:w-[350px] lg:w-[380px] h-full shrink-0 z-30 transition-transform duration-200 ease-in-out md:translate-x-0 bg-white border-r border-slate-200 ${
            mobileSidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0 shadow-2xl' : '-translate-x-full md:relative'
          }`}
        >
          <SidebarControls
            workpiece={workpiece}
            setWorkpiece={setWorkpiece}
            materialType={materialType}
            setMaterialType={setMaterialType}
            material={material}
            setMaterial={setMaterial}
            welding={welding}
            setWelding={setWelding}
            goldak={goldak}
            setGoldak={setGoldak}
            onRunSimulation={() => {
              handleRunSimulation();
              setMobileSidebarOpen(false);
            }}
            onLoadExample={handleLoadExample}
            isRunning={isPlaying}
          />
        </aside>

        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
          />
        )}

        {/* Right Main Area: RESULTS */}
        <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
          {/* Result Tabs Navigation Bar */}
          <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between text-xs text-slate-600 shrink-0">
            {/* Tabs List */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: '3D', label: '3D THERMAL FIELD', icon: 'solar:box-linear' },
                { id: 'TOP_VIEW', label: 'TOP VIEW', icon: 'solar:map-arrow-up-linear' },
                { id: 'CROSS_SECTION', label: 'CROSS SECTION', icon: 'solar:knife-linear' },
                { id: 'TEMP_HISTORY', label: 'TEMPERATURE HISTORY', icon: 'solar:chart-2-linear' },
                { id: 'ASSESSMENT', label: 'THERMAL ASSESSMENT', icon: 'solar:document-text-linear' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ResultTab)}
                  className={`px-3.5 py-1.5 rounded-lg font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-100 text-indigo-600 font-semibold shadow-xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <iconify-icon icon={tab.icon} width="15" height="15"></iconify-icon>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Temperature Legend widget */}
            <div className="hidden sm:block">
              <TemperatureLegend
                T0={workpiece.initialTemp}
                Tmelt={material.meltingPoint}
                peakTemp={results.peakTemp}
              />
            </div>
          </div>

          {/* Active View Display Area */}
          <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col bg-slate-100/60">
            {activeTab === '3D' && (
              <ThreeDView
                workpiece={workpiece}
                material={material}
                welding={welding}
                goldak={goldak}
                grid={results.grid}
                results={results}
              />
            )}

            {activeTab === 'TOP_VIEW' && (
              <TopView
                workpiece={workpiece}
                material={material}
                welding={welding}
                grid={results.grid}
                results={results}
              />
            )}

            {activeTab === 'CROSS_SECTION' && (
              <CrossSectionView
                workpiece={workpiece}
                material={material}
                grid={results.grid}
                results={results}
              />
            )}

            {activeTab === 'TEMP_HISTORY' && (
              <TemperatureHistoryView
                workpiece={workpiece}
                material={material}
                probe={probe}
                onUpdateProbe={setProbe}
                results={results}
              />
            )}

            {activeTab === 'ASSESSMENT' && (
              <ThermalAssessmentView
                workpiece={workpiece}
                material={material}
                welding={welding}
                results={results}
              />
            )}
          </div>

          {/* ==================================================== */}
          {/* 3. SIMULATION TIMELINE & TRANSPORT CONTROLS BAR      */}
          {/* ==================================================== */}
          <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between gap-6 text-xs text-slate-700 shadow-xs shrink-0">
            {/* Transport Controls: Play, Pause, Restart */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleTogglePlayPause}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm text-xs ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
                title={isPlaying ? 'Pause simulation' : 'Play simulation'}
              >
                <iconify-icon
                  icon={isPlaying ? 'solar:pause-linear' : 'solar:play-linear'}
                  width="16"
                  height="16"
                ></iconify-icon>
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={handleRestart}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs text-xs"
                title="Restart simulation time to zero without altering parameters"
              >
                <iconify-icon icon="solar:restart-linear" width="15" height="15"></iconify-icon>
                <span>Restart</span>
              </button>
            </div>

            {/* Interactive Timeline Scrubbing Bar */}
            <div className="flex-1 max-w-xl flex flex-col justify-center px-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
                <span>0.00 s</span>
                <span className="text-slate-800 font-semibold">
                  {results.currentTime.toFixed(2)} s / {results.totalTime.toFixed(2)} s
                </span>
                <span>{results.totalTime.toFixed(2)} s</span>
              </div>

              {/* Progress Track */}
              <div className="relative w-full h-2 bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, (results.currentTime / Math.max(1, results.totalTime)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Position Readouts */}
            <div className="hidden md:flex items-center gap-5 text-xs font-mono text-slate-500">
              <div>
                <span>Torch X: </span>
                <span className="text-slate-900 font-semibold">{results.torchPos.x.toFixed(1)} mm</span>
              </div>
              <div>
                <span>Torch Y: </span>
                <span className="text-slate-900 font-semibold">{results.torchPos.y.toFixed(1)} mm</span>
              </div>
              <div>
                <span>Distance: </span>
                <span className="text-indigo-600 font-semibold">
                  {Math.max(0, results.torchPos.x - 10).toFixed(1)} mm
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

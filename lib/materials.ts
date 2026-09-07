import { MaterialProperties, MaterialType } from './types';

export const PRESET_MATERIALS: Record<Exclude<MaterialType, 'custom'>, MaterialProperties> = {
  carbon_steel: {
    name: 'Carbon Steel (AISI 1020 / Structural)',
    density: 7850, // kg/m³
    thermalConductivity: 45.0, // W/m·K
    specificHeat: 480, // J/kg·K
    meltingPoint: 1510, // °C
    isSteel: true,
  },
  stainless_304: {
    name: 'Stainless Steel 304 (Austenitic)',
    density: 7930, // kg/m³
    thermalConductivity: 16.2, // W/m·K
    specificHeat: 500, // J/kg·K
    meltingPoint: 1450, // °C
    isSteel: true,
  },
  aluminum_6061: {
    name: 'Aluminum 6061-T6',
    density: 2700, // kg/m³
    thermalConductivity: 167.0, // W/m·K
    specificHeat: 896, // J/kg·K
    meltingPoint: 650, // °C
    isSteel: false,
  },
};

export const DEFAULT_CUSTOM_MATERIAL: MaterialProperties = {
  name: 'Custom Alloy',
  density: 7800,
  thermalConductivity: 35.0,
  specificHeat: 490,
  meltingPoint: 1480,
  isSteel: false,
};

export const DEFAULT_EFFICIENCIES: Record<string, number> = {
  GTAW: 0.60,
  GMAW: 0.80,
  SMAW: 0.75,
};

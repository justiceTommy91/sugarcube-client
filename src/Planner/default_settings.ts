import type { PlannerSettings } from 'Planner/planner_types'

export const getDefaultSettings = (): PlannerSettings => ({
  // Auto lightning parameters from labtech-whole-room-texturer.
  lights: {
    lightIntensityPerM3: 0.5,
    roomIntensityFactor: 0.75,
    gridSize: 1.9,
    maxLampCount: 10,
    greedySamplingMinLampSize: 0.4,
    greedySamplingGridSize: 0.2,
    autoLightsRefresh: true,
  },
  wallMoveMethod: `method1`,
})

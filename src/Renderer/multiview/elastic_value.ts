import { EPSILON } from 'Renderer/geometry/config'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export class ElasticValue {
    private minValue: number
    private maxValue: number
    private targetValue: number
    private currentValue: number

    private stiffness: number
    private valueThreshold: number

    constructor(minValue: number, maxValue: number, stiffness: number, threshold?: number) {
      this.minValue = minValue
      this.maxValue = maxValue
      this.stiffness = clamp(stiffness, 0.0, 1.0)

      this.targetValue = 0.0
      this.currentValue = 0.0

      this.valueThreshold = threshold === undefined ? Math.abs(maxValue - minValue) * 0.001 : threshold
    }

    public getIsOnTarget() {
      return Math.abs(this.targetValue - this.currentValue) < EPSILON
    }

    public getCurrentValue() {
      return this.currentValue
    }

    public setLimts(min: number, max: number) {
      this.minValue = min
      this.maxValue = max
      this.currentValue = clamp(this.currentValue, this.minValue, this.maxValue)
      if (Math.abs(this.targetValue - this.currentValue) < this.valueThreshold) {
        this.currentValue = this.targetValue
      }
    }

    public update(dtSeconds = 1 / 60.0) {
      // Existing stiffness values in the app are already tuned for 60fps.
      const k = this.stiffness * 60.0
      const decay = Math.exp(-k * dtSeconds)
      this.currentValue = this.targetValue + (this.currentValue - this.targetValue) * decay
      this.currentValue = clamp(this.currentValue, this.minValue, this.maxValue)
      if (Math.abs(this.targetValue - this.currentValue) < this.valueThreshold) {
          this.currentValue = this.targetValue
      }
    }

    public setTargetValue(value: number) {
      this.targetValue = clamp(value, this.minValue, this.maxValue)
    }

    public forceValue(value: number) {
      this.targetValue = clamp(value, this.minValue, this.maxValue)
      this.currentValue = this.targetValue
    }
  }
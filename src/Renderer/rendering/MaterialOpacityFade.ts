import { gvCurrentScene } from 'Renderer/foundation/geom_app'
import * as THREE from 'three'
import Fading from 'utils/fading'

export class MaterialOpacityFade {
  private material: THREE.Material
  private currentFading: Fading | null = null
  private fullOpacity = 1.0
  private startOpacity = 0.0
  private targetOpacity = 0.0
  private isFadingIn = false

  constructor(material: THREE.Material) {
    this.material = material
    this.fullOpacity = material.opacity
  }

  public dispose() {
    if (this.currentFading) {
      this.currentFading.stop()
      this.currentFading = null
    }
  }

  public start(isFadeIn: boolean, fadeTimeSecs = 0.75, onFinish?: () => void) {
    const ease = (t: number) => 1 - 2 ** (-10 * t)
    this.startOpacity = this.material.opacity
    this.targetOpacity = isFadeIn ? this.fullOpacity : 0.0

    let totalTime = fadeTimeSecs
    if (this.currentFading) {
      if (this.isFadingIn === isFadeIn) {
        totalTime *= (1.0 - this.currentFading.t)
      } else {
        totalTime *= this.currentFading.t
      }
      this.currentFading.stop()
    }

    this.isFadingIn = isFadeIn
    this.currentFading = new Fading(totalTime,
      (t) => {
        this.material.opacity = this.startOpacity + ease(t) * (this.targetOpacity - this.startOpacity)
        gvCurrentScene()?.setIsDirty(true)
      },
      () => {
        this.currentFading = null
        if (onFinish) {
          onFinish()
        }
      }
    )
  }
}
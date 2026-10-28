export type AnimationCallback = (t: number) => void

export default class Fading {
    public t: number // current time in milliseconds

    private fadeTime: number // in milliseconds

    private startTime: number | null // in milliseconds

    private animationRequest: number | null

    private onAnimate: AnimationCallback | null

    private onFinish: AnimationCallback | null

    private isFading: boolean

    constructor(fadeTimeSeconds: number, onAnimate: AnimationCallback | null, onFinish: AnimationCallback | null) {
        this.fadeTime = Math.max(fadeTimeSeconds * 1000.0, 16.6 /* ~1 frame time */)
        this.onAnimate = onAnimate
        this.onFinish = onFinish

        this.animationRequest = null
        this.startTime = null
        this.isFading = false

        this.start = this.start.bind(this)
        this.stop = this.stop.bind(this)
        this.animate = this.animate.bind(this)

        this.t = 0.0

        this.start()
    }

    start() {
        this.t = 0.0
        this.isFading = true
        this.animationRequest = requestAnimationFrame(this.animate)
    }

    stop() {
        this.t = 0.0
        this.isFading = false
        if (this.animationRequest) {
            cancelAnimationFrame(this.animationRequest)
        }
    }

    animate(timeMilliseconds: number) {
        if (!this.isFading) {
            return
        }

        if (!this.startTime) {
            this.startTime = timeMilliseconds
        }

        this.t = Math.min(Math.max((timeMilliseconds - this.startTime) / this.fadeTime, 0.0), 1.0)
        if (this.onAnimate) {
            this.onAnimate(this.t)
        }

        if (this.t < 1.0) {
            this.animationRequest = requestAnimationFrame(this.animate)
        } else {
            this.isFading = false
            if (this.onFinish) {
                this.onFinish(this.t)
            }
            this.t = 0.0
        }
    }
}

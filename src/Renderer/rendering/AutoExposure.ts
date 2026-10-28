import { CameraView } from "Renderer/multiview/camera_types"

interface ExposureContext {
  computeLuminanceForView(view: CameraView): number | undefined;
  getSettings(): { autoExposureTarget: number; };
}

export class AutoExposure {
    private views = new Map<string, CameraView>()
    private currentViewIndex = 0
    private luminance: number[] = []
    private averageLuminance = 0.8
    private currentExposure = 1.0
    private lastAverage = -1.0

    public computeExposure(
        views: Map<string, CameraView>, 
        exposureContext: ExposureContext): { changed: boolean, exposure: number } {

        this.setViews(views)

        const average = this.computeNext(exposureContext)
        const exposureChanged = !!average && Math.abs(this.lastAverage - average) > 0.001

        if (average) {
            this.lastAverage = average
            const debugSettings = exposureContext.getSettings()
            const targetExposure = debugSettings.autoExposureTarget / (average + 0.0001)

            const exposureBefore = this.currentExposure
            
            const diff = Math.abs(targetExposure - exposureBefore);
            const minRate = 0.01; // slowest change when close
            const maxRate = 0.3;  // fastest change when far
            const sensitivity = 2.0; // how quickly we ramp up
            const smoothFactor = 1 - Math.exp(-diff * sensitivity);
            const adaptationRate = minRate + (maxRate - minRate) * smoothFactor;
    
            const exposureAfter = exposureBefore + (targetExposure - exposureBefore) * adaptationRate;
            const newExposure =  Math.min(16, Math.max(1.0 / 16.0, exposureAfter))
            this.currentExposure = newExposure
        }

        return { changed: exposureChanged, exposure: this.currentExposure } 
    }

    // Computes the average log luminance. Input data must be aligned as rgba
    // 8 bits per component. Pixel intensities are assumed to be in linear color space.
    public static computeLogAverageLuminance(rgbaData: Uint8ClampedArray): number {
        let sum = 0;
        let count = 0;
        const EPSILON = 1e-4;

        for (let i = 0; i < rgbaData.length; i += 4) {
            const r = (rgbaData[i] / 255)
            const g = (rgbaData[i + 1] / 255)
            const b = (rgbaData[i + 2] / 255)
            const a = (rgbaData[i + 3] / 255)
            if (a > 0.5) {
                const luminance = AutoExposure.getLuminance(r, g, b)
                sum += Math.log(Math.max(EPSILON, luminance));
                count += 1;
            }
        }

        return Math.exp(sum / count);
    }

    // Computes the 90th percentile luminance. Input data must be aligned as rgba
    // 8 bits per component. Pixel intensities are assumed to be in linear color space.
    public static compute90thPercentileLuminance(pixelData: Uint8ClampedArray): number {
        const luminances: number[] = [];

        for (let i = 0; i < pixelData.length; i += 4) {
            const r = (pixelData[i] / 255)
            const g = (pixelData[i + 1] / 255)
            const b = (pixelData[i + 2] / 255)
            const a = (pixelData[i + 3] / 255)
            if (a >= 0.5) {
                const luminance = AutoExposure.getLuminance(r, g, b)
                luminances.push(luminance)
            }
        }

        // Sort luminances ascending
        luminances.sort((a, b) => a - b);

        const index = Math.floor(0.9 * luminances.length - 1);
        return luminances[index];
    }

    // Convert to luminance using Rec.709
    private static getLuminance(r: number, g: number, b: number) {
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    // Computes average luminance for the next view.
    // Precondition is that setViews() has been called.
    private computeNext(exposureContext: ExposureContext): number {
        const label = [...this.views.keys()].at(this.currentViewIndex)
        if (!label) return 0

        const view = this.views.get(label)
        if (!view) return 0

        const luminance = exposureContext.computeLuminanceForView(view)
        if (luminance !== undefined)
            this.luminance[this.currentViewIndex] = luminance

        this.currentViewIndex = (this.currentViewIndex + 1) % this.views.size

        const newLuminance = this.getAverageLuminance()
        this.averageLuminance = newLuminance
        return this.averageLuminance
    }

    // Sets the views to cycle through for each auto exposure frame and checks if the view labels have changed.
    private setViews(views: Map<string, CameraView>) {
        const viewsChanged = views.size !== this.views.size || (![...views.keys()].every(s => this.views.has(s)))
        if (viewsChanged) {
            this.currentViewIndex = 0
            this.luminance = new Array<number>(views.size).fill(0);
            this.views = views
        }
    }

    private getAverageLuminance(): number {
        const valid = this.luminance.filter(v => v > 0);
        return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
    }
}
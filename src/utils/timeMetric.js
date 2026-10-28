/**
 * TimeMetric
 * Models time tracking buckets which is used to calculate
 * performance over time.
 */

// The number of frames we track to calculate running median frame time
const FRAME_TIMES_SLIDING_WINDOW_SIZE = 30

class TimeMetric {
    // Constructor initializes timing 'bins' and 'histogram' using
    // predefined buckets that can be manipulated using a mapping
    // function eg. value => value * 2, title => 'loading ' + title.
    constructor(mappingFn) {
        this.data = []
        this.lastFrame = null

        this.intervalStartTime = null
        const bins = [
            { title: 'frame 0-15 ms', value: 15.0 },
            { title: 'frame 15-40 ms', value: 40.0 },
            { title: 'frame 40-100 ms', value: 100.0 },
            { title: 'frame 100-200 ms', value: 200.0 },
            { title: 'frame 200-500 ms', value: 500 },
            { title: 'frame 500-1000 ms', value: 1000.0 },
            { title: 'frame 1000-2000 ms', value: 2000.0 },
            { title: 'frame 2000-inf ms', value: null },
        ]
        this.bins = mappingFn ? bins.map(mappingFn) : bins

        this.histogram = null
        if (Array.isArray(this.bins)) {
            this.histogram = this.bins.map(() => 0.0)
        }
        this.valuesCount = 0

        this.frameTimesSlidingWindow = []
        this.frameTimeStamps = []
        this.medianFrameTime = 0.0
    }

    intervalStart() {
        this.intervalStartTime = performance.now()
    }

    intervalStop() {
        const timeNow = performance.now()
        const interval = timeNow - this.intervalStartTime
        this.addValue(interval)

        this.frameTimesSlidingWindow.push(Math.round(interval))
        this.frameTimeStamps.push(Date.now())

        if (this.frameTimesSlidingWindow.length > FRAME_TIMES_SLIDING_WINDOW_SIZE) {
            this.frameTimesSlidingWindow.shift()
            this.frameTimeStamps.shift()
            const sortedFrameTimes = this.frameTimesSlidingWindow.toSorted((a, b) => a - b)
            this.medianFrameTime = sortedFrameTimes[sortedFrameTimes.length / 2]
        }
    }

    addValue(value) {
        if (!Array.isArray(this.bins)) {
            return
        }
        this.valuesCount += 1
        for (let i = 0; i < this.bins.length; i += 1) {
            const lowerLimit = i > 0 ? this.bins[i - 1].value : 0.0
            const upperLimit = this.bins[i].value !== null ? this.bins[i].value : Infinity
            if (value > lowerLimit && value <= upperLimit) {
                this.histogram[i] += 1
                break
            }
        }
    }
}

export default TimeMetric

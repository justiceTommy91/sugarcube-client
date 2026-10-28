class Histogram {
    constructor() {
        this.time = Date.now()
        this.ignore = 3
        this.metrics = new Map()
        // seeding in order with 0 eliminates need to sort
        for (let i = 0; i < 5000; i += 1) {
            this.metrics.set(Histogram.quant(i), 0)
        }
    }

    static quant(i) {
        const log = Math.floor(Math.log(i) * 10.0)
        const bin = Math.round(Math.E ** (log * 0.1))
        return bin
    }

    timestamp() {
        this.time = Date.now()
    }

    ignore3() {
        this.ignore = 3
    }

    recordValue(inval) {
        // bin by logarithmic groups
        const qval = Histogram.quant(inval)
        let count = this.metrics.get(qval)
        if (count) {
            count += 1
            this.metrics.set(qval, count)
        } else {
            this.metrics.set(qval, 1)
        }
    }

    record() {
        const tmpTime = Date.now()
        let elapsed = tmpTime - this.time
        // bin by logarithmic groups
        elapsed = Histogram.quant(elapsed)
        if (this.ignore > 0) {
            this.ignore -= 1
        }
        if (this.ignore === 0) {
            let count = this.metrics.get(elapsed)
            if (count) {
                count += 1
                this.metrics.set(elapsed, count)
            } else {
                this.metrics.set(elapsed, 1)
            }
        }
    }

    getHistogramRaw() {
        const mapDump = new Map()
        this.metrics.forEach((value, key) => {
            if (value > 0) {
                mapDump.set(key, value)
            }
        })
        return mapDump
    }

    getHistogram() {
        const mapDump = new Map()
        this.metrics.forEach((value, key) => {
            // filter out < 10 ms and < 10 entries
            if (value >= 10 && key >= 10) {
                mapDump.set(key, value)
            }
        })
        return mapDump
    }

    getStats() {
        let maxkey = null
        let maxval = 0
        let total = 0
        let total125 = 0
        let total250 = 0
        let total500 = 0
        let total1000 = 0
        let total2000 = 0
        function logVal(value, key) {
            total += value
            if (key >= 125) {
                total125 += value
                if (key >= 250) {
                    total250 += value
                    if (key >= 500) {
                        total500 += value
                        if (key >= 1000) {
                            total1000 += value
                            if (key >= 2000) {
                                total2000 += value
                            }
                        }
                    }
                }
            }
            if (value > maxval) {
                maxkey = key
                maxval = value
            }
        }
        this.metrics.forEach(logVal)

        return {
            peakElapsed: maxkey,
            sampleCount: total,
            outlier125: total125,
            outlier250: total250,
            outlier500: total500,
            outlier1000: total1000,
            outlier2000: total2000,
        }
    }
}

export default Histogram

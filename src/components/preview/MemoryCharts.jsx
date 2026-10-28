import React, { Component } from 'react'
import { debugSettingsType } from 'models/propTypes'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { toggleMemoryTracking, isMemoryTrackingActive } from 'utils/memoryTracker'

/* eslint-disable i18next/no-literal-string */

class MemoryCharts extends Component {
    constructor(props) {
        super(props)

        this.onMemorySnapshot = this.onMemorySnapshot.bind(this)
        this.onToggleTrackingButton = this.onToggleTrackingButton.bind(this)

        ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

        this.state = {
            debugMemoryTracking: [], // Track change to reload memory tracker chart
        }
    }

    componentDidMount() {
        document.addEventListener('memorySnapshot', this.onMemorySnapshot)
        toggleMemoryTracking(true)
    }

    componentWillUnmount() {
        document.removeEventListener('memorySnapshot', this.onMemorySnapshot)
        toggleMemoryTracking(false)
    }

    onMemorySnapshot(event) {
        this.setState((prevState) => {
            const lastIndex = prevState.debugMemoryTracking.length - 1
            const prevMinTotalHeap = (prevState.debugMemoryTracking[lastIndex] || {}).minTotalHeap || Infinity
            const prevMinUsedHeap = (prevState.debugMemoryTracking[lastIndex] || {}).minUsedHeap || Infinity
            const prevMinWebGLTextureMem = (prevState.debugMemoryTracking[lastIndex] || {}).minWebGLTexture || Infinity
            const prevMinWebGLBufferMem = (prevState.debugMemoryTracking[lastIndex] || {}).minWebGLBuffer || Infinity
            return {
                debugMemoryTracking: [
                    ...prevState.debugMemoryTracking,
                    {
                        minTotalHeap: Math.min(prevMinTotalHeap, event.memorySnapshot.totalJSHeapSize),
                        minUsedHeap: Math.min(prevMinUsedHeap, event.memorySnapshot.usedJSHeapSize),
                        minWebGLTexture: Math.min(prevMinWebGLTextureMem, event.memorySnapshot.textureMemory),
                        minWebGLBuffer: Math.min(prevMinWebGLBufferMem, event.memorySnapshot.bufferMemory),
                        ...event.memorySnapshot,
                    },
                ],
            }
        })
    }

    onToggleTrackingButton() {
        if (!isMemoryTrackingActive()) {
            toggleMemoryTracking(true)
            document.addEventListener('memorySnapshot', this.onMemorySnapshot)
        } else {
            toggleMemoryTracking(false)
            document.removeEventListener('memorySnapshot', this.onMemorySnapshot)
        }
    }

    render() {
        const showHeapMemoryChart =
            this.props.debugSettings.trackedMemoryType === 0 && // 0 -> heap
            this.state.debugMemoryTracking.length &&
            this.state.debugMemoryTracking[0].jsHeapSizeLimit
        const showWebGLTextureMemoryChart =
            this.props.debugSettings.trackedMemoryType === 1 && // 1 -> webgl textures
            this.state.debugMemoryTracking.length &&
            this.state.debugMemoryTracking[0].textureMemory
        const showWebGLBufferMemoryChart =
            this.props.debugSettings.trackedMemoryType === 2 && // 2 -> webgl buffers
            this.state.debugMemoryTracking.length &&
            this.state.debugMemoryTracking[0].bufferMemory

        return (
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `100%`,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }}
            >
                {showHeapMemoryChart && (
                    <Line
                        data={{
                            labels: this.state.debugMemoryTracking.map((_, index) => index / 2),
                            label: 'JS Memory tracking',
                            datasets: [
                                {
                                    id: 1,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((snapshot) =>
                                        snapshot.totalJSHeapSize.toFixed(1),
                                    ),
                                    label: 'Total JS heap',
                                    borderColor: 'rgb(75, 192, 192)',
                                },
                                {
                                    id: 2,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((_, i, a) =>
                                        a[a.length - 1].minTotalHeap.toFixed(1),
                                    ),
                                    label: 'Minimum total JS heap',
                                    borderColor: 'rgba(75, 192, 192, 0.4)',
                                },
                                {
                                    id: 3,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((snapshot) =>
                                        snapshot.usedJSHeapSize.toFixed(1),
                                    ),
                                    label: 'Used JS heap',
                                    borderColor: 'rgb(120, 0, 0)',
                                },
                                {
                                    id: 4,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((_, i, a) =>
                                        a[a.length - 1].minUsedHeap.toFixed(1),
                                    ),
                                    label: 'Minimum used JS heap',
                                    borderColor: 'rgba(130, 0, 0, 0.4)',
                                },
                            ],
                        }}
                        options={{
                            animation: { y: { duration: 0 } },
                            responsive: true,
                            plugins: {
                                legend: { position: 'top' },
                                title: { display: true, text: 'JS memory tracking (MB)' },
                            },
                        }}
                    />
                )}
                {showHeapMemoryChart && (
                    <p>Max available heap: {this.state.debugMemoryTracking[0].jsHeapSizeLimit}mb</p>
                )}
                {showWebGLTextureMemoryChart && (
                    <Line
                        data={{
                            labels: this.state.debugMemoryTracking.map((_, index) => index / 2),
                            label: 'WebGL texture memory tracking',
                            datasets: [
                                {
                                    id: 1,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((snapshot) =>
                                        snapshot.textureMemory.toFixed(1),
                                    ),
                                    label: 'Texture memory',
                                    borderColor: 'rgb(0, 192, 0)',
                                },
                                {
                                    id: 2,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((_, i, a) =>
                                        a[a.length - 1].minWebGLTexture.toFixed(1),
                                    ),
                                    label: 'Minimum texture memory',
                                    borderColor: 'rgba(0, 192, 0, 0.4)',
                                },
                            ],
                        }}
                        options={{
                            animation: { y: { duration: 0 } },
                            responsive: true,
                            plugins: {
                                legend: { position: 'top' },
                                title: { display: true, text: 'WebGL texture memory tracking (MB)' },
                            },
                        }}
                    />
                )}
                {showWebGLBufferMemoryChart && (
                    <Line
                        data={{
                            labels: this.state.debugMemoryTracking.map((_, index) => index / 2),
                            label: 'WebGL buffer memory tracking',
                            datasets: [
                                {
                                    id: 1,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((snapshot) =>
                                        snapshot.bufferMemory.toFixed(1),
                                    ),
                                    label: 'Buffer memory',
                                    borderColor: 'rgb(0, 192, 0)',
                                },
                                {
                                    id: 2,
                                    fill: false,
                                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                                    data: this.state.debugMemoryTracking.map((_, i, a) =>
                                        a[a.length - 1].minWebGLBuffer.toFixed(1),
                                    ),
                                    label: 'Minimum buffer memory',
                                    borderColor: 'rgba(0, 192, 0, 0.4)',
                                },
                            ],
                        }}
                        options={{
                            animation: { y: { duration: 0 } },
                            responsive: true,
                            plugins: {
                                legend: { position: 'top' },
                                title: { display: true, text: 'WebGL buffer memory tracking (KB)' },
                            },
                        }}
                    />
                )}
                {(showHeapMemoryChart || showWebGLTextureMemoryChart || showWebGLBufferMemoryChart) && (
                    <button onClick={this.onToggleTrackingButton}>Toggle memory tracking</button>
                )}
            </div>
        )
    }
}

MemoryCharts.propTypes = {
    debugSettings: debugSettingsType.isRequired,
}

export default MemoryCharts

// Demo selector — dropdown to switch between test demos
// Pattern based on e2eTests/gfxtest/ComponentTestContainer.jsx
import React, { useState, lazy, Suspense, type ComponentType } from 'react'
import './ViewerTest.scss'

const DEFAULT_SCENE_UUID = '6c906592-e370-4f5b-b39c-3dacb6995459'
const SCENE_UUIDS = [
    '6c906592-e370-4f5b-b39c-3dacb6995459',
    '770d9594-51d7-4bf3-aac3-1087ba702c1d',
]

export interface DemoProps {
    sceneId: string
}

// Register demos here. Use lazy() so each demo's heavy dependencies
// (ViewerContext, Three.js, etc.) are code-split into separate chunks.
const demos: Record<string, { label: string; component: React.LazyExoticComponent<ComponentType<DemoProps>> }> = {
    animationTuner: {
        label: 'Animation Tuner',
        component: lazy(() => import('./demos/AnimationTuner').then((m) => ({ default: m.AnimationTuner }))),
    },
}

const demoKeys = Object.keys(demos)
const DEFAULT_DEMO = demoKeys[0]

const LoadingFallback = () => (
    <div className="ViewerTest__loading">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <div>Loading demo...</div>
    </div>
)

export const ViewerTest = () => {
    const [selectedDemo, setSelectedDemo] = useState(DEFAULT_DEMO)
    const [selectedSceneId, setSelectedSceneId] = useState<string>(() => {
        if (typeof window === 'undefined') return DEFAULT_SCENE_UUID
        const urlParams = new URLSearchParams(window.location.search)
        return urlParams.get('sceneId') || DEFAULT_SCENE_UUID
    })
    const DemoComponent = demos[selectedDemo].component

    return (
        <div className="ViewerTest">
            {/* Demo selector — top bar */}
            <div className="ViewerTest__top-bar">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <span className="ViewerTest__label">Demos</span>
                <select
                    aria-label="Demos"
                    value={selectedDemo}
                    onChange={(e) => setSelectedDemo(e.target.value)}
                    className="ViewerTest__select"
                >
                    {demoKeys.map((key) => (
                        <option key={key} value={key}>
                            {demos[key].label}
                        </option>
                    ))}
                </select>
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <span className="ViewerTest__label">Scene</span>
                <select
                    aria-label="Scene"
                    value={selectedSceneId}
                    onChange={(e) => setSelectedSceneId(e.target.value)}
                    className="ViewerTest__select"
                >
                    {SCENE_UUIDS.map((uuid) => (
                        <option key={uuid} value={uuid}>
                            {uuid}
                        </option>
                    ))}
                </select>
            </div>

            {/* Render selected demo */}
            <Suspense fallback={<LoadingFallback />}>
                <div className="ViewerTest__demo-area">
                    <DemoComponent sceneId={selectedSceneId} />
                </div>
            </Suspense>
        </div>
    )
}

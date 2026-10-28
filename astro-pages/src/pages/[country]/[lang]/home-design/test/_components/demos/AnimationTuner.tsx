/* eslint-disable i18next/no-literal-string */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ViewerContext, useViewerContext } from '@gatsby/Renderer/ui/components/ViewerContext'
import { Viewport } from '@gatsby/Renderer/ui/components/Viewport'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import type { PointXYZ } from '@gatsby/Renderer/geomviewer/geom_types'
import type { DebugSettings } from '@gatsby/Renderer/geomviewer'
import { degreesToQuat } from '@gatsby/Renderer/geometry/utilities'
import { easeOutQuint, easeOutCubic, easeInOutCubic, linear } from '@gatsby/Renderer/utils/math_utils'
import DrawingOverlay from '@astro-components/find-my-fit/viewer/DrawingOverlay'
import { useDrawingMode } from '@astro-components/find-my-fit/viewer/hooks/useDrawingMode'
import { useCarousel, type CarouselState } from '@astro-components/find-my-fit/viewer/hooks/useCarousel'
import { useSceneSetup } from '@astro-components/find-my-fit/viewer/hooks/useSceneSetup'
import {
    SceneItemManager,
    modifyItem,
    changeDebugSettings,
} from '@astro-components/find-my-fit/viewer/SceneItemManager'
import { smootherstep, clamp, lerpScale, lerpOpacity } from '@astro-components/find-my-fit/viewer/carouselMath'
import type { ProductData, ProductFamily, AnimParams, EasingFn } from '@astro-components/find-my-fit/viewer/types'
import { DEFAULT_ANIM_PARAMS } from '@astro-components/find-my-fit/viewer/types'
import { type DemoProps } from '../ViewerTest'
import productsData from './assets/products_cabinet.json'
import '@astro-components/find-my-fit/viewer/FindMyFitCarousel.scss'
import './AnimationTuner.scss'

/** Named easing presets for UI selectors */
const EASING_PRESETS: Record<string, EasingFn> = {
    easeOutQuint,
    easeOutCubic,
    easeInOutCubic,
    linear,
}

/** Lerp rotation from zero toward target (degrees) by factor */
function lerpRotation(factor: number, target: PointXYZ): PointXYZ {
    return {
        x: target.x * factor,
        y: target.y * factor,
        z: target.z * factor,
    }
}

function groupProducts(rawProducts: Record<string, unknown>[]): ProductFamily[] {
    const map = new Map<string, ProductFamily>()
    const order: string[] = []
    rawProducts.forEach((product) => {
        const name = product.name as string
        if (!map.has(name)) {
            map.set(name, { name, variants: [] })
            order.push(name)
        }
        const desc = (product.description as string) || (product.typeName as string) || ''
        const afterType = desc.replace(/^[^,]*,\s*/, '')
        const label = afterType || `Variant ${map.get(name)!.variants.length + 1}` // eslint-disable-line @typescript-eslint/no-non-null-assertion
        map.get(name)!.variants.push({ label, data: product as ProductData }) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })
    return order.map((n) => map.get(n)!) // eslint-disable-line @typescript-eslint/no-non-null-assertion
}

// Only use the first 3 product families (no variants)
const allFamilies = groupProducts(productsData as Record<string, unknown>[])
const TUNER_FAMILIES = allFamilies.slice(0, 3).map((f) => ({
    name: f.name,
    variants: [f.variants[0]],
}))
const FAMILY_COUNT = TUNER_FAMILIES.length

// ---------------------------------------------------------------------------
// Preset system
// ---------------------------------------------------------------------------

type TunerPreset = {
    name: string
    builtin?: boolean
    params: AnimParams
    easingName: string
    scale: number
    rotation: PointXYZ
    opacity: number
    exitY: number
    symmetricY: boolean
    swipeThreshold: number
    velocityThreshold: number
    anchorToRest: boolean
}

const BUILTIN_PRESETS: TunerPreset[] = [
    {
        name: 'Default',
        builtin: true,
        params: { ...DEFAULT_ANIM_PARAMS },
        easingName: 'easeOutQuint',
        scale: 0.1,
        rotation: { x: 0, y: 0, z: 0 },
        opacity: 0,
        exitY: 0,
        symmetricY: false,
        swipeThreshold: 0.2,
        velocityThreshold: 0.5,
        anchorToRest: true,
    },
]

const STORAGE_KEY = 'animationTuner_presets'

function loadCustomPresets(): TunerPreset[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as TunerPreset[]
    } catch {
        return []
    }
}

function saveCustomPresets(presets: TunerPreset[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
    } catch {
        /* quota exceeded — ignore */
    }
}

// ---------------------------------------------------------------------------
// ParameterSheet
// ---------------------------------------------------------------------------

type ParameterSheetProps = {
    params: AnimParams
    onParamsChange: (p: AnimParams) => void
    easingName: string
    onEasingChange: (name: string) => void
    scale: number
    onScaleChange: (s: number) => void
    rotation: PointXYZ
    onRotationChange: (r: PointXYZ) => void
    opacity: number
    onOpacityChange: (v: number) => void
    exitY: number
    onExitYChange: (v: number) => void
    symmetricY: boolean
    onSymmetricYChange: (v: boolean) => void
    swipeThreshold: number
    onSwipeThresholdChange: (v: number) => void
    velocityThreshold: number
    onVelocityThresholdChange: (v: number) => void
    anchorToRest: boolean
    onAnchorToRestChange: (v: boolean) => void
    allPresets: TunerPreset[]
    onLoadPreset: (preset: TunerPreset) => void
    onSavePreset: (name: string) => void
    onDeletePreset: (idx: number) => void
    onClose: () => void
}

const SliderRow = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
}: {
    label: string
    value: number
    min: number
    max: number
    step: number
    onChange: (v: number) => void
}) => (
    <div className="AnimationTuner__sheet-row">
        <span className="AnimationTuner__sheet-label">{label}</span>
        <input
            className="AnimationTuner__sheet-slider"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="AnimationTuner__sheet-value">
            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
        </span>
    </div>
)

const GroupHint = ({ children }: { children: React.ReactNode }) => (
    <div className="AnimationTuner__sheet-hint">{children}</div>
)

const ParameterSheet = ({
    params,
    onParamsChange,
    easingName,
    onEasingChange,
    scale,
    onScaleChange,
    rotation,
    onRotationChange,
    opacity,
    onOpacityChange,
    exitY,
    onExitYChange,
    symmetricY,
    onSymmetricYChange,
    swipeThreshold,
    onSwipeThresholdChange,
    velocityThreshold,
    onVelocityThresholdChange,
    anchorToRest,
    onAnchorToRestChange,
    allPresets,
    onLoadPreset,
    onSavePreset,
    onDeletePreset,
    onClose,
}: ParameterSheetProps) => {
    const [newPresetName, setNewPresetName] = useState('')
    const [clipboardStatus, setClipboardStatus] = useState('')

    const setParam = <K extends keyof AnimParams>(key: K, value: AnimParams[K]) => {
        onParamsChange({ ...params, [key]: value })
    }

    const handleSave = () => {
        const name = newPresetName.trim()
        if (!name) return
        onSavePreset(name)
        setNewPresetName('')
    }

    const handleCopy = () => {
        const preset: TunerPreset = {
            name: 'Copied Preset',
            params: { ...params },
            easingName,
            scale,
            rotation: { ...rotation },
            opacity,
            exitY,
            symmetricY,
            swipeThreshold,
            velocityThreshold,
            anchorToRest,
        }
        const text = JSON.stringify(preset, null, 2)
        // Use a temporary textarea for iOS Safari compatibility —
        // navigator.clipboard.writeText fails outside synchronous user gestures.
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try {
            document.execCommand('copy')
            setClipboardStatus('Copied!')
        } catch {
            setClipboardStatus('Copy failed')
        }
        document.body.removeChild(ta)
        setTimeout(() => setClipboardStatus(''), 1500)
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            const parsed = JSON.parse(text) as TunerPreset
            if (!parsed.params || typeof parsed.easingName !== 'string') {
                setClipboardStatus('Invalid preset')
                setTimeout(() => setClipboardStatus(''), 1500)
                return
            }
            onLoadPreset(parsed)
            setClipboardStatus('Pasted!')
        } catch {
            setClipboardStatus('Paste failed')
        }
        setTimeout(() => setClipboardStatus(''), 1500)
    }

    return (
        <div className="AnimationTuner__sheet">
            <button className="AnimationTuner__sheet-close" onClick={onClose}>
                Close
            </button>

            {/* Presets */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Presets</div>
                <GroupHint>Load a starting point, then tweak individual parameters below.</GroupHint>
                <div className="AnimationTuner__sheet-presets">
                    {allPresets.map((preset, i) => (
                        <span key={preset.name} className="AnimationTuner__sheet-preset-chip">
                            <button className="AnimationTuner__sheet-preset-btn" onClick={() => onLoadPreset(preset)}>
                                {preset.name}
                            </button>
                            {!preset.builtin && (
                                <button
                                    className="AnimationTuner__sheet-preset-delete"
                                    onClick={() => onDeletePreset(i - BUILTIN_PRESETS.length)}
                                    title="Delete preset"
                                >
                                    x
                                </button>
                            )}
                        </span>
                    ))}
                </div>
                <div className="AnimationTuner__sheet-save-row">
                    <input
                        className="AnimationTuner__sheet-save-input"
                        type="text"
                        placeholder="Preset name..."
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <button
                        className="AnimationTuner__sheet-preset-btn AnimationTuner__sheet-preset-btn--save"
                        onClick={handleSave}
                        disabled={!newPresetName.trim()}
                    >
                        Save Current
                    </button>
                </div>
                <div className="AnimationTuner__sheet-save-row">
                    <button className="AnimationTuner__sheet-preset-btn" onClick={handleCopy}>
                        Copy to Clipboard
                    </button>
                    <button className="AnimationTuner__sheet-preset-btn" onClick={handlePaste}>
                        Paste from Clipboard
                    </button>
                    {clipboardStatus && <span className="AnimationTuner__sheet-label">{clipboardStatus}</span>}
                </div>
            </div>

            {/* Easing */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Easing</div>
                <GroupHint>Animation curve for settle/snap-back after releasing a swipe.</GroupHint>
                <div className="AnimationTuner__sheet-row">
                    <span className="AnimationTuner__sheet-label">Curve</span>
                    <select
                        className="AnimationTuner__sheet-select"
                        value={easingName}
                        onChange={(e) => onEasingChange(e.target.value)}
                    >
                        {Object.keys(EASING_PRESETS).map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Anchor Mode */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Anchor Mode</div>
                <GroupHint>
                    When on, animations happen around the item&apos;s rest position instead of camera center.
                    viewY/viewZ become deltas from rest.
                </GroupHint>
                <div className="AnimationTuner__sheet-row">
                    <span className="AnimationTuner__sheet-label">Anchor to Rest</span>
                    <input
                        type="checkbox"
                        checked={anchorToRest}
                        onChange={(e) => onAnchorToRestChange(e.target.checked)}
                    />
                </div>
            </div>

            {/* Rest Position */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">
                    {anchorToRest ? 'Animation Offset' : 'Rest Position'}
                </div>
                <GroupHint>
                    {anchorToRest
                        ? "Vertical and depth offset from the item's placement position."
                        : 'Vertical and depth offset of the centered item in view-space.'}
                </GroupHint>
                <SliderRow
                    label="Vertical"
                    value={params.viewY}
                    min={-3}
                    max={3}
                    step={0.05}
                    onChange={(v) => setParam('viewY', v)}
                />
                <SliderRow
                    label="Depth"
                    value={params.viewZ}
                    min={-5}
                    max={5}
                    step={0.05}
                    onChange={(v) => setParam('viewZ', v)}
                />
            </div>

            {/* Slide Distance */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Slide Distance</div>
                <GroupHint>Horizontal spread between items during a swipe.</GroupHint>
                <SliderRow
                    label="Horizontal"
                    value={params.slideX}
                    min={-5}
                    max={5}
                    step={0.1}
                    onChange={(v) => setParam('slideX', v)}
                />
            </div>

            {/* Exit Vertical Offset */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Exit Vertical Offset</div>
                <GroupHint>
                    {symmetricY
                        ? 'Vertical arc based on displacement distance. Entry and exit mirror each other.'
                        : 'Vertical drift added to the swipe. 0 = purely horizontal.'}
                </GroupHint>
                <SliderRow label="Exit Y" value={exitY} min={-3} max={3} step={0.1} onChange={onExitYChange} />
                <div className="AnimationTuner__sheet-row">
                    <span className="AnimationTuner__sheet-label">Symmetric</span>
                    <input
                        type="checkbox"
                        checked={symmetricY}
                        onChange={(e) => onSymmetricYChange(e.target.checked)}
                    />
                </div>
            </div>

            {/* Scale */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Scale</div>
                <GroupHint>Target scale at full displacement. 1.0 = no change.</GroupHint>
                <SliderRow label="Displaced" value={scale} min={0.1} max={3} step={0.05} onChange={onScaleChange} />
            </div>

            {/* Opacity */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Opacity</div>
                <GroupHint>Dithered opacity at full displacement. 0 = invisible, 1 = opaque.</GroupHint>
                <SliderRow label="Displaced" value={opacity} min={0} max={1} step={0.05} onChange={onOpacityChange} />
            </div>

            {/* Rotation */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Rotation</div>
                <GroupHint>Target rotation (degrees) at full displacement.</GroupHint>
                <SliderRow
                    label="X (tilt)"
                    value={rotation.x}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(v) => onRotationChange({ ...rotation, x: v })}
                />
                <SliderRow
                    label="Y (turn)"
                    value={rotation.y}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(v) => onRotationChange({ ...rotation, y: v })}
                />
                <SliderRow
                    label="Z (spin)"
                    value={rotation.z}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(v) => onRotationChange({ ...rotation, z: v })}
                />
            </div>

            {/* Timing */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Timing</div>
                <GroupHint>Duration = settle time (ms). Blend speed = how fast the override kicks in.</GroupHint>
                <SliderRow
                    label="Duration (ms)"
                    value={params.animDuration}
                    min={100}
                    max={2000}
                    step={50}
                    onChange={(v) => setParam('animDuration', v)}
                />
                <SliderRow
                    label="Blend speed"
                    value={params.snapThresh}
                    min={0.1}
                    max={0.8}
                    step={0.05}
                    onChange={(v) => setParam('snapThresh', v)}
                />
            </div>

            {/* Swipe */}
            <div className="AnimationTuner__sheet-group">
                <div className="AnimationTuner__sheet-group-title">Swipe Sensitivity</div>
                <GroupHint>Drag distance and flick speed needed to commit a swipe. Lower = easier.</GroupHint>
                <SliderRow
                    label="Distance"
                    value={swipeThreshold}
                    min={0.1}
                    max={0.8}
                    step={0.05}
                    onChange={onSwipeThresholdChange}
                />
                <SliderRow
                    label="Velocity"
                    value={velocityThreshold}
                    min={0.1}
                    max={2}
                    step={0.05}
                    onChange={onVelocityThresholdChange}
                />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// AnimationTunerContent
// ---------------------------------------------------------------------------

const AnimationTunerContent = ({
    settingsRef,
    debugSettings,
}: {
    settingsRef: React.MutableRefObject<TunerSettings>
    debugSettings: DebugSettings
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const { canvasDimensions, viewerApi } = useViewerContext()
    const drawing = useDrawingMode(containerRef, canvasDimensions.width)
    const manager = useMemo(() => new SceneItemManager(TUNER_FAMILIES), [])

    // Tunable parameter state — initialized from settingsRef to survive scene changes.
    const s = settingsRef.current
    const [params, setParams] = useState<AnimParams>(() => ({ ...s.params }))
    const [easingName, setEasingName] = useState(() => s.easingName)
    const [scale, setScale] = useState(() => s.scale)
    const [rotation, setRotation] = useState<PointXYZ>(() => ({ ...s.rotation }))
    const [opacity, setOpacity] = useState(() => s.opacity)
    const [exitY, setExitY] = useState(() => s.exitY)
    const [symmetricY, setSymmetricY] = useState(() => s.symmetricY)
    const [swipeThreshold, setSwipeThreshold] = useState(() => s.swipeThreshold)
    const [velocityThreshold, setVelocityThreshold] = useState(() => s.velocityThreshold)
    const [anchorToRest, setAnchorToRest] = useState(() => s.anchorToRest)
    const [isViewing, setIsViewing] = useState(false)
    const [sheetOpen, setSheetOpen] = useState(false)

    // Sync settings back to the ref so the outer shell preserves them.
    useEffect(() => {
        // eslint-disable-next-line no-param-reassign
        settingsRef.current = {
            params,
            easingName,
            scale,
            rotation,
            opacity,
            exitY,
            symmetricY,
            swipeThreshold,
            velocityThreshold,
            anchorToRest,
        }
    }, [
        settingsRef,
        params,
        easingName,
        scale,
        rotation,
        opacity,
        exitY,
        symmetricY,
        swipeThreshold,
        velocityThreshold,
        anchorToRest,
    ])

    // Custom presets (localStorage)
    const [customPresets, setCustomPresets] = useState<TunerPreset[]>(() => loadCustomPresets())
    const allPresets = useMemo(() => [...BUILTIN_PRESETS, ...customPresets], [customPresets])

    // Refs synced from state for use in animation closures
    const paramsRef = useRef(params)
    const scaleRef = useRef<PointXYZ>({ x: scale, y: scale, z: scale })
    const rotationRef = useRef<PointXYZ>(rotation)
    const opacityRef = useRef(opacity)
    const exitYRef = useRef(exitY)
    const symmetricYRef = useRef(symmetricY)
    const anchorToRestRef = useRef(anchorToRest)
    const debugSettingsRef = useRef(debugSettings)
    paramsRef.current = params
    scaleRef.current = { x: scale, y: scale, z: scale }
    rotationRef.current = rotation
    opacityRef.current = opacity
    exitYRef.current = exitY
    symmetricYRef.current = symmetricY
    anchorToRestRef.current = anchorToRest
    debugSettingsRef.current = debugSettings

    // Build updateItems using refs for live tuning
    const updateItemsCallback = useCallback((state: CarouselState, mgr: SceneItemManager) => {
        const hT = state.swipeValue
        const absT = Math.abs(hT)
        const cur = state.curItemIndex
        const p = paramsRef.current
        const ey = exitYRef.current
        const sym = symmetricYRef.current
        const anchor = anchorToRestRef.current

        changeDebugSettings({
            ...debugSettingsRef.current,
            disableSceneOcclusion: absT > p.eps && absT < 1.0 - p.eps,
        })

        const sidePush = (dist: number) => smootherstep(dist, 1.0 - p.snapThresh, 1.0) * 50
        // Fade to 0 over the same range as sidePush so the push is invisible
        const sideFade = (dist: number) => 1.0 - smootherstep(dist, 1.0 - p.snapThresh, 1.0)

        // Current item
        const curScale = lerpScale(absT, scaleRef.current)
        const curRot = degreesToQuat(lerpRotation(absT, rotationRef.current))

        modifyItem(state.curSceneId, {
            position: {
                x: hT * -p.slideX + (hT >= 0 ? -1 : 1) * sidePush(absT),
                y: p.viewY + (sym ? absT : hT) * ey,
                z: p.viewZ,
            },
            rotation: curRot,
            scale: curScale,
            opacity: lerpOpacity(absT, opacityRef.current) * sideFade(absT),
            blendFactor: smootherstep(absT, 0, p.snapThresh),
            space: 'view',
            anchorToRest: anchor,
        })

        // Next item (cur+1)
        const nextDist = 1.0 - clamp(hT, 0, 1)
        const nextScale = lerpScale(nextDist, scaleRef.current)
        const nextRot = degreesToQuat(lerpRotation(nextDist, rotationRef.current))

        modifyItem(mgr.itemIdFor(cur + 1), {
            position: {
                x: (1.0 - hT) * p.slideX + sidePush(nextDist),
                y: p.viewY + (sym ? nextDist : (1.0 - hT) * -1) * ey,
                z: p.viewZ,
            },
            rotation: nextRot,
            scale: nextScale,
            opacity: lerpOpacity(nextDist, opacityRef.current) * sideFade(nextDist),
            blendFactor: smootherstep(nextDist, 0, p.snapThresh),
            space: 'view',
            anchorToRest: anchor,
        })

        // Prev item (cur-1)
        const prevDist = 1.0 + clamp(hT, -1, 0)
        const prevScale = lerpScale(prevDist, scaleRef.current)
        const prevRot = degreesToQuat(lerpRotation(prevDist, rotationRef.current))

        modifyItem(mgr.itemIdFor(cur - 1), {
            position: {
                x: (1.0 + hT) * -p.slideX - sidePush(prevDist),
                y: p.viewY + (sym ? prevDist : 1.0 + hT) * ey,
                z: p.viewZ,
            },
            rotation: prevRot,
            scale: prevScale,
            opacity: lerpOpacity(prevDist, opacityRef.current) * sideFade(prevDist),
            blendFactor: smootherstep(prevDist, 0, p.snapThresh),
            space: 'view',
            anchorToRest: anchor,
        })
    }, [])

    const easingFn = useMemo<EasingFn>(() => EASING_PRESETS[easingName] ?? EASING_PRESETS.easeOutQuint, [easingName])

    const swipeConfig = useMemo(
        () => ({ threshold: swipeThreshold, velocityThreshold }),
        [swipeThreshold, velocityThreshold],
    )

    const carousel = useCarousel({
        manager,
        families: TUNER_FAMILIES,
        isViewing,
        placement: drawing.placement,
        enableVariantSwipe: false,
        animParams: params,
        easingFn,
        swipeConfig,
        updateItems: updateItemsCallback,
        debugSettings,
    })

    // Preset handlers
    const handleLoadPreset = useCallback((preset: TunerPreset) => {
        setParams({ ...preset.params })
        setEasingName(preset.easingName)
        setScale(preset.scale)
        setRotation({ ...preset.rotation })
        setOpacity(preset.opacity ?? 1.0)
        setExitY(preset.exitY)
        setSymmetricY(preset.symmetricY ?? false)
        setSwipeThreshold(preset.swipeThreshold)
        setVelocityThreshold(preset.velocityThreshold)
        setAnchorToRest(preset.anchorToRest ?? false)
    }, [])

    const handleSavePreset = useCallback(
        (name: string) => {
            const preset: TunerPreset = {
                name,
                params: { ...params },
                easingName,
                scale,
                rotation: { ...rotation },
                opacity,
                exitY,
                symmetricY,
                swipeThreshold,
                velocityThreshold,
                anchorToRest,
            }
            const updated = [...customPresets, preset]
            setCustomPresets(updated)
            saveCustomPresets(updated)
        },
        [
            params,
            easingName,
            scale,
            rotation,
            opacity,
            exitY,
            symmetricY,
            swipeThreshold,
            velocityThreshold,
            anchorToRest,
            customPresets,
        ],
    )

    const handleDeletePreset = useCallback(
        (customIdx: number) => {
            const updated = customPresets.filter((_, i) => i !== customIdx)
            setCustomPresets(updated)
            saveCustomPresets(updated)
        },
        [customPresets],
    )

    // When tunable params change in viewing mode, re-apply to current items
    useEffect(() => {
        if (!isViewing) return
        // Trigger an updateItems by calling it directly with current state
        updateItemsCallback(
            {
                swipeValue: 0,
                variantSwapValue: 0,
                variantSwapDirection: 0,
                curItemIndex: 0,
                curSceneId: '',
                activeSwapSceneId: null,
                slidingAwayOverride: null,
            },
            manager,
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isViewing, params, scale, rotation, opacity, exitY, symmetricY, easingName, anchorToRest])

    const isDrawing = !isViewing
    const hasContent = drawing.strokes.length > 0 || drawing.polygon !== null
    const currentFamily = TUNER_FAMILIES[manager.wrapIdx(carousel.familyIndex)]

    const handleConfirm = () => {
        if (!drawing.placement) return
        setIsViewing(true)
    }

    const handleReset = () => {
        setIsViewing(false)
        carousel.reset(() => drawing.handleClear())
    }

    return (
        <div ref={containerRef} className="FmfCarousel__viewer">
            <Viewport view="mainView" cameraMode="default" cameraFocus={undefined} />

            {/* DrawingOverlay rendered outside Viewport so it is NOT inside the
                ViewportOverlay div (which has pointer-events: none). iOS Safari's
                touch hit-testing can skip the entire subtree of a pointer-events:none
                element, causing touches to fall through to the 3D canvas instead. */}
            {isDrawing && (
                <DrawingOverlay
                    strokes={drawing.strokes}
                    onStrokeAdded={drawing.handleStrokeAdded}
                    polygon={drawing.polygon}
                    extrusionPolygon={drawing.extrusionPolygon}
                    dimensionLabels={drawing.dimensionLabels}
                    onBboxPosition={drawing.setBboxPos}
                />
            )}

            {/* Swipe capture area */}
            {!isDrawing && (
                <div ref={carousel.swipeAreaRef} className="FmfCarousel__swipe-area" style={{ touchAction: 'none' }} />
            )}

            {/* Floating toolbar positioned above the bbox (drawing mode) */}
            {isDrawing && hasContent && drawing.bboxPos && (
                <div
                    className="FmfCarousel__toolbar"
                    style={{
                        left: `${drawing.bboxPos.centerX * 100}%`,
                        top: `calc(${drawing.bboxPos.topY * 100}% - 36px)`,
                    }}
                >
                    <button className="FmfCarousel__toolbar-btn" onClick={drawing.handleClear}>
                        Clear
                    </button>
                    <button
                        className="FmfCarousel__toolbar-btn FmfCarousel__toolbar-btn--confirm"
                        onClick={handleConfirm}
                        disabled={!drawing.placement}
                    >
                        Confirm
                    </button>
                    <label htmlFor="at-floor" className="FmfCarousel__toolbar-label">
                        <input
                            id="at-floor"
                            type="checkbox"
                            checked={drawing.forceFloorPlacement}
                            onChange={(e) => drawing.setForceFloorPlacement(e.target.checked)}
                        />{' '}
                        Floor
                    </label>
                </div>
            )}

            {/* Navigation toolbar (viewing mode) */}
            {!isDrawing && (
                <>
                    <div className="FmfCarousel__toolbar FmfCarousel__toolbar--viewing">
                        <button className="FmfCarousel__toolbar-btn" onClick={carousel.goPrev}>
                            Prev
                        </button>
                        <span className="FmfCarousel__toolbar-family">
                            {currentFamily.name}
                            {` (${manager.wrapIdx(carousel.familyIndex) + 1}/${FAMILY_COUNT})`}
                        </span>
                        <button className="FmfCarousel__toolbar-btn" onClick={carousel.goNext}>
                            Next
                        </button>
                        <button className="FmfCarousel__toolbar-btn" onClick={handleReset}>
                            Reset
                        </button>
                    </div>

                    {/* Tune button */}
                    <button className="AnimationTuner__tune-btn" onClick={() => setSheetOpen((o) => !o)}>
                        {sheetOpen ? 'Close Tuner' : 'Tune'}
                    </button>

                    {/* Parameter sheet overlay */}
                    {sheetOpen && (
                        <ParameterSheet
                            params={params}
                            onParamsChange={setParams}
                            easingName={easingName}
                            onEasingChange={setEasingName}
                            scale={scale}
                            onScaleChange={setScale}
                            rotation={rotation}
                            onRotationChange={setRotation}
                            opacity={opacity}
                            onOpacityChange={setOpacity}
                            exitY={exitY}
                            onExitYChange={setExitY}
                            symmetricY={symmetricY}
                            onSymmetricYChange={setSymmetricY}
                            swipeThreshold={swipeThreshold}
                            onSwipeThresholdChange={setSwipeThreshold}
                            velocityThreshold={velocityThreshold}
                            onVelocityThresholdChange={setVelocityThreshold}
                            anchorToRest={anchorToRest}
                            onAnchorToRestChange={setAnchorToRest}
                            allPresets={allPresets}
                            onLoadPreset={handleLoadPreset}
                            onSavePreset={handleSavePreset}
                            onDeletePreset={handleDeletePreset}
                            onClose={() => setSheetOpen(false)}
                        />
                    )}
                </>
            )}

            <div className="FmfCarousel__debug-overlay">
                <div>{`Canvas: ${canvasDimensions.width}x${canvasDimensions.height}`}</div>
                <div>Viewer API: {viewerApi ? 'Loaded' : 'Not loaded'}</div>
                <div>GeomViewer: {GeomViewer?.bindings ? 'Initialized' : 'Not initialized'}</div>
                <div>
                    Mode: {isViewing ? 'viewing' : 'drawing'}
                    {drawing.placement ? ' (placement ready)' : ''}
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// AnimationTuner — outer shell
// ---------------------------------------------------------------------------

type TunerSettings = Omit<TunerPreset, 'name' | 'builtin'>

const DEFAULT_TUNER_SETTINGS: TunerSettings = BUILTIN_PRESETS[0]

export const AnimationTuner = ({ sceneId }: DemoProps) => {
    const { scene, viewerSettings, debugSettings, loading, error } = useSceneSetup(sceneId)
    // Persists tuner settings across scene changes (ViewerContext remounts via key={sceneId}).
    const settingsRef = useRef<TunerSettings>({ ...DEFAULT_TUNER_SETTINGS })

    if (loading) {
        return (
            <div className="FmfCarousel__status-screen">
                <div>Loading scene...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="FmfCarousel__error-screen">
                <div>Error loading scene:</div>
                <div className="FmfCarousel__error-message">{error}</div>
                <div className="FmfCarousel__error-hint">Check the browser console for more details</div>
            </div>
        )
    }

    if (!scene) {
        return <div>No scene data</div>
    }

    return (
        <ViewerContext key={sceneId} scene={scene} viewerSettings={viewerSettings} debugSettings={debugSettings}>
            <AnimationTunerContent settingsRef={settingsRef} debugSettings={debugSettings} />
        </ViewerContext>
    )
}

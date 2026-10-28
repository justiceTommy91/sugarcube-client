import React, { useState } from 'react'
import classNames from 'classnames'
import { func, string, arrayOf, number } from 'prop-types'
import { isURL } from 'validator'
import { debugSettingsType, compositionType, filterType, previewSettingsType } from 'models/propTypes'
import { SOURCETYPE_ROOMBUILDER } from 'models/scenes/constants'

import { useAppDispatch, useAppSelector } from 'hooks'
import { createThumbnail } from 'models/compositions/utils'

import Dropdown from 'components/formElements/Dropdown'
import Range from 'components/formElements/Range'

import SSRIcon from '@ingka/ssr-icon'
import link from '@ingka/ssr-icon/paths/link'
import document from '@ingka/ssr-icon/paths/document'
import image from '@ingka/ssr-icon/paths/image'
import crossCircle from '@ingka/ssr-icon/paths/cross-circle'
import camera from '@ingka/ssr-icon/paths/camera'
import arrowLeftArrowRight from '@ingka/ssr-icon/paths/arrow-left-arrow-right'
import arrowClockwise from '@ingka/ssr-icon/paths/arrow-clockwise'
import chevronRight from '@ingka/ssr-icon/paths/chevron-right'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down-to-base'

import * as THREE from 'three'
import { GeomViewer, ToneMapType, AutoExposureMeasurementMethod } from 'Renderer/geomviewer'
import { getSmartaTimeout, getForceSmartaOff, getSmartaURL, getSmartaRuleset } from 'models/compositions/selectors'
import { setSmartaTimeout, setSmartaURL, setForceSmartaOff, setSmartaRuleset } from 'models/compositions/actions'
import { saveSelectedCompositionToLocalStorage } from 'models/localStorage/actions'
import { allScenesAreStandard3D } from 'models/scenes/utils'

import ObjectInspector from './ObjectInspector'

require('./Debug.scss')

const toneMapOptions = Object.values(ToneMapType)
const autoExposureMeasurementMethods = Object.values(AutoExposureMeasurementMethod)

const Debug = ({
    debugSettings,
    previewSettings,
    updateDebugSettings,
    composition,
    takeScreenshot,
    loseWebglContext,
    toggleDebugFeatures,
    updateManifest,
    subCatalogs,
    furnitureFilter,
    updateFurnitureFilter,
    startSwapTest,
    startLoadTest,
    isNewComposition,
}) => {
    const smartaTimeout = useAppSelector(getSmartaTimeout)
    const dispatch = useAppDispatch()
    const forceSmartaOff = useAppSelector(getForceSmartaOff)
    const [url, setUrl] = useState(null)
    const smartaURL = useAppSelector(getSmartaURL)
    const smartaRuleset = useAppSelector(getSmartaRuleset)
    const [, setIsRoomDimensionsEnabled] = useState(false)
    const [, setIsDynamicMeasurementsEnabled] = useState(false)

    const downloadBeautifierCaptureImage = async () => {
        try {
            const { thumbDataUrl } = await createThumbnail('beautify')
            const downloadLink = window.document.createElement('a')
            downloadLink.href = thumbDataUrl
            downloadLink.download = `beautify-capture-${Date.now()}.jpg`
            downloadLink.click()
        } catch {
            // eslint-disable-next-line no-console
            console.error('Failed to capture beautifier image')
        }
    }

    const onInputChange = (key, e, isData) => {
        let { value } = e.target
        if (isData) {
            value = JSON.parse(e.target.value)
        }
        updateManifest(composition.sceneId, key, value)
    }
    const currentToneMapIndex = toneMapOptions.indexOf(debugSettings.toneMapCurve)

    const onSmartaURLChange = (e) => {
        const { value } = e.target
        setUrl(value || null)
        dispatch(setSmartaURL(value || null))
    }

    const toggleSmarta = () => {
        dispatch(setForceSmartaOff(!forceSmartaOff))
    }

    const subCatalogOptions = [{ key: '*', label: 'All' }]
    if (subCatalogs && subCatalogs.length) {
        subCatalogs.reduce((acc, val) => {
            acc.push({ key: val, label: val })
            return acc
        }, subCatalogOptions)
    }

    const toneMappingOptions = [
        { key: THREE.NoToneMapping, label: 'None' },
        { key: THREE.LinearToneMapping, label: 'Linear' },
        { key: THREE.ReinhardToneMapping, label: 'Reinhard' },
        { key: THREE.CineonToneMapping, label: 'Cineon' },
        { key: THREE.ACESFilmicToneMapping, label: 'ACES Filmic' },
    ]

    const autoExposureMeasurementOptions = []
    autoExposureMeasurementMethods.forEach((m) => autoExposureMeasurementOptions.push({ key: m, label: m }))

    const swapFiftyItems = () => {
        startSwapTest()
    }

    const trackedMemoryOptions = [
        { key: 0, label: 'JS heap' },
        { key: 1, label: 'WebGLTextures' },
        { key: 2, label: 'WebGLBuffers' },
    ]

    const viewerInfo = GeomViewer.bindings?.queryViewerInfo()
    const viewsOptions = (viewerInfo.views || []).map((viewName) => ({
        key: viewName,
        label: viewName,
    }))

    const viewerUsesGltf = !!composition.scene.gltfManifest
    const manifestProperties = Object.keys(composition.scene.manifest ?? {}).map((key) => ({
        key,
        value: composition.scene.manifest[key],
    }))
    if (viewerUsesGltf) {
        manifestProperties.push({
            key: `gltfManifest`,
            value: composition.scene.gltfManifest,
        })
    }

    const isCameraInFreeMode = viewerInfo?.cameraState?.mode === 'free'
    const isCameraInOrbitMode = viewerInfo?.cameraState?.mode === 'orbit'
    const isViewerRoomDimensionsEnabled = !!viewerInfo?.roomDimensionsEnabled
    const isProductDimensionsEnabled = !!viewerInfo?.productDimensionsEnabled
    const isDynamicMeasurementsEnabled = !!viewerInfo?.dynamicMeasurementsEnabled

    // Top view is currently being determined through the view label.
    const isCameraInTopView = viewerInfo?.currentView?.includes('4')

    const is3DScene = allScenesAreStandard3D(composition.scene)
    const isRoomBuilderScene = composition.scene.sourceType === SOURCETYPE_ROOMBUILDER

    return (
        <div className="Debug">
            <section>
                {composition ? (
                    <div>
                        <h2>Info</h2>
                        <div className="infoRow uuid">
                            <div className="rowTitle">Build hash</div>
                            <div className="rowContent">{process.env.GATSBY_BUILD_TAG}</div>
                        </div>
                        <div className="infoRow uuid">
                            <div className="rowTitle">Composition id</div>
                            <div className="rowContent">
                                <a href={composition.adminUrl} target="_blank" rel="noopener noreferrer">
                                    {composition.id}
                                </a>
                            </div>
                        </div>
                        <div className="infoRow uuid">
                            <div className="rowTitle">Scene id</div>
                            <div className="rowContent">
                                <a href={composition.scene?.adminUrl} target="_blank" rel="noopener noreferrer">
                                    {composition.sceneId}
                                </a>
                            </div>
                        </div>
                        {composition.scene && (
                            <>
                                <div className="infoRow uuid">
                                    <div className="rowTitle">Job id</div>
                                    <div className="rowContent">{composition.scene.jobId}</div>
                                </div>
                                <div className="infoRow url">
                                    <div className="rowTitle">Capture video</div>
                                    <div className="rowContent">
                                        <a
                                            href={composition.scene.adminCaptureVideoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {composition.scene.adminCaptureVideoUrl}
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}
                        {composition.scene && composition.scene.metaData ? (
                            <div className="infoRow">
                                <div className="rowTitle">MetaData</div>
                                <div className="rowContent">
                                    <a
                                        href={composition.scene.metaUrl}
                                        title={composition.scene.metaUrl}
                                        target="_BLANK"
                                        rel="noopener noreferrer"
                                        key="link"
                                    >
                                        <SSRIcon paths={link} />
                                    </a>
                                    <div
                                        title={JSON.stringify(composition.scene.metaData)}
                                        key="info"
                                        className="dataPreview"
                                    >
                                        <SSRIcon paths={document} />
                                    </div>
                                    <input
                                        type="text"
                                        value={JSON.stringify(composition.scene.metaData)}
                                        key="toCopy"
                                        readOnly
                                    />
                                </div>
                            </div>
                        ) : null}
                        {composition.scene
                            ? [
                                  <h2 key="manifest">Manifest</h2>,
                                  <div className="infoRow">
                                      <div className="rowTitle">Scene Manifest Type</div>
                                      <div className="rowContent">{viewerUsesGltf ? 'GLTF' : 'Legacy'}</div>
                                  </div>,
                                  <div className="infoRow">
                                      <div className="rowTitle">Composition Type</div>
                                      <div className="rowContent">
                                          {
                                              // eslint-disable-next-line no-nested-ternary
                                              isNewComposition ? 'Empty' : composition.isGLTF ? 'GLTF' : 'Legacy2d'
                                          }
                                      </div>
                                  </div>,
                                  <div key="manifestItems">
                                      {manifestProperties.map(({ key, value }) => {
                                          const isData = typeof value !== 'string'
                                          const content = []

                                          if (!isData && isURL(value)) {
                                              // We have a url
                                              content.push(
                                                  <a
                                                      href={value}
                                                      title={value}
                                                      target="_BLANK"
                                                      rel="noopener noreferrer"
                                                      key="link"
                                                      className="featureLink"
                                                  >
                                                      <SSRIcon paths={link} />
                                                  </a>,
                                              )
                                          } else {
                                              // No url
                                              content.push(<SSRIcon paths={link} className="warn" key="noFeat" />)
                                          }
                                          if (value) {
                                              if (isData || !isURL(value)) {
                                                  content.push(
                                                      <div
                                                          title={isData ? JSON.stringify(value) : value}
                                                          key="info"
                                                          className="dataPreview"
                                                      >
                                                          <SSRIcon paths={document} />
                                                      </div>,
                                                  )
                                              } else {
                                                  // TODO: check for image url specifically
                                                  content.push(
                                                      <div key="image" className="imagePreview">
                                                          <SSRIcon paths={image} />
                                                          <div className="imagePreviewThumb">
                                                              <img src={value} alt="" />
                                                          </div>
                                                      </div>,
                                                  )
                                              }
                                              content.push(
                                                  <input
                                                      type="text"
                                                      value={isData ? JSON.stringify(value) : value}
                                                      key="toCopy"
                                                      onChange={(e) => onInputChange(key, e, isData)}
                                                      onKeyDown={(e) => e.stopPropagation()}
                                                  />,
                                              )
                                          }
                                          return (
                                              <div className="infoRow" key={key}>
                                                  <div className="rowTitle">{key}</div>
                                                  <div className="rowContent">{content}</div>
                                              </div>
                                          )
                                      })}
                                  </div>,
                              ]
                            : null}
                    </div>
                ) : null}
                <h2>Catalog</h2>
                <div className="dropRow">
                    <p>
                        Sub-catalog<span>ctrl + 0, 1-5</span>
                    </p>
                    <Dropdown
                        name="subCatalog"
                        onChange={(e) => updateFurnitureFilter({ subCatalog: e.target.value })}
                        value={furnitureFilter.subCatalog}
                        options={subCatalogOptions}
                    />
                </div>
                <h2>Visualization</h2>
                <div className="switchRow">
                    <p>Selection outline thickness</p>
                    <Range
                        type="range"
                        min={1.0}
                        max={64.0}
                        step={0.01}
                        value={debugSettings.selectionOutlineThickness}
                        onChange={(value) => updateDebugSettings({ selectionOutlineThickness: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Vanishing lines</p>
                    <span
                        className={classNames('switch', { on: debugSettings.linesViz })}
                        onClick={() => updateDebugSettings({ linesViz: !debugSettings.linesViz })}
                    />
                </div>
                <div className="switchRow">
                    <p>Light helpers</p>
                    <span
                        className={classNames('switch', { on: debugSettings.lightsViz })}
                        onClick={() => updateDebugSettings({ lightsViz: !debugSettings.lightsViz })}
                    />
                </div>
                <div className="switchRow">
                    <p>Show depth</p>
                    <span
                        className={classNames('switch', { on: debugSettings.depthViz })}
                        onClick={() => updateDebugSettings({ depthViz: !debugSettings.depthViz })}
                    />
                </div>
                <div className="switchRow">
                    <p>Imitate low performance</p>
                    <span
                        className={classNames('switch', { on: debugSettings.imitateLowPerformance })}
                        onClick={() =>
                            updateDebugSettings({ imitateLowPerformance: !debugSettings.imitateLowPerformance })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>Show FPS counter</p>
                    <span
                        className={classNames('switch', { on: debugSettings.showFPSCounter })}
                        onClick={() => updateDebugSettings({ showFPSCounter: !debugSettings.showFPSCounter })}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Highlight dropzone on drag<span>h</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.highlightPlanes })}
                        onClick={() => updateDebugSettings({ highlightPlanes: !debugSettings.highlightPlanes })}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Sematic Segmentation<span>z</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.ssViz })}
                        onClick={() => updateDebugSettings({ ssViz: !debugSettings.ssViz })}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Normals Segmentation<span>n</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.nsViz })}
                        onClick={() => updateDebugSettings({ nsViz: !debugSettings.nsViz })}
                    />
                </div>
                <div className="switchRow">
                    <p>Normals Visualization on Loaded Items</p>
                    <span
                        className={classNames('switch', { on: debugSettings.normalsViz })}
                        onClick={() => updateDebugSettings({ normalsViz: !debugSettings.normalsViz })}
                    />
                </div>
                {isRoomBuilderScene && (
                    <div className="switchRow">
                        <p>Use equirectangular format for envMap visualization</p>
                        <span
                            className={classNames('switch', { on: debugSettings.environmentVizEquirect })}
                            onClick={() =>
                                updateDebugSettings({
                                    environmentVizEquirect: !debugSettings.environmentVizEquirect,
                                })
                            }
                        />
                    </div>
                )}
                <div className="switchRow">
                    <p>Environment map visualization as cube map</p>
                    <span
                        className={classNames('switch', { on: debugSettings.environmentViz })}
                        onClick={() => updateDebugSettings({ environmentViz: !debugSettings.environmentViz })}
                    />
                </div>
                <div className="switchRow">
                    <p>Environment map visualization as scene background</p>
                    <span
                        className={classNames('switch', { on: debugSettings.environmentVizBackground })}
                        onClick={() =>
                            updateDebugSettings({ environmentVizBackground: !debugSettings.environmentVizBackground })
                        }
                    />
                </div>
                <h2>Light controls</h2>
                <div className="switchRow">
                    <p>Asset AO Map intensity multiplier</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={2.0}
                        step={0.01}
                        value={debugSettings.aoMapIntensity}
                        onChange={(value) => updateDebugSettings({ aoMapIntensity: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Enable GTAO</p>
                    <span
                        className={classNames('switch', { on: debugSettings.enableGTAO })}
                        onClick={() => {
                            const enableGTAO = !debugSettings.enableGTAO
                            updateDebugSettings({
                                enableGTAO,
                                // If we’re *enabling* GTAO, force these off; otherwise leave them as they were.
                                ...(enableGTAO
                                    ? {
                                          useFloorContactShadows: false,
                                      }
                                    : {}),
                            })
                        }}
                    />
                </div>
                <div className="switchRow">
                    <p>GTAO Intensity</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={2.0}
                        step={0.01}
                        value={debugSettings.gtaoIntensity}
                        onChange={(value) => updateDebugSettings({ gtaoIntensity: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>GTAO Radius</p>
                    <Range
                        type="range"
                        min={0.15}
                        max={2.0}
                        step={0.01}
                        value={debugSettings.gtaoRadius}
                        onChange={(value) => updateDebugSettings({ gtaoRadius: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Asset IBL exposure power degree 2<sup>x</sup>
                    </p>
                    <Range
                        type="range"
                        min={-6.0}
                        max={6.0}
                        step={0.01}
                        value={debugSettings.environmentIntensity}
                        onChange={(value) => updateDebugSettings({ environmentIntensity: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>IBL map rotation:</p>
                    <Range
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={debugSettings.environmentRotation}
                        onChange={(value) => updateDebugSettings({ environmentRotation: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>IBL distance/saturation damping:</p>
                    <Range
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={debugSettings.saturationDampIntensity}
                        onChange={(value) => updateDebugSettings({ saturationDampIntensity: value })}
                        sideLabel
                    />
                </div>
                <div key="directionalLightIntensities">
                    {composition?.scene?.manifest?.lighting?.lights?.directional.map((directional, index) => (
                        <div className="switchRow" key={`directionalLight${directional.id}`}>
                            <p>Directional light [{index}] intensity</p>
                            <Range
                                type="range"
                                min={0.0}
                                max={
                                    (previewSettings.onOffOptions.usePBR
                                        ? directional.pbr?.power || 0
                                        : directional.intensity) * 2.0
                                }
                                step={
                                    (previewSettings.onOffOptions.usePBR
                                        ? directional.pbr?.power || 0
                                        : directional.intensity) / 100
                                }
                                value={debugSettings.directionalLightIntensities[index]}
                                onChange={(value) =>
                                    updateDebugSettings({
                                        directionalLightIntensities: debugSettings.directionalLightIntensities.map(
                                            (v, i) => (index === i ? value : v),
                                        ),
                                    })
                                }
                                sideLabel
                            />
                        </div>
                    ))}
                </div>
                <div key="pointLightIntensities">
                    {!is3DScene
                        ? composition?.scene?.manifest?.lighting?.lights?.point.map((pointLight, index) => (
                              <div className="switchRow" key={`pointLight${pointLight.id}`}>
                                  <p>Point light [{index}] intensity</p>
                                  <Range
                                      type="range"
                                      min={0.0}
                                      max={
                                          (previewSettings.onOffOptions.usePBR
                                              ? pointLight.pbr?.power || 0
                                              : pointLight.intensity) * 2.0
                                      }
                                      step={
                                          (previewSettings.onOffOptions.usePBR
                                              ? pointLight.pbr?.power || 0
                                              : pointLight.intensity) / 100
                                      }
                                      value={debugSettings.pointLightIntensities[index]}
                                      onChange={(value) =>
                                          updateDebugSettings({
                                              pointLightIntensities: debugSettings.pointLightIntensities.map((v, i) =>
                                                  index === i ? value : v,
                                              ),
                                          })
                                      }
                                      sideLabel
                                  />
                              </div>
                          ))
                        : composition.scene.gltfManifest?.extensions?.KHR_lights_punctual?.lights?.map(
                              (pointLight, index) => (
                                  <div className="switchRow" key={`pointLight${pointLight.id || index}`}>
                                      <p>Point light [{index}] intensity</p>
                                      <Range
                                          type="range"
                                          min={0.0}
                                          max={pointLight.intensity * 4.0}
                                          step={0.01}
                                          value={(debugSettings.pointLightIntensities[index] || 0).toFixed(2)}
                                          onChange={(value) =>
                                              updateDebugSettings({
                                                  pointLightIntensities: debugSettings.pointLightIntensities.map(
                                                      (v, i) => (index === i ? value : v),
                                                  ),
                                              })
                                          }
                                          sideLabel
                                      />
                                  </div>
                              ),
                          )}
                </div>
                <div key="spotLightIntensities">
                    {composition?.scene?.manifest?.lighting?.lights?.spot?.map((spotLight, index) => (
                        <div className="switchRow" key={`spotLight${spotLight.id}`}>
                            <p>Spot light [{index}] intensity</p>
                            <Range
                                type="range"
                                min={0.0}
                                max={
                                    (previewSettings.onOffOptions.usePBR
                                        ? spotLight.pbr?.power || 0
                                        : spotLight.intensity) * 2.0
                                }
                                step={
                                    (previewSettings.onOffOptions.usePBR
                                        ? spotLight.pbr?.power || 0
                                        : spotLight.intensity) / 100
                                }
                                value={debugSettings.spotLightIntensities[index]}
                                onChange={(value) =>
                                    updateDebugSettings({
                                        spotLightIntensities: debugSettings.spotLightIntensities.map((v, i) =>
                                            index === i ? value : v,
                                        ),
                                    })
                                }
                                sideLabel
                            />
                        </div>
                    ))}
                </div>
                <div key="areaLightIntensities">
                    {composition?.scene?.manifest?.lighting?.lights?.area
                        ?.filter((a) => !a.portal)
                        .map((areaLight, index) => (
                            <div className="switchRow" key={`areaLight${areaLight.id}`}>
                                <p>Area light [{index}] intensity</p>
                                <Range
                                    type="range"
                                    min={0.0}
                                    max={
                                        (previewSettings.onOffOptions.usePBR
                                            ? areaLight.pbr?.power || 0
                                            : areaLight.intensity) * 2.0
                                    }
                                    step={
                                        (previewSettings.onOffOptions.usePBR
                                            ? areaLight.pbr?.power || 0
                                            : areaLight.intensity) / 100
                                    }
                                    value={debugSettings.areaLightIntensities[index]}
                                    onChange={(value) =>
                                        updateDebugSettings({
                                            areaLightIntensities: debugSettings.areaLightIntensities.map((v, i) =>
                                                index === i ? value : v,
                                            ),
                                        })
                                    }
                                    sideLabel
                                />
                            </div>
                        ))}
                </div>
                <div className="switchRow">
                    <p>Disable lighting effects</p>
                    <span
                        className={classNames('switch', { on: debugSettings.disableLightingEffects })}
                        onClick={() =>
                            updateDebugSettings({ disableLightingEffects: !debugSettings.disableLightingEffects })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Tone map curve <strong>{toneMapOptions[currentToneMapIndex]}</strong>
                    </p>
                    <Range
                        type="range"
                        min={0}
                        max={toneMapOptions.length - 1}
                        step={1}
                        value={toneMapOptions.indexOf(debugSettings.toneMapCurve)}
                        onChange={(value) => updateDebugSettings({ toneMapCurve: toneMapOptions[value] })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Exposure compensation (stops)</p>
                    <Range
                        type="range"
                        min={-2.0}
                        max={2.0}
                        step={0.05}
                        value={debugSettings.toneMappingExposureCompensation}
                        onChange={(value) => updateDebugSettings({ toneMappingExposureCompensation: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Auto exposure</p>
                    <span
                        className={classNames('switch', { on: debugSettings.autoExposure })}
                        onClick={() => updateDebugSettings({ autoExposure: !debugSettings.autoExposure })}
                    />
                </div>
                <div className="switchRow">
                    <p>Auto exposure target</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.02}
                        value={debugSettings.autoExposureTarget}
                        onChange={(value) => updateDebugSettings({ autoExposureTarget: value })}
                        sideLabel
                    />
                </div>
                <div className="dropRow">
                    <p>Measurement method</p>
                    <Dropdown
                        onChange={(e) =>
                            updateDebugSettings({
                                autoExposureMeasurementMethod: e.target.value,
                            })
                        }
                        value={debugSettings.autoExposureMeasurementMethod}
                        options={autoExposureMeasurementOptions}
                    />
                </div>
                <div className="switchRow">
                    <p>Log auto exposure canvas</p>
                    <span
                        className={classNames('switch', { on: debugSettings.autoExposureLogCanvas })}
                        onClick={() =>
                            updateDebugSettings({ autoExposureLogCanvas: !debugSettings.autoExposureLogCanvas })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>Use CustomStandardMaterial (filmic LUT, parallax mapping)</p>
                    <span
                        className={classNames('switch', { on: debugSettings.useFilmicLUT })}
                        onClick={() => updateDebugSettings({ useFilmicLUT: !debugSettings.useFilmicLUT })}
                    />
                </div>
                {debugSettings.useFilmicLUT ? (
                    <div className="switchRow">
                        <p>Disable custom material&apos;s parallax box mapping</p>
                        <span
                            className={classNames('switch', { on: debugSettings.disableParallaxMapping })}
                            onClick={() =>
                                updateDebugSettings({ disableParallaxMapping: !debugSettings.disableParallaxMapping })
                            }
                        />
                    </div>
                ) : null}
                {!debugSettings.useFilmicLUT ? (
                    <div className="dropRow">
                        <p>Tone mapping:</p>
                        <Dropdown
                            name="toneMapping"
                            onChange={(e) => updateDebugSettings({ toneMappingType: e.target.value })}
                            value={debugSettings.toneMappingType}
                            options={toneMappingOptions}
                        />
                    </div>
                ) : null}
                <div className="switchRow">
                    <p>Use Floor Contact Shadows</p>
                    <span
                        className={classNames('switch', { on: debugSettings.useFloorContactShadows })}
                        onClick={() =>
                            updateDebugSettings({ useFloorContactShadows: !debugSettings.useFloorContactShadows })
                        }
                    />
                </div>
                {!is3DScene ? (
                    <div className="switchRow">
                        <p>Disable analytical shadows for dollhouse views</p>
                        <span
                            className={classNames('switch', { on: debugSettings.disableDollhouseShadows })}
                            onClick={() =>
                                updateDebugSettings({ disableDollhouseShadows: !debugSettings.disableDollhouseShadows })
                            }
                        />
                    </div>
                ) : null}
                <div className="switchRow">
                    <p>Enable analytical lights contribution to lighting.</p>
                    <span
                        className={classNames('switch', { on: debugSettings.analyticLightsContribution })}
                        onClick={() => {
                            updateDebugSettings({
                                analyticLightsContribution: !debugSettings.analyticLightsContribution,
                            })
                        }}
                    />
                </div>
                <div className="switchRow">
                    <p>Enable inter-item analytical shadows.</p>
                    <span
                        className={classNames('switch', { on: debugSettings.interItemShadows })}
                        onClick={() => {
                            updateDebugSettings({ interItemShadows: !debugSettings.interItemShadows })
                        }}
                    />
                </div>
                {!composition.scene.manifest?.equirectangular && !is3DScene ? (
                    <div className="switchRow">
                        <p>Use alternate envMap instead of the clam shell.</p>
                        <span
                            className={classNames('switch', { on: debugSettings.useAlternateEnvMap })}
                            onClick={() => {
                                updateDebugSettings({ useAlternateEnvMap: !debugSettings.useAlternateEnvMap })
                            }}
                        />
                    </div>
                ) : null}
                {isRoomBuilderScene ? (
                    <div className="switchRow">
                        <p>Disable floor direct light specular.</p>
                        <span
                            className={classNames('switch', { on: debugSettings.disableFloorDirectSpecular })}
                            onClick={() => {
                                updateDebugSettings({
                                    disableFloorDirectSpecular: !debugSettings.disableFloorDirectSpecular,
                                })
                            }}
                        />
                    </div>
                ) : null}
                {isRoomBuilderScene && !composition.scene.manifest?.equirectangular ? (
                    <div className="switchRow">
                        <p>Use room builder generated envMap.</p>
                        <span
                            className={classNames('switch', { on: debugSettings.useRoomBuilderEnvMap })}
                            onClick={() => {
                                updateDebugSettings({
                                    useRoomBuilderEnvMap: !debugSettings.useRoomBuilderEnvMap,
                                })
                            }}
                        />
                    </div>
                ) : null}
                {is3DScene ? (
                    <div className="toolRow">
                        <p>Re-bake env map</p>
                        <button onClick={() => GeomViewer.bindings?.doAction('rebake-environment-map')}>
                            <SSRIcon paths={arrowClockwise} />
                        </button>
                    </div>
                ) : null}
                {isRoomBuilderScene
                    ? [
                          <h2>Sun light controls</h2>,
                          <div className="switchRow">
                              <p>Enable sun light through windows</p>
                              <span
                                  className={classNames('switch', { on: debugSettings.keepLocallyGeneratedLights })}
                                  onClick={() => {
                                      updateDebugSettings({
                                          keepLocallyGeneratedLights: !debugSettings.keepLocallyGeneratedLights,
                                      })
                                  }}
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Blocker search radius multiplier</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={50.0}
                                  step={0.01}
                                  value={debugSettings.blockerSearchRadiusMultiplier}
                                  onChange={(value) => updateDebugSettings({ blockerSearchRadiusMultiplier: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>PCF filter base radius multiplier</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={50.0}
                                  step={0.01}
                                  value={debugSettings.pcfFilterRadiusMultiplier}
                                  onChange={(value) => updateDebugSettings({ pcfFilterRadiusMultiplier: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Poisson sampling kernel size</p>
                              <Range
                                  type="range"
                                  min={1.0}
                                  max={24.0}
                                  step={1.0}
                                  value={debugSettings.poissonKernelSize}
                                  onChange={(value) => updateDebugSettings({ poissonKernelSize: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Sun light intensity</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={200.0}
                                  step={1.0}
                                  value={debugSettings.sunLightIntensity}
                                  onChange={(value) => updateDebugSettings({ sunLightIntensity: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>sky light intensity</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={10.0}
                                  step={0.05}
                                  value={debugSettings.skyLightIntensity}
                                  onChange={(value) => updateDebugSettings({ skyLightIntensity: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          debugSettings.areaLightIntensities
                              .filter((val) => val !== undefined)
                              .map((areaLightIntensity, index) => (
                                  <div className="switchRow">
                                      <p>Area light {index} intensity</p>
                                      <Range
                                          type="range"
                                          min={0.0}
                                          max={100.0}
                                          step={0.1}
                                          value={areaLightIntensity}
                                          onChange={(value) =>
                                              updateDebugSettings({
                                                  areaLightIntensities: debugSettings.areaLightIntensities.map((v, i) =>
                                                      index === i ? value : v,
                                                  ),
                                              })
                                          }
                                          disabled={!debugSettings.keepLocallyGeneratedLights}
                                          sideLabel
                                      />
                                  </div>
                              )),
                          <div className="switchRow">
                              <p>Translate sun on X-axis</p>
                              <Range
                                  type="range"
                                  min={-20.0}
                                  max={20.0}
                                  step={0.1}
                                  value={debugSettings.sunLightDeltaX}
                                  onChange={(value) => updateDebugSettings({ sunLightDeltaX: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Translate sun on Y-axis</p>
                              <Range
                                  type="range"
                                  min={-20.0}
                                  max={20.0}
                                  step={0.1}
                                  value={debugSettings.sunLightDeltaY}
                                  onChange={(value) => updateDebugSettings({ sunLightDeltaY: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Translate sun on Z-axis</p>
                              <Range
                                  type="range"
                                  min={-20.0}
                                  max={20.0}
                                  step={0.1}
                                  value={debugSettings.sunLightDeltaZ}
                                  onChange={(value) => updateDebugSettings({ sunLightDeltaZ: value })}
                                  disabled={!debugSettings.keepLocallyGeneratedLights}
                                  sideLabel
                              />
                          </div>,
                          <h2>Fake AO controls</h2>,
                          <div className="switchRow">
                              <p>Vignette AO light intesity</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={100.0}
                                  step={1.0}
                                  value={debugSettings.vAOlightIntensity}
                                  onChange={(value) => updateDebugSettings({ vAOlightIntensity: value })}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Vignette AO darkest intesity</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={1.0}
                                  step={0.005}
                                  value={debugSettings.vAOdarkIntesity}
                                  onChange={(value) => updateDebugSettings({ vAOdarkIntesity: value })}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Vignette AO contrast</p>
                              <Range
                                  type="range"
                                  min={0.0}
                                  max={1.0}
                                  step={0.01}
                                  value={debugSettings.vAOcontrast}
                                  onChange={(value) => updateDebugSettings({ vAOcontrast: value })}
                                  sideLabel
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Affect direct diffuse.</p>
                              <span
                                  className={classNames('switch', { on: debugSettings.vAOdirectDiffuse })}
                                  onClick={() => {
                                      updateDebugSettings({ vAOdirectDiffuse: !debugSettings.vAOdirectDiffuse })
                                  }}
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Affect indirect diffuse.</p>
                              <span
                                  className={classNames('switch', { on: debugSettings.vAOindirectDiffuse })}
                                  onClick={() => {
                                      updateDebugSettings({ vAOindirectDiffuse: !debugSettings.vAOindirectDiffuse })
                                  }}
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Affect direct specular.</p>
                              <span
                                  className={classNames('switch', { on: debugSettings.vAOdirectSpecular })}
                                  onClick={() => {
                                      updateDebugSettings({ vAOdirectSpecular: !debugSettings.vAOdirectSpecular })
                                  }}
                              />
                          </div>,
                          <div className="switchRow">
                              <p>Affect indirect specular.</p>
                              <span
                                  className={classNames('switch', { on: debugSettings.vAOindirectSpecular })}
                                  onClick={() => {
                                      updateDebugSettings({ vAOindirectSpecular: !debugSettings.vAOindirectSpecular })
                                  }}
                              />
                          </div>,
                      ]
                    : null}
                <h2>Improved shadowmap</h2>
                <div className="switchRow">
                    <p>
                        Shadow map<span>d</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.showShadowMap })}
                        onClick={() => updateDebugSettings({ showShadowMap: !debugSettings.showShadowMap })}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Room geometry<span>f</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.geometryViz })}
                        onClick={() => updateDebugSettings({ geometryViz: !debugSettings.geometryViz })}
                    />
                </div>
                <h2>Improved Pins</h2>
                <div className="switchRow">
                    <p>Show color id output</p>
                    <span
                        className={classNames('switch', { on: debugSettings.showColorIdOutput })}
                        onClick={() => updateDebugSettings({ showColorIdOutput: !debugSettings.showColorIdOutput })}
                    />
                </div>
                <div className="switchRow">
                    <p>Show pins candidate positions</p>
                    <span
                        className={classNames('switch', { on: debugSettings.showPinsManagerOutput })}
                        onClick={() =>
                            updateDebugSettings({ showPinsManagerOutput: !debugSettings.showPinsManagerOutput })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>Candidate point radius tolerance</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={5.0}
                        step={1.0}
                        value={debugSettings.pinsCandidateRadiusTolerance}
                        onChange={(value) => updateDebugSettings({ pinsCandidateRadiusTolerance: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Candidate point acceptable radius</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={5.0}
                        step={1.0}
                        value={debugSettings.pinsMinAcceptableRadius}
                        onChange={(value) => updateDebugSettings({ pinsMinAcceptableRadius: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Color id mesh inflation</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={0.1}
                        step={0.001}
                        value={debugSettings.pinsColorIdInflation}
                        onChange={(value) => updateDebugSettings({ pinsColorIdInflation: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Thin wall items inflation multiplier (available only in top view)</p>
                    <Range
                        type="range"
                        min={1.0}
                        max={15.0}
                        step={1.0}
                        value={debugSettings.pinsColorIdInflationMultiplier}
                        onChange={(value) => updateDebugSettings({ pinsColorIdInflationMultiplier: value })}
                        disabled={!isCameraInTopView}
                        sideLabel
                    />
                </div>
                <h2>Placeable Hint</h2>
                <div className="switchRow">
                    <p>Force Always Visible</p>
                    <span
                        className={classNames('switch', { on: debugSettings.placeableHintAlwaysVisible })}
                        onClick={() =>
                            updateDebugSettings({
                                placeableHintAlwaysVisible: !debugSettings.placeableHintAlwaysVisible,
                            })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>Arrow-plane gap</p>
                    <Range
                        type="range"
                        min={0.01}
                        max={0.25}
                        step={0.001}
                        value={debugSettings.placeableHintPlaneGap}
                        onChange={(value) => updateDebugSettings({ placeableHintPlaneGap: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Arrow-furniture gap</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={0.5}
                        step={0.01}
                        value={debugSettings.placeableHintFurnitureGap}
                        onChange={(value) => updateDebugSettings({ placeableHintFurnitureGap: value })}
                        sideLabel
                    />
                </div>
                <h2>3D positioning</h2>
                <div className="switchRow">
                    <p>Show positioning helper</p>
                    <span
                        className={classNames('switch', { on: debugSettings.enablePositioningHelper })}
                        onClick={() =>
                            updateDebugSettings({
                                enablePositioningHelper: !debugSettings.enablePositioningHelper,
                            })
                        }
                    />
                </div>
                {debugSettings.enablePositioningHelper && (
                    <>
                        <div className="switchRow">
                            <p>Allow helper on floor</p>
                            <span
                                className={classNames('switch', { on: debugSettings.posHelperOnFloor })}
                                onClick={() =>
                                    updateDebugSettings({
                                        posHelperOnFloor: !debugSettings.posHelperOnFloor,
                                    })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>Allow helper on walls</p>
                            <span
                                className={classNames('switch', { on: debugSettings.posHelperOnWall })}
                                onClick={() =>
                                    updateDebugSettings({
                                        posHelperOnWall: !debugSettings.posHelperOnWall,
                                    })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>Allow helper on floor-wall edge</p>
                            <span
                                className={classNames('switch', { on: debugSettings.posHelperOnWallFloorEdge })}
                                onClick={() =>
                                    updateDebugSettings({
                                        posHelperOnWallFloorEdge: !debugSettings.posHelperOnWallFloorEdge,
                                    })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>Helper size x</p>
                            <Range
                                type="range"
                                min={0.1}
                                max={2.0}
                                step={0.001}
                                value={debugSettings.posHelperSizeX}
                                onChange={(value) => updateDebugSettings({ posHelperSizeX: value })}
                                sideLabel
                            />
                        </div>
                        <div className="switchRow">
                            <p>Helper size y</p>
                            <Range
                                type="range"
                                min={0.1}
                                max={2.0}
                                step={0.001}
                                value={debugSettings.posHelperSizeY}
                                onChange={(value) => updateDebugSettings({ posHelperSizeY: value })}
                                sideLabel
                            />
                        </div>
                        <div className="switchRow">
                            <p>Helper size z</p>
                            <Range
                                type="range"
                                min={0.1}
                                max={2.0}
                                step={0.001}
                                value={debugSettings.posHelperSizeZ}
                                onChange={(value) => updateDebugSettings({ posHelperSizeZ: value })}
                                sideLabel
                            />
                        </div>
                    </>
                )}
                <div className="switchRow">
                    <p>Visualize scene sampling</p>
                    <span
                        className={classNames('switch', { on: debugSettings.enableSamplingVisualizer })}
                        onClick={() =>
                            updateDebugSettings({
                                enableSamplingVisualizer: !debugSettings.enableSamplingVisualizer,
                            })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>Enable inspector mode</p>
                    <span
                        className={classNames('switch', { on: debugSettings.enableObjectInspector })}
                        onClick={() =>
                            updateDebugSettings({
                                enableObjectInspector: !debugSettings.enableObjectInspector,
                            })
                        }
                    />
                </div>
                {debugSettings.enableObjectInspector && <ObjectInspector />}
                {viewsOptions.length > 1 && (
                    <>
                        <h2>Multiview</h2>
                        <div className="dropRow">
                            <p>Switch view:</p>
                            <Dropdown
                                name="switchView"
                                onChange={(e) => {
                                    GeomViewer.bindings?.setCurrentView(e.target.value)
                                    updateDebugSettings({})
                                }}
                                value={viewerInfo.currentView}
                                options={viewsOptions}
                            />
                        </div>
                        <div className="switchRow">
                            <p>Enable secondary views discarding</p>
                            <span
                                className={classNames('switch', { on: debugSettings.discardSecondaryViews })}
                                onClick={() =>
                                    updateDebugSettings({ discardSecondaryViews: !debugSettings.discardSecondaryViews })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>Animate camera when changing views</p>
                            <span
                                className={classNames('switch', { on: debugSettings.animateViewChange })}
                                onClick={() =>
                                    updateDebugSettings({ animateViewChange: !debugSettings.animateViewChange })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>View blocking check: ray casting</p>
                            <span
                                className={classNames('switch', { on: debugSettings.blockingItemsRaycastCheck })}
                                onClick={() =>
                                    updateDebugSettings({
                                        blockingItemsRaycastCheck: !debugSettings.blockingItemsRaycastCheck,
                                    })
                                }
                            />
                        </div>
                        {debugSettings.blockingItemsRaycastCheck && (
                            <div className="switchRow">
                                <p>Raycast check distance</p>
                                <Range
                                    type="range"
                                    min={0.0}
                                    max={2.0}
                                    step={0.001}
                                    value={debugSettings.blockingItemsRaycastDistance}
                                    onChange={(value) => updateDebugSettings({ blockingItemsRaycastDistance: value })}
                                    sideLabel
                                />
                            </div>
                        )}
                        <div className="switchRow">
                            <p>View blocking check: floor items next to a wall</p>
                            <span
                                className={classNames('switch', { on: debugSettings.blockingItemsWallFacingCheck })}
                                onClick={() =>
                                    updateDebugSettings({
                                        blockingItemsWallFacingCheck: !debugSettings.blockingItemsWallFacingCheck,
                                    })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>Enable floor items next to a wall check in dollhouse views</p>
                            <span
                                className={classNames('switch', {
                                    on: debugSettings.blockingItemsWallFacingCheckInDollhouse,
                                })}
                                onClick={() =>
                                    updateDebugSettings({
                                        blockingItemsWallFacingCheckInDollhouse:
                                            !debugSettings.blockingItemsWallFacingCheckInDollhouse,
                                    })
                                }
                            />
                        </div>
                        <div className="switchRow">
                            <p>Enable fading out items near camera</p>
                            <span
                                className={classNames('switch', { on: debugSettings.enableXRay })}
                                onClick={() => updateDebugSettings({ enableXRay: !debugSettings.enableXRay })}
                            />
                        </div>
                    </>
                )}
                <h2>Measurements</h2>
                <div className="switchRow">
                    <p>Enable room dimensions</p>
                    <span
                        className={classNames('switch', { on: isViewerRoomDimensionsEnabled })}
                        onClick={() => {
                            GeomViewer.bindings?.setRoomDimensionsEnabled(!isViewerRoomDimensionsEnabled)
                            setIsRoomDimensionsEnabled(!isViewerRoomDimensionsEnabled)
                        }}
                    />
                </div>
                <div className="switchRow">
                    <p>Enable product dimensions</p>
                    <span
                        className={classNames('switch', { on: isProductDimensionsEnabled })}
                        onClick={() => {
                            GeomViewer.bindings?.setProductDimensionsEnabled(!isProductDimensionsEnabled)
                            setIsRoomDimensionsEnabled(!isProductDimensionsEnabled)
                        }}
                    />
                </div>
                <div className="switchRow">
                    <p>Enable dynamic measurements</p>
                    <span
                        className={classNames('switch', { on: isDynamicMeasurementsEnabled })}
                        onClick={() => {
                            GeomViewer.bindings?.setDynamicMeasurementsEnabled(!isDynamicMeasurementsEnabled)
                            setIsDynamicMeasurementsEnabled(!isDynamicMeasurementsEnabled)
                        }}
                    />
                </div>
                <h2>Camera</h2>
                <div className="switchRow">
                    <p>Enable free view:</p>
                    <span
                        className={classNames('switch', { on: isCameraInFreeMode })}
                        onClick={() => {
                            GeomViewer.bindings?.setCameraMode({
                                mode: isCameraInFreeMode ? 'default' : 'free',
                            })
                            updateDebugSettings({})
                        }}
                    />
                </div>
                {!is3DScene && (
                    <div className="switchRow">
                        <p>Enable 3D camera controls:</p>
                        <span
                            className={classNames('switch', { on: isCameraInOrbitMode })}
                            onClick={() => {
                                GeomViewer.bindings?.forceOrbitModeAllowed(!isCameraInOrbitMode)
                                updateDebugSettings({})
                            }}
                        />
                    </div>
                )}
                <div className="switchRow">
                    <p>Enable selected item focus view on pressing c</p>
                    <span
                        className={classNames('switch', { on: debugSettings.enableFocus })}
                        onClick={() => updateDebugSettings({ enableFocus: !debugSettings.enableFocus })}
                    />
                </div>
                <div className="switchRow">
                    <p>Enable selected item focus view on pressing c</p>
                    <span
                        className={classNames('switch', { on: debugSettings.enableFocus })}
                        onClick={() => updateDebugSettings({ enableFocus: !debugSettings.enableFocus })}
                    />
                </div>
                <div className="switchRow">
                    <p>Orbit mode min elevation</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={90.0}
                        step={1.0}
                        value={debugSettings.orbitCameraMinElevation}
                        onChange={(value) => {
                            const clampedValue = Math.min(value, debugSettings.orbitCameraMaxElevation - 0.1)
                            updateDebugSettings({ orbitCameraMinElevation: clampedValue })
                        }}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Orbit mode max elevation</p>
                    <Range
                        type="range"
                        min={0.0}
                        max={90.0}
                        step={1.0}
                        value={debugSettings.orbitCameraMaxElevation}
                        onChange={(value) => {
                            const clampedValue = Math.max(debugSettings.orbitCameraMinElevation + 0.1, value)
                            updateDebugSettings({ orbitCameraMaxElevation: clampedValue })
                        }}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Use mouse wheel for camera dolly zoom</p>
                    <span
                        className={classNames('switch', { on: debugSettings.orbitCameraMouseWheelDolly })}
                        onClick={() =>
                            updateDebugSettings({
                                orbitCameraMouseWheelDolly: !debugSettings.orbitCameraMouseWheelDolly,
                            })
                        }
                    />
                </div>
                <h2>Settings</h2>
                <div className="switchRow" style={{ display: 'none' }}>
                    <p>
                        Infinite floor plane<span>default to floor plane</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.defaultToFloor })}
                        onClick={() => updateDebugSettings({ defaultToFloor: !debugSettings.defaultToFloor })}
                    />
                </div>
                <div className="switchRow">
                    <p>Front side shadow mapping</p>
                    <span
                        className={classNames('switch', { on: debugSettings.frontSideShadows })}
                        onClick={() => updateDebugSettings({ frontSideShadows: !debugSettings.frontSideShadows })}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Enable walls<span>w</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.enableWalls })}
                        onClick={() => updateDebugSettings({ enableWalls: !debugSettings.enableWalls })}
                    />
                </div>
                <div className="switchRow">
                    <p>Disable 3D compositions saving</p>
                    <span
                        className={classNames('switch', { on: debugSettings.disable3DCompositionSave })}
                        onClick={() =>
                            updateDebugSettings({
                                disable3DCompositionSave: !debugSettings.disable3DCompositionSave,
                            })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Enable memory tracking<span>m</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.showMemoryStats })}
                        onClick={() => updateDebugSettings({ showMemoryStats: !debugSettings.showMemoryStats })}
                    />
                </div>
                <div className="dropRow">
                    <p>Tracked memory:</p>
                    <Dropdown
                        name="trackedMemory"
                        onChange={(e) => updateDebugSettings({ trackedMemoryType: e.target.value })}
                        value={debugSettings.trackedMemoryType}
                        options={trackedMemoryOptions}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Enable art resizing<span>r</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.canEditArtSize })}
                        onClick={() => updateDebugSettings({ canEditArtSize: !debugSettings.canEditArtSize })}
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Show extra product details<span>p</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.showProductAdminData })}
                        onClick={() =>
                            updateDebugSettings({ showProductAdminData: !debugSettings.showProductAdminData })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Use TAA for screenshots<span>p</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.useTAAforScreenshots })}
                        onClick={() =>
                            updateDebugSettings({ useTAAforScreenshots: !debugSettings.useTAAforScreenshots })
                        }
                    />
                </div>
                <div className="switchRow">
                    <p>
                        Disable TAA and use FXAA<span>t</span>
                    </p>
                    <span
                        className={classNames('switch', { on: debugSettings.forceFXAA })}
                        onClick={() => updateDebugSettings({ forceFXAA: !debugSettings.forceFXAA })}
                    />
                </div>
                <div className="switchRow">
                    <p>Context loss frequency window</p>
                    <Range
                        type="range"
                        min={1.0}
                        max={600.0}
                        step={1.0}
                        value={debugSettings.ctxLossFrequencyWindow}
                        onChange={(value) => updateDebugSettings({ ctxLossFrequencyWindow: value })}
                        sideLabel
                    />
                </div>
                <div className="switchRow">
                    <p>Stackables min interactible depth</p>
                    <Range
                        type="range"
                        min={0.01}
                        max={0.1}
                        step={0.005}
                        value={debugSettings.stackablesMinInteractibleDepth}
                        onChange={(value) => updateDebugSettings({ stackablesMinInteractibleDepth: value })}
                        sideLabel
                    />
                </div>
                <div className="toolRow" style={{ display: 'none' }}>
                    <p>
                        Toggle debug features<span>ctrl + j</span>
                    </p>
                    <button onClick={toggleDebugFeatures}>
                        <SSRIcon paths={crossCircle} />
                    </button>
                </div>

                <h2>Smarta</h2>
                <div className="switchRow">
                    <p>Smarta Feature Flag</p>
                    <span className={classNames('switch', { on: !forceSmartaOff })} onClick={toggleSmarta} />
                </div>
                <div className="switchRow">
                    <p>Smarta timeout</p>
                    <Range
                        type="range"
                        min={0}
                        max={2000}
                        step={100}
                        value={smartaTimeout}
                        onChange={(value) => dispatch(setSmartaTimeout(value))}
                        sideLabel
                    />
                </div>

                <div className="infoRow">
                    <div className="rowTitle">URL</div>
                    <div className="rowContent">
                        <input
                            type="text"
                            onChange={onSmartaURLChange}
                            onKeyDown={(e) => e.stopPropagation()}
                            value={smartaURL !== null ? smartaURL : url}
                        />
                    </div>
                </div>
                <div className="infoRow">
                    <div className="rowTitle">Ruleset</div>
                    <div className="rowContent">
                        <input
                            type="text"
                            onChange={(e) => dispatch(setSmartaRuleset(e.target.value))}
                            onKeyDown={(e) => e.stopPropagation()}
                            value={smartaRuleset ?? ''}
                        />
                    </div>
                </div>
                <h2>Tools</h2>
                <div className="toolRow">
                    <p>
                        Take screenshot<span>s</span>
                    </p>
                    <button onClick={takeScreenshot}>
                        <SSRIcon paths={camera} />
                    </button>
                </div>
                <div className="toolRow">
                    <p>Download beautifier capture</p>
                    <button onClick={downloadBeautifierCaptureImage}>
                        <SSRIcon paths={arrowDown} />
                    </button>
                </div>
                <div className="toolRow">
                    <p>Lose webgl context</p>
                    <button onClick={loseWebglContext}>
                        <SSRIcon paths={crossCircle} />
                    </button>
                </div>
                <div className="toolRow">
                    <p>Furniture swap test</p>
                    <button onClick={swapFiftyItems}>
                        <SSRIcon paths={arrowLeftArrowRight} />
                    </button>
                </div>
                <div className="toolRow">
                    <p>Furniture memory leak test</p>
                    <button onClick={startLoadTest}>
                        <SSRIcon paths={chevronRight} />
                    </button>
                </div>
                <div className="toolRow">
                    <p>Save composition to local storage</p>
                    <button onClick={() => dispatch(saveSelectedCompositionToLocalStorage())}>
                        <SSRIcon paths={arrowDown} />
                    </button>
                </div>
            </section>
        </div>
    )
}

Debug.defaultProps = {
    composition: null,
    subCatalogs: null,
}

Debug.propTypes = {
    debugSettings: debugSettingsType.isRequired,
    previewSettings: previewSettingsType.isRequired,
    updateDebugSettings: func.isRequired,
    composition: compositionType,
    takeScreenshot: func.isRequired,
    loseWebglContext: func.isRequired,
    toggleDebugFeatures: func.isRequired,
    updateManifest: func.isRequired,
    subCatalogs: arrayOf(string),
    furnitureFilter: filterType.isRequired,
    updateFurnitureFilter: func.isRequired,
    startSwapTest: func.isRequired,
    startLoadTest: func.isRequired,
    isNewComposition: number.isRequired,
}

export default Debug

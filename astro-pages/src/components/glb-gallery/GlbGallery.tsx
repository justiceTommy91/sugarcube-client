import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isGlbFilename, isImageFilename } from './imageFileFilter'
import { walkDataTransferItems, walkInputFiles, type WalkedFile } from './folderWalker'
import { createThumbnailQueue, type ThumbnailQueue } from './thumbnailQueue'
import { ImageLightbox } from './ImageLightbox'
import { GlbLightbox } from './GlbLightbox'
import './GlbGallery.scss'

type GlbTile = {
    file: File
    relativePath: string
    thumbnailDataUrl: string | null
    failed: boolean
}

type ImageTile = {
    file: File
    relativePath: string
    blobUrl: string
}

type GlbSection = { kind: 'empty' } | { kind: 'scanning' } | { kind: 'loaded'; tiles: GlbTile[]; rendered: number }

type ImageSection = { kind: 'empty' } | { kind: 'scanning' } | { kind: 'loaded'; tiles: ImageTile[] }

type Lightbox = { kind: 'none' } | { kind: 'image'; tile: ImageTile } | { kind: 'glb'; tile: GlbTile }

const formatBytes = (size: number): string => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const directoryInputProps = {
    webkitdirectory: '',
    directory: '',
    mozdirectory: '',
} as unknown as React.InputHTMLAttributes<HTMLInputElement>

type GlbPanelBodyProps = {
    section: GlbSection
    onTileClick: (tile: GlbTile) => void
}

const GlbPanelBody = ({ section, onTileClick }: GlbPanelBodyProps) => {
    if (section.kind === 'empty') {
        return <div className="glb-gallery__empty">No folder picked yet. Pick a folder of .glb files to begin.</div>
    }
    if (section.kind === 'scanning') {
        return <div className="glb-gallery__empty">Scanning folder…</div>
    }
    if (section.tiles.length === 0) {
        return <div className="glb-gallery__empty">No .glb files were found in the picked folder.</div>
    }
    return (
        <div className="glb-gallery__grid">
            {section.tiles.map((tile) => (
                <button
                    key={tile.relativePath}
                    type="button"
                    className="glb-gallery__tile"
                    onClick={() => onTileClick(tile)}
                >
                    <div className="glb-gallery__tile-image">
                        {tile.thumbnailDataUrl ? (
                            <img src={tile.thumbnailDataUrl} alt="" />
                        ) : (
                            <span
                                className={`glb-gallery__tile-status${
                                    tile.failed ? ' glb-gallery__tile-status--error' : ''
                                }`}
                            >
                                {tile.failed ? 'Render failed' : 'Rendering…'}
                            </span>
                        )}
                    </div>
                    <div className="glb-gallery__tile-meta">
                        <div className="glb-gallery__tile-name">{tile.relativePath}</div>
                        <div className="glb-gallery__tile-size">{formatBytes(tile.file.size)}</div>
                    </div>
                </button>
            ))}
        </div>
    )
}

type ImagePanelBodyProps = {
    section: ImageSection
    onTileClick: (tile: ImageTile) => void
}

const ImagePanelBody = ({ section, onTileClick }: ImagePanelBodyProps) => {
    if (section.kind === 'empty') {
        return <div className="glb-gallery__empty">No folder picked yet. Pick a folder of images to begin.</div>
    }
    if (section.kind === 'scanning') {
        return <div className="glb-gallery__empty">Scanning folder…</div>
    }
    if (section.tiles.length === 0) {
        return <div className="glb-gallery__empty">No supported image files were found in the picked folder.</div>
    }
    return (
        <div className="glb-gallery__grid">
            {section.tiles.map((tile) => (
                <button
                    key={tile.relativePath}
                    type="button"
                    className="glb-gallery__tile"
                    onClick={() => onTileClick(tile)}
                >
                    <div className="glb-gallery__tile-image">
                        <img src={tile.blobUrl} alt="" loading="lazy" />
                    </div>
                    <div className="glb-gallery__tile-meta">
                        <div className="glb-gallery__tile-name">{tile.relativePath}</div>
                        <div className="glb-gallery__tile-size">{formatBytes(tile.file.size)}</div>
                    </div>
                </button>
            ))}
        </div>
    )
}

export const GlbGallery = () => {
    const [glbSection, setGlbSection] = useState<GlbSection>({ kind: 'empty' })
    const [imageSection, setImageSection] = useState<ImageSection>({ kind: 'empty' })
    const [lightbox, setLightbox] = useState<Lightbox>({ kind: 'none' })
    const [isGlbDragging, setIsGlbDragging] = useState(false)
    const [isImageDragging, setIsImageDragging] = useState(false)

    const glbInputRef = useRef<HTMLInputElement | null>(null)
    const imageInputRef = useRef<HTMLInputElement | null>(null)
    const thumbnailQueueRef = useRef<ThumbnailQueue | null>(null)
    const imageBlobUrlsRef = useRef<string[]>([])

    useEffect(
        () => () => {
            thumbnailQueueRef.current?.dispose()
            thumbnailQueueRef.current = null
            imageBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
            imageBlobUrlsRef.current = []
        },
        [],
    )

    const ensureThumbnailQueue = useCallback((): ThumbnailQueue => {
        if (!thumbnailQueueRef.current) {
            thumbnailQueueRef.current = createThumbnailQueue()
        }
        return thumbnailQueueRef.current
    }, [])

    const acceptGlbEntries = useCallback(
        (entries: WalkedFile[]) => {
            setGlbSection({
                kind: 'loaded',
                tiles: entries.map((entry) => ({
                    file: entry.file,
                    relativePath: entry.relativePath,
                    thumbnailDataUrl: null,
                    failed: false,
                })),
                rendered: 0,
            })

            if (entries.length === 0) return

            const queue = ensureThumbnailQueue()
            queue.cancel()
            // eslint-disable-next-line @typescript-eslint/no-floating-promises -- queue manages its own lifecycle
            queue.process(entries, {
                onThumbnail: (entry, dataUrl) => {
                    setGlbSection((prev) => {
                        if (prev.kind !== 'loaded') return prev
                        return {
                            ...prev,
                            tiles: prev.tiles.map((tile) =>
                                tile.relativePath === entry.relativePath
                                    ? { ...tile, thumbnailDataUrl: dataUrl }
                                    : tile,
                            ),
                        }
                    })
                },
                onError: (entry) => {
                    setGlbSection((prev) => {
                        if (prev.kind !== 'loaded') return prev
                        return {
                            ...prev,
                            tiles: prev.tiles.map((tile) =>
                                tile.relativePath === entry.relativePath ? { ...tile, failed: true } : tile,
                            ),
                        }
                    })
                },
                onProgress: (done) => {
                    setGlbSection((prev) => (prev.kind === 'loaded' ? { ...prev, rendered: done } : prev))
                },
            })
        },
        [ensureThumbnailQueue],
    )

    const acceptImageEntries = useCallback((entries: WalkedFile[]) => {
        imageBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
        imageBlobUrlsRef.current = []

        const tiles = entries.map((entry) => {
            const blobUrl = URL.createObjectURL(entry.file)
            imageBlobUrlsRef.current.push(blobUrl)
            return { file: entry.file, relativePath: entry.relativePath, blobUrl }
        })
        setImageSection({ kind: 'loaded', tiles })
    }, [])

    const handleGlbInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) return
        setGlbSection({ kind: 'scanning' })
        acceptGlbEntries(walkInputFiles(files, isGlbFilename))
        if (glbInputRef.current) glbInputRef.current.value = ''
    }

    const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) return
        setImageSection({ kind: 'scanning' })
        acceptImageEntries(walkInputFiles(files, isImageFilename))
        if (imageInputRef.current) imageInputRef.current.value = ''
    }

    const handleGlbDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsGlbDragging(false)
        if (!event.dataTransfer.items) return
        setGlbSection({ kind: 'scanning' })
        const entries = await walkDataTransferItems(event.dataTransfer.items, isGlbFilename)
        acceptGlbEntries(entries)
    }

    const handleImageDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsImageDragging(false)
        if (!event.dataTransfer.items) return
        setImageSection({ kind: 'scanning' })
        const entries = await walkDataTransferItems(event.dataTransfer.items, isImageFilename)
        acceptImageEntries(entries)
    }

    const closeLightbox = useCallback(() => setLightbox({ kind: 'none' }), [])

    const glbProgress = useMemo(() => {
        if (glbSection.kind !== 'loaded') return null
        if (glbSection.tiles.length === 0) return null
        if (glbSection.rendered >= glbSection.tiles.length) return null
        return { done: glbSection.rendered, total: glbSection.tiles.length }
    }, [glbSection])

    return (
        <div className="glb-gallery">
            <header className="glb-gallery__header">
                <h1>GLB gallery</h1>
                <p className="glb-gallery__subtitle">
                    Browse a folder of GLB assets and a folder of images side by side. Pick a folder for each section.
                </p>
            </header>

            <div className="glb-gallery__panels">
                <section
                    className={`glb-gallery__panel${isGlbDragging ? ' glb-gallery__panel--dragging' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault()
                        if (!isGlbDragging) setIsGlbDragging(true)
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault()
                        setIsGlbDragging(false)
                    }}
                    onDrop={handleGlbDrop}
                    aria-label="GLB assets"
                >
                    <div className="glb-gallery__panel-header">
                        <h2>GLB assets</h2>
                        <label className="glb-gallery__pick-label" htmlFor="glb-gallery-glb-input">
                            <span className="glb-gallery__pick-button">
                                {glbSection.kind === 'empty' ? 'Pick folder' : 'Re-pick folder'}
                            </span>
                            <input
                                id="glb-gallery-glb-input"
                                ref={glbInputRef}
                                type="file"
                                multiple
                                {...directoryInputProps}
                                className="glb-gallery__hidden-input"
                                onChange={handleGlbInputChange}
                            />
                        </label>
                    </div>
                    {glbProgress && (
                        <div className="glb-gallery__progress" role="status" aria-live="polite">
                            Rendering {glbProgress.done} of {glbProgress.total}…
                        </div>
                    )}
                    <GlbPanelBody section={glbSection} onTileClick={(tile) => setLightbox({ kind: 'glb', tile })} />
                    {isGlbDragging && <div className="glb-gallery__drop-overlay">Drop folder to load GLB assets</div>}
                </section>

                <section
                    className={`glb-gallery__panel${isImageDragging ? ' glb-gallery__panel--dragging' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault()
                        if (!isImageDragging) setIsImageDragging(true)
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault()
                        setIsImageDragging(false)
                    }}
                    onDrop={handleImageDrop}
                    aria-label="Images"
                >
                    <div className="glb-gallery__panel-header">
                        <h2>Images</h2>
                        <label className="glb-gallery__pick-label" htmlFor="glb-gallery-image-input">
                            <span className="glb-gallery__pick-button">
                                {imageSection.kind === 'empty' ? 'Pick folder' : 'Re-pick folder'}
                            </span>
                            <input
                                id="glb-gallery-image-input"
                                ref={imageInputRef}
                                type="file"
                                multiple
                                {...directoryInputProps}
                                className="glb-gallery__hidden-input"
                                onChange={handleImageInputChange}
                            />
                        </label>
                    </div>
                    <ImagePanelBody
                        section={imageSection}
                        onTileClick={(tile) => setLightbox({ kind: 'image', tile })}
                    />
                    {isImageDragging && <div className="glb-gallery__drop-overlay">Drop folder to load images</div>}
                </section>
            </div>

            {lightbox.kind === 'image' && (
                <ImageLightbox src={lightbox.tile.blobUrl} label={lightbox.tile.relativePath} onClose={closeLightbox} />
            )}
            {lightbox.kind === 'glb' && (
                <GlbLightbox file={lightbox.tile.file} label={lightbox.tile.relativePath} onClose={closeLightbox} />
            )}
        </div>
    )
}

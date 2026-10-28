import React, { useCallback, useRef, useState } from 'react'
import { ALLOWED_HOSTS_DESCRIPTION, validateGlbUrl } from './urlAllowlist'
import { validateGlbFile } from './fileValidator'
import { mapLoadError } from './errorMapper'
import { GlbCanvas } from './GlbCanvas'
import './GlbViewer.scss'

type Status =
    | { kind: 'idle' }
    | { kind: 'loading'; loaded: number; total: number }
    | { kind: 'loaded'; sourceLabel: string }
    | { kind: 'error'; message: string }

const urlAllowlistMessage = (reason: 'invalid_url' | 'wrong_host' | 'wrong_path'): string => {
    if (reason === 'invalid_url') return 'Enter a valid https:// URL.'
    return `URL must be on an IKEA asset host: ${ALLOWED_HOSTS_DESCRIPTION}`
}

const fileMessage = (reason: 'wrong_extension' | 'empty_file'): string => {
    if (reason === 'wrong_extension') return 'File must have a .glb extension.'
    return 'File is empty.'
}

export const GlbViewer = () => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [urlInput, setUrlInput] = useState('')
    const [source, setSource] = useState<string | File | null>(null)
    const [pendingLabel, setPendingLabel] = useState<string | null>(null)
    const [status, setStatus] = useState<Status>({ kind: 'idle' })
    const [isDragging, setIsDragging] = useState(false)

    const startLoad = useCallback((nextSource: string | File, label: string) => {
        setStatus({ kind: 'loading', loaded: 0, total: 0 })
        setPendingLabel(label)
        setSource(nextSource)
    }, [])

    const handleUrlSubmit = useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const trimmed = urlInput.trim()
            const result = validateGlbUrl(trimmed)
            if (!result.ok) {
                setStatus({ kind: 'error', message: urlAllowlistMessage(result.reason) })
                return
            }
            startLoad(trimmed, trimmed)
        },
        [urlInput, startLoad],
    )

    const handleFile = useCallback(
        (file: File) => {
            const result = validateGlbFile(file)
            if (!result.ok) {
                setStatus({ kind: 'error', message: fileMessage(result.reason) })
                return
            }
            startLoad(file, file.name)
        },
        [startLoad],
    )

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) handleFile(file)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file) handleFile(file)
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!isDragging) setIsDragging(true)
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
    }

    const isLoading = status.kind === 'loading'
    const progressPercent =
        status.kind === 'loading' && status.total > 0 ? Math.round((status.loaded / status.total) * 100) : null

    return (
        <div className="glb-viewer">
            <header className="glb-viewer__header">
                <h1>GLB viewer</h1>
                <p className="glb-viewer__subtitle">
                    Inspect IKEA GLB assets by URL or local file. Draco and KTX2 are supported.
                </p>
            </header>

            <div className="glb-viewer__controls">
                <form className="glb-viewer__url-form" onSubmit={handleUrlSubmit}>
                    <label className="glb-viewer__label" htmlFor="glb-viewer-url-input">
                        <span>GLB URL</span>
                        <div className="glb-viewer__row">
                            <input
                                id="glb-viewer-url-input"
                                type="url"
                                value={urlInput}
                                onChange={(event) => setUrlInput(event.target.value)}
                                placeholder="https://storage.googleapis.com/wallspice-3d-models/..."
                                disabled={isLoading}
                                className="glb-viewer__input"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || urlInput.trim() === ''}
                                className="glb-viewer__button"
                            >
                                Load
                            </button>
                        </div>
                    </label>
                </form>

                <label className="glb-viewer__file-pick glb-viewer__label" htmlFor="glb-viewer-file-input">
                    <span>Or pick a local .glb file</span>
                    <input
                        id="glb-viewer-file-input"
                        ref={fileInputRef}
                        type="file"
                        accept=".glb,model/gltf-binary"
                        onChange={handleFileInputChange}
                        disabled={isLoading}
                    />
                </label>
            </div>

            <div
                className={`glb-viewer__canvas-wrap${isDragging ? ' glb-viewer__canvas-wrap--dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <GlbCanvas
                    source={source}
                    className="glb-viewer__canvas"
                    onProgress={(loaded, total) => setStatus({ kind: 'loading', loaded, total })}
                    onLoaded={() => {
                        if (pendingLabel !== null) {
                            setStatus({ kind: 'loaded', sourceLabel: pendingLabel })
                        }
                    }}
                    onError={(err) => setStatus({ kind: 'error', message: mapLoadError(err).message })}
                />
                {isDragging && <div className="glb-viewer__drop-overlay">Drop .glb file to load</div>}
            </div>

            <div className="glb-viewer__status" role="status" aria-live="polite">
                {status.kind === 'idle' && <span>Paste a URL or pick a file to begin.</span>}
                {status.kind === 'loading' && (
                    <span>Loading{progressPercent !== null ? ` (${progressPercent}%)` : '...'}</span>
                )}
                {status.kind === 'loaded' && <span>Loaded: {status.sourceLabel}</span>}
                {status.kind === 'error' && <span className="glb-viewer__error">{status.message}</span>}
            </div>
        </div>
    )
}

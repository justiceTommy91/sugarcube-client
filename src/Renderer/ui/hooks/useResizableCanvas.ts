import { useState, useEffect, useCallback, useMemo } from 'react'
import { GeomViewer } from 'Renderer/geomviewer';

// Hook that syncs the current canvas and its size with GeomViewerAPI.
function useResizableCanvas() {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  // 0 means "renderer hasn't reported the canvas's intrinsic aspect yet". A 1,1 default
  // would make aspectFitDimensions resolve to a 1:1 box that the renderer can lock onto.
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Create ref callbacks using useCallback
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    setCanvasElement(node);
  }, []);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerElement(node);
    // Seed dimensions synchronously so the first render sees a real container size
    // instead of waiting for the ResizeObserver tick.
    if (node) {
      const rect = node.getBoundingClientRect()
      setContainerDimensions({ width: rect.width, height: rect.height })
    }
  }, []);

  // Monitor changes to the canvas's width and height attributes.
  useEffect(() => {
    if (!canvasElement) return undefined

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type !== 'attributes' || !(mutation.target instanceof HTMLElement)) return
        const { attributeName } = mutation
        if (attributeName !== 'width' && attributeName !== 'height') return
        const value = mutation.target.getAttribute(attributeName)
        if (value) {
          setCanvasDimensions((dims) => ({ ...dims, [attributeName]: parseInt(value, 10) }))
        }
      })
    })

    // eslint-disable-next-line i18next/no-literal-string
    observer.observe(canvasElement, { attributes: true, attributeFilter: ['width', 'height'] })
    return () => observer.disconnect()
  }, [canvasElement])

  // Trailing-edge debounce with setTimeout(0): coalesces RO bursts and schedules
  // on-canvas-resized between frames, so setSize's buffer clear lands when the next
  // rAF will refill it before paint. Avoids the visible flash during resize.
  useEffect(() => {
    if (!containerElement) return undefined

    let timer: ReturnType<typeof setTimeout> | null = null
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setContainerDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
      })
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        GeomViewer.bindings?.doAction('on-canvas-resized')
      }, 0)
    })

    resizeObserver.observe(containerElement)
    return () => {
      resizeObserver.disconnect()
      if (timer !== null) clearTimeout(timer)
    }
  }, [containerElement])

  // Also observe the canvas element for layout size changes.
  // The canvas may be sized by CSS (e.g. width/height: 100% !important) relative to a
  // positioned ancestor that differs from the container element, so container resize alone
  // does not capture all cases (e.g. vertical window resize in mesh-based rooms).
  useEffect(() => {
    if (!canvasElement) return undefined

    let timer: ReturnType<typeof setTimeout> | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        GeomViewer.bindings?.doAction('on-canvas-resized')
      }, 0)
    })

    resizeObserver.observe(canvasElement)
    return () => {
      resizeObserver.disconnect()
      if (timer !== null) clearTimeout(timer)
    }
  }, [canvasElement])

  // Aspect fit the canvas into its container.
  const aspectFitDimensions = useMemo(() => {
    const { width: containerWidth, height: containerHeight } = containerDimensions;
    const { width: canvasWidth, height: canvasHeight } = canvasDimensions;

    if (containerWidth && containerHeight) {
      // Renderer hasn't reported an intrinsic aspect yet; fill the container so the
      // first read of clientWidth and clientHeight reflects real layout.
      if (!canvasWidth || !canvasHeight) {
        return { width: containerWidth, height: containerHeight };
      }
      const aspectRatio = canvasWidth / canvasHeight;
      const containerAspectRatio = containerWidth / containerHeight;
      if (containerAspectRatio > aspectRatio) {
        return { width: containerHeight * aspectRatio, height: containerHeight };
      }
      return { width: containerWidth, height: containerWidth / aspectRatio };
    }

    return { width: 1, height: 1 }; // Default to avoid zero dimensions.
  }, [containerDimensions, canvasDimensions]);

  // When the canvas is letterboxed or pillarboxed (one CSS dimension is locked to the container
  // edge while the other is smaller), React's virtual-DOM diffing can leave a stale THREE.js
  // CSS value in place. Example: container 414×207, pillarboxed scene at 4:3 →
  //   1. aspectFitDimensions = {276, 207}; React sets canvas CSS height: 207px
  //   2. THREE.js setSize(552, 414) fires: canvas.style.height mutated to 414px
  //   3. aspectFitDimensions recomputes to {276, 207} — height unchanged
  //   4. React sees height 207→207 in vDOM, skips the DOM write → 414px sticks
  // Imperatively re-applying both dimensions on every aspectFitDimensions change prevents this.
  useEffect(() => {
    if (!canvasElement) return
    canvasElement.style.width = `${aspectFitDimensions.width}px`
    canvasElement.style.height = `${aspectFitDimensions.height}px`
  }, [canvasElement, aspectFitDimensions])

  return {
    canvasElement,
    canvasRef,
    containerRef,
    canvasDimensions: aspectFitDimensions,
  }
}

export default useResizableCanvas

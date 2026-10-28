import { GfxInterface } from "./gfxInterface"

let renderLibrary: GfxInterface | undefined

export function gvInitRenderLibrary(renderLib: GfxInterface) {
  renderLibrary = renderLib
}

export function gvClearRenderLibrary() {
  renderLibrary = undefined
}

export function gvGetRenderLibrary(): GfxInterface | undefined {
  return renderLibrary
}
import * as api from 'Renderer/foundation/geom_viewer_impl'
import type { GeomViewerType } from './geom_viewer';

// Note: The API-bindings initialization is isolated in this file to avoid
// circular dependencies.

export const GeomViewer: {
    bindings?: GeomViewerType;
} = {};

export function initGeomViewerLib() {
    GeomViewer.bindings = api.initGeomViewerApi();
}

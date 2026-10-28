/*
 * WorkerAdapters
 * Each web-worker in this folder has an corresponding create<worker name> function
 * below. This file can be conveniently imported into a typescript file and the
 * create functions called from typescript code.
 */

export function createDropLocationsWorker() {
    return new Worker(/* webpackChunkName: "drop-locations" */ new URL(`./DropLocationsFinder.worker.js`, import.meta.url), { type: `module` })
}

export function createPolesOfInaccessibilityWorker() {
    return new Worker(/* webpackChunkName: "poles-of-inaccess" */ new URL(`./PolesOfInaccessibilityFinder.worker.js`, import.meta.url), { type: `module` })
}

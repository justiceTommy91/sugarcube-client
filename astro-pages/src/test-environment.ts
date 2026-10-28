import type { Environment } from 'vitest'
import { builtinEnvironments } from 'vitest/environments'
import { createRequire } from 'node:module'

/**
 * Custom Vitest environment that wraps the built-in jsdom environment.
 *
 * Problem: jsdom's utils.js calls require('canvas') at module evaluation time
 * (i.e., the first time jsdom is imported). If the native canvas bindings fail
 * to load — e.g., libgif.so.7 is missing in CI — Node throws ERR_DLOPEN_FAILED
 * as an unhandled error, which prevents all tests from running.
 *
 * Fix: patch Module._load before setup() triggers the jsdom import. Returning
 * {} for 'canvas' causes jsdom to skip its canvas enhancement (it checks
 * `typeof Canvas.createCanvas === 'function'` before using it), so tests run
 * normally using jsdom's built-in HTMLCanvasElement stub.
 *
 * This file is evaluated by the vitest worker before setup() is called, so the
 * patch is in place when jsdom's require('canvas') executes inside setup().
 * Static imports here are safe: vitest/environments loads jsdom lazily (inside
 * its own setup()), so importing the environments chunk does not trigger canvas
 * loading.
 */
const nodeRequire = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, i18next/no-literal-string
const Module = nodeRequire('module') as any
// eslint-disable-next-line no-underscore-dangle
const originalLoad: (id: string, ...args: unknown[]) => unknown = Module._load
// eslint-disable-next-line no-underscore-dangle
Module._load = function canvasSafeLoad(id: string, ...args: unknown[]) {
    // eslint-disable-next-line i18next/no-literal-string
    if (id === 'canvas') return {}
    return originalLoad.call(this, id, ...args)
}

const environment: Environment = {
    name: 'jsdom-canvas-safe',
    // eslint-disable-next-line i18next/no-literal-string
    transformMode: 'web',
    async setup(global, options) {
        return builtinEnvironments.jsdom.setup(global, options)
    },
}

export default environment

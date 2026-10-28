import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin to handle WASM files for the 3D viewer.
 * - In dev: serves WASM files from node_modules via middleware
 * - In build: copies WASM files to dist directory
 */
export function wasmPlugin() {
    const wasmFiles = [
        {
            name: 'decorate-engine.wasm',
            src: path.resolve(
                __dirname,
                '../../node_modules/@geomagical/sugarcube-rendering-shared/dist/release/decorate-engine.wasm',
            ),
            dest: 'decorate-engine.wasm',
        },
        {
            name: 'kreativ-core-sdk.wasm',
            src: path.resolve(__dirname, '../../node_modules/@geomagical/sugarcube-shared/dist/kreativ-core-sdk.wasm'),
            dest: 'wasm/kreativ-core-sdk.wasm',
        },
    ]

    return {
        name: 'wasm-plugin',

        // Handle WASM imports during dev - serve from node_modules
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const wasmFile = wasmFiles.find((f) => req.url?.endsWith(f.name))
                if (wasmFile && fs.existsSync(wasmFile.src)) {
                    res.setHeader('Content-Type', 'application/wasm')
                    fs.createReadStream(wasmFile.src).pipe(res)
                } else {
                    next()
                }
            })
        },

        // Copy WASM files to build output
        writeBundle() {
            wasmFiles.forEach(({ src, dest }) => {
                const destPath = path.resolve(__dirname, '../dist', dest)
                if (fs.existsSync(src)) {
                    const destDir = path.dirname(destPath)
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true })
                    }
                    fs.copyFileSync(src, destPath)
                } else {
                    console.warn(`[WASM] File not found: ${src}`)
                }
            })
        },
    }
}
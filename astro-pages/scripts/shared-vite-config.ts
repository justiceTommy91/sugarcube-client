import path from 'path'
import { fileURLToPath } from 'url'
import { getSharedEnvDefines } from './shared-env.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const astroDir = path.resolve(__dirname, '..')
export const rootDir = path.resolve(astroDir, '..')
export const srcDir = path.resolve(rootDir, 'src')

export const envDefines = getSharedEnvDefines(rootDir)

const sharedModules = ['components', 'hooks', 'utils', 'models', 'apps', 'constants', 'services', 'style']
export const sharedAliases = sharedModules.reduce<Record<string, string>>(
    (acc, m) => {
        acc[`@${m}`] = path.resolve(srcDir, m)
        acc[m] = path.resolve(srcDir, m)
        return acc
    },
    { Renderer: path.resolve(srcDir, 'Renderer') },
)

export const astroAliases = {
    '@lib': path.resolve(astroDir, 'src/lib'),
    '@layouts': path.resolve(astroDir, 'src/layouts'),
    '@providers': path.resolve(astroDir, 'src/providers'),
    '@astro-hooks': path.resolve(astroDir, 'src/hooks'),
    '@astro-components': path.resolve(astroDir, 'src/components'),
    '@astro-services': path.resolve(astroDir, 'src/services'),
    '@gatsby': srcDir,
    'models/location/selectors': path.resolve(astroDir, 'src/lib/location-selectors.ts'),
    gatsby: path.resolve(astroDir, 'src/lib/gatsby-compat.ts'),
    ...sharedAliases,
}

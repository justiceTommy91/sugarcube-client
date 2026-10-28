// Some code copyright Kevin Centeno.
// Used under the terms of the MIT license.
import path from 'path'
import { fileURLToPath } from 'url'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'

export const onCreateWebpackConfig = ({ stage, actions }, options) => {
    if (stage !== 'develop') {
        return
    }

    delete options.plugins

    actions.setWebpackConfig({
        watchOptions: {
            ignored: [path.normalize(`${fileURLToPath(import.meta.url)}/../../../src/gatsby-types.d.ts`)],
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin({
                async: false,
                typescript: {
                    configOverwrite: {
                        exclude: ['node_modules', 'dist', 'plugins'],
                    },
                },
                logger: {
                    infrastructure: 'silent',
                    issues: 'silent',
                },
                ...options,
            }),
        ],
    })
}

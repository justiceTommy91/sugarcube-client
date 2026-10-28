const isTest = String(process.env.NODE_ENV) === 'test'

const plugins = [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
]

if (isTest) {
    plugins.push(['babel-plugin-transform-import-meta'])
}

module.exports = {
    plugins,
    presets: [
        'babel-preset-gatsby',
        'airbnb',
        '@babel/preset-typescript',
        [
            '@babel/preset-env',
            {
                modules: isTest ? 'commonjs' : false,
                targets: {
                    node: 'current',
                },
            },
        ],
        '@babel/preset-react',
    ],
}

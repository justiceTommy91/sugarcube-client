/* eslint-disable i18next/no-literal-string */
/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: ['../.eslintrc'],
    ignorePatterns: ['*.d.ts', 'src/lib/**', 'scripts/**', 'plugins/**', 'astro.config.mjs'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        // __dirname is always the astro-pages/ directory, regardless of where ESLint is invoked from
        tsconfigRootDir: __dirname,
    },
    root: true,
    overrides: [
        {
            files: ['src/**/*.{test,spec}.{ts,tsx}'],
            globals: {
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
            rules: {
                'import/no-extraneous-dependencies': [
                    'error',
                    {
                        devDependencies: true,
                        packageDir: [__dirname, `${__dirname}/..`],
                    },
                ],
            },
        },
        {
            // Internal debug tools — English-only by design (see PRDs).
            files: [
                'src/components/glb-viewer/**/*.{ts,tsx}',
                'src/pages/glb-viewer.astro',
                'src/components/glb-gallery/**/*.{ts,tsx}',
                'src/pages/glb-gallery.astro',
            ],
            rules: {
                'i18next/no-literal-string': 'off',
            },
        },
    ],
    rules: {
        'import/no-extraneous-dependencies': [
            'error',
            {
                packageDir: [__dirname, `${__dirname}/..`],
            },
        ],
    },
    settings: {
        'import/internal-regex':
            '^(@models|@services|@components|@hooks|@utils|@constants|@apps|@style|@astro-|@lib|@layouts|@providers|@gatsby|models|services|components|hooks|utils|constants|apps|style|Renderer)(/|$)',
        'import/resolver': {
            typescript: {
                project: [`${__dirname}/tsconfig.eslint.json`, `${__dirname}/../tsconfig.json`],
            },
        },
    },
}

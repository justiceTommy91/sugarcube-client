module.exports = {
    defaultNamespace: 'translation',
    createOldCatalogs: false,
    locales: ['en'],
    output: 'locales/parse/$LOCALE/$NAMESPACE.json',
    input: ['src/**/*.{js,jsx,ts,tsx}'],
    sort: true,

    lexers: {
        js: ['JsxLexer'],
        ts: ['JsxLexer'],
        jsx: ['JsxLexer'],
        tsx: ['JsxLexer'],

        default: ['JavascriptLexer'],
    },

    nsSeparator: ':',
    ns: ['common', 'dashboard', 'learnmore', 'translation', 'campaigns'],
}

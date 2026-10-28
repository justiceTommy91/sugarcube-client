// Code copyright Kennedy Rose
// Used under the terms of the MIT license.
// https://github.com/escaladesports/legacy-gatsby-plugin-html-attributes

export const onRenderBody = ({ setHtmlAttributes }, userOptions) => {
    const options = { ...userOptions }
    delete options.plugins
    setHtmlAttributes(options)
}

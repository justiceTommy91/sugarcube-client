export type Labelled =
    | {
          'aria-label': React.AriaAttributes['aria-label']
          'aria-labelledby'?: undefined
      }
    | {
          'aria-label'?: undefined
          'aria-labelledby': React.AriaAttributes['aria-labelledby']
      }

type HtmlEventHandlers<T extends HTMLElement> = Omit<React.DOMAttributes<T>, 'children'>

export type OverrideableHtmlAttributes<T extends HTMLElement> = HtmlEventHandlers<T> & {
    ref?: React.MutableRefObject<T | null> | undefined
}

export type HtmlAttributeBag<T extends HTMLElement> = Omit<React.AriaAttributes, 'aria-multiselectable'> &
    HtmlEventHandlers<T> & {
        ref?: React.RefObject<T> | undefined
        id?: string | undefined
        // Override aria-multiselectable to be boolean instead of React's Booleanish type
        // This ensures compatibility with components that expect strict boolean values
        'aria-multiselectable'?: boolean | undefined
    }

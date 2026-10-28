import { Link } from 'gatsby'
import React, { forwardRef } from 'react'

export type InteractiveAreaProps = React.PropsWithChildren<
    React.ComponentPropsWithoutRef<React.ElementType> & {
        href?: string
        onClick?: React.MouseEventHandler
    }
>

/**
 * An InteractiveArea is a section of the page that has a click handler or is a link depending upon the props it
 * is passed. This is useful in situations where a component is polymorphic and might have an onClick behavor OR
 * a link depending on its props and we want to use a native browser element (<button> or <a>) to handle these
 * interactions.
 *
 * If href is defined InteracrtiveArea renders a <a> tag with the specified href prop.
 *
 * If no href is defined but onClick is defined, a <button> tag that triggers the
 * onClick handler when clicked will be rendered.
 *
 * If neither href nor onClick is defined, then a simple div is rendered.
 *
 * Note that when href or onClick is defined this renders an interactive element, and so can't have
 * children that are also interactive elements.
 */
export const InteractiveArea = forwardRef<HTMLElement, InteractiveAreaProps>(
    ({ children, href, onClick, ...props }, ref) => {
        if (href) {
            // Gatsby Link's ref typing is outdated, cast to any to bypass type issues
            return (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Link ref={ref as any} to={href} onClick={onClick} {...props}>
                    {children}
                </Link>
            )
        }
        if (onClick) {
            return (
                <button ref={ref as React.Ref<HTMLButtonElement>} onClick={onClick} {...props}>
                    {children}
                </button>
            )
        }
        return (
            <div ref={ref as React.Ref<HTMLDivElement>} {...props}>
                {children}
            </div>
        )
    },
)

InteractiveArea.displayName = `InteractiveArea`

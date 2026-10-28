import React from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import checkIcon from '@ingka/ssr-icon/paths/checkmark'
import { getContrastTextColor } from 'utils/color-utils'

require('./ColorSwatch.scss')

const BLACK_COLOR = '#000000'
const INGKA_MULTICOLOR_NAME = 'multicolor'

export type ColorSwatchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'role'> & {
    id: string
    name: string
    hex: string
    count: number
    selected: boolean
    disabled?: boolean
    onToggle: () => void
    onMouseEnter?: React.MouseEventHandler<HTMLElement>
    className?: string
    /**
     * Whether the component should be tabbable (for modal accordions we want to tab through the list,
     * for filter dropdowns from pill buttons we want to use arrow keys to navigate within the list)
     */
    tabbable?: boolean
}

const ColorCircle: React.FC<{
    isMulticolor: boolean
    hex: string
    selected: boolean
    checkIconColor: string
}> = ({ isMulticolor, hex, selected, checkIconColor }) => (
    <div className="ColorSwatch__circle" style={isMulticolor ? {} : { backgroundColor: `#${hex}` }}>
        {selected && <SSRIcon paths={checkIcon} className="ColorSwatch__check" style={{ color: checkIconColor }} />}
    </div>
)

const ColorInfo: React.FC<{ name?: string; count?: number }> = ({ name, count }) => (
    <>
        {name && <span className="ColorSwatch__name">{name}</span>}
        {count !== undefined && <span className="ColorSwatch__count">{count}</span>}
    </>
)

/**
 * A color swatch component that displays a color circle with selection state.
 * Handles multicolor display and automatically calculates contrast for check icons.
 *
 * @param id - Unique identifier for the color option
 * @param name - Display name of the color
 * @param hex - Hex color code (without # prefix, which is what the Ingka API returns)
 * @param count - Number of items available in this color
 * @param selected - Whether this color is currently selected
 * @param disabled - Whether this color option is disabled
 * @param onToggle - Callback function when the color is toggled
 * @param onMouseEnter - Optional mouse enter event handler
 * @param className - Optional additional CSS class name
 * @param tabbable - Whether the component should be tabbable (for modal accordions we want to tab through the list, for filter dropdowns from pill buttons we want to use arrow keys to navigate within the list)
 */
export const ColorSwatch = ({
    id,
    name,
    hex = '000000',
    count,
    selected,
    disabled = false,
    onToggle,
    onMouseEnter,
    className,
    tabbable = false,
    ...props
}: ColorSwatchProps): React.ReactElement => {
    const isMulticolor = name?.toLowerCase() === INGKA_MULTICOLOR_NAME
    // Our multicolor image has white in the middle where the icon needs to be, so default to black
    const checkIconColor = isMulticolor ? BLACK_COLOR : getContrastTextColor(hex)

    return (
        <button
            id={id}
            className={classNames('ColorSwatch__button', className, {
                'ColorSwatch__button--multicolor': isMulticolor,
            })}
            disabled={disabled}
            onMouseEnter={onMouseEnter}
            role="option"
            aria-selected={selected}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => !disabled && onToggle()}
            {...props}
        >
            <ColorCircle isMulticolor={isMulticolor} hex={hex} selected={selected} checkIconColor={checkIconColor} />
            <ColorInfo name={name} count={count} />
        </button>
    )
}

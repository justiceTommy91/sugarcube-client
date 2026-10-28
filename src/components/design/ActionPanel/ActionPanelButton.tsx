/* eslint-disable react/prop-types */
import React from 'react'

type ActionPanelButtonProps = React.HTMLAttributes<HTMLButtonElement> & {
    dataTip: string
    ariaLabel: string
    dataTestId: string
    children: React.ReactNode
    icon: React.ReactNode
    text: string
    spacer?: boolean
    loading?: boolean
}

export const ActionPanelButton = React.forwardRef<HTMLButtonElement, ActionPanelButtonProps>(
    (
        {
            dataTip,
            ariaLabel,
            dataTestId,
            children,
            icon,
            text,
            spacer,
            loading,
            onMouseMove,
            onMouseUp,
            onPointerMove,
            onPointerUp,
            ...props
        },
        ref,
    ) =>
        spacer ? (
            <div className="spacer" />
        ) : (
            <button
                ref={ref}
                {...props}
                onMouseMove={(e) => {
                    e.stopPropagation()
                    onMouseMove?.(e)
                }}
                onMouseUp={(e) => {
                    e.stopPropagation()
                    onMouseUp?.(e)
                }}
                onPointerMove={(e) => {
                    e.stopPropagation()
                    onPointerMove?.(e)
                }}
                onPointerUp={(e) => {
                    e.stopPropagation()
                    onPointerUp?.(e)
                }}
                data-tip={dataTip}
                aria-label={ariaLabel}
                data-test-id={dataTestId}
                aria-disabled={loading ? true : undefined}
                aria-busy={loading ? true : undefined}
                aria-live={loading ? 'polite' : undefined}
                onClick={(e) => {
                    if (loading) {
                        e.stopPropagation()
                        return
                    }
                    props.onClick?.(e)
                }}
            >
                {loading ? (
                    <span className="actionPanelButtonLoader" role="status" aria-live="polite" />
                ) : (
                    children || (
                        <>
                            {icon}
                            <span className="actionPanelButtonText">{text.trim()}</span>
                        </>
                    )
                )}
            </button>
        ),
)

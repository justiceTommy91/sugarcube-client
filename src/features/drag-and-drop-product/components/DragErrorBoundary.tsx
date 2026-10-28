/* eslint-disable i18next/no-literal-string */ // CSS properties use inline styles (required for error boundary isolation without SCSS) and internal strings don't need translation
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable react/no-unused-state */
/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { Component } from 'react'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { DragErrorState } from '../types/dragTypes'

// Default fallback component - moved before the main component
const DefaultDragErrorFallback = ({ error, retry }: { error?: Error; retry: () => void }) => {
    const { t } = useTranslation()

    const containerStyle: React.CSSProperties = {
        padding: '16px',
        border: '2px dashed #f44336',
        borderRadius: '8px',
        backgroundColor: '#ffebee',
        color: '#c62828',
        textAlign: 'center',
        fontSize: '14px',
        maxWidth: '300px',
        margin: '8px auto',
    }

    const buttonStyle: React.CSSProperties = {
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        marginTop: '8px',
    }

    return (
        <div style={containerStyle}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>⚠️ {t('dragDrop.error.operationFailed')}</div>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                {error?.message || t('dragDrop.error.unexpectedError')}
            </div>
            <button
                type="button"
                onClick={retry}
                style={buttonStyle}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#d32f2f'
                }}
                onFocus={(e) => {
                    e.currentTarget.style.backgroundColor = '#d32f2f'
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f44336'
                }}
                onBlur={(e) => {
                    e.currentTarget.style.backgroundColor = '#f44336'
                }}
            >
                {t('dragDrop.error.tryAgain')}
            </button>
        </div>
    )
}

interface DragErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface DragErrorBoundaryState extends DragErrorState {
    retryCount: number
}

class DragErrorBoundary extends Component<DragErrorBoundaryProps, DragErrorBoundaryState> {
    private maxRetries = 3

    constructor(props: DragErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            retryCount: 0,
        }
    }

    static getDerivedStateFromError(error: Error): Partial<DragErrorBoundaryState> {
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState((prevState) => ({
            ...prevState,
            errorInfo,
        }))

        // Log error for debugging
        // eslint-disable-next-line no-console
        console.error('Drag operation error:', error, errorInfo)

        // Log to Sentry with drag operation context
        Sentry.captureException(error, {
            contexts: {
                dragOperation: {
                    component: 'DragErrorBoundary',
                    errorInfo: errorInfo.componentStack,
                    retryCount: this.state.retryCount,
                    maxRetries: this.maxRetries,
                },
            },
        })

        // Call custom error handler
        this.props.onError?.(error, errorInfo)
    }

    private handleRetry = () => {
        if (this.state.retryCount < this.maxRetries) {
            this.setState((prevState) => ({
                hasError: false,
                error: undefined,
                errorInfo: undefined,
                retryCount: prevState.retryCount + 1,
            }))
        }
    }

    render() {
        if (this.state.hasError) {
            const { fallback: FallbackComponent } = this.props

            if (FallbackComponent && this.state.error) {
                return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
            }

            // Default fallback UI
            return <DefaultDragErrorFallback error={this.state.error} retry={this.handleRetry} />
        }

        return this.props.children
    }
}

export default DragErrorBoundary

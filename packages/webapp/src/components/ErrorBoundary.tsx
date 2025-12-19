/**
 * Error Boundary component for catching and displaying React errors.
 * 
 * Provides a user-friendly error UI when components throw errors,
 * preventing the entire application from crashing.
 */

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, PageCard } from './ui'
import { logger } from '../lib/utils/logger'

/**
 * Props for ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** Child components to render. */
  children: ReactNode
  
  /** Optional fallback UI to show on error. */
  fallback?: ReactNode
  
  /** Optional callback when error occurs. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * State for ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred. */
  hasError: boolean
  
  /** The error that occurred. */
  error: Error | null
  
  /** Error information from React. */
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component for catching React errors.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  /**
   * Updates state when an error is caught.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  /**
   * Called when an error is caught.
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error to console in development
    logger.error('ErrorBoundary caught an error', { error, errorInfo })
  }

  /**
   * Resets error state.
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  /**
   * Renders error UI or children.
   */
  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <PageCard className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-[hsl(var(--destructive))] mb-4" />
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
            Noget gik galt
          </h2>
          <p className="text-sm text-[hsl(var(--muted))] mb-6 max-w-md">
            Der opstod en uventet fejl. Prøv at opdatere siden eller kontakt support hvis problemet fortsætter.
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <details className="w-full max-w-2xl mb-6 text-left">
              <summary className="cursor-pointer text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Tekniske detaljer (kun i udvikling)
              </summary>
              <div className="p-4 bg-[hsl(var(--surface-2))] rounded-lg text-xs font-mono overflow-auto">
                <div className="mb-2">
                  <strong className="text-[hsl(var(--destructive))]">Error:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div className="mt-4">
                    <strong className="text-[hsl(var(--destructive))]">Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-words">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={this.handleReset}
            >
              Prøv igen
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Opdater side
            </Button>
          </div>
        </PageCard>
      )
    }

    return this.props.children
  }
}


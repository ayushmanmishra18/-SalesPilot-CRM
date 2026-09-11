import React from 'react'
import { Button } from './index'

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
          <div className="text-3xl">⚠️</div>
          <div className="text-center">
            <div className="font-semibold text-[var(--text)] mb-1">Something went wrong</div>
            <div className="text-[12px] text-[var(--text-3)] max-w-sm">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

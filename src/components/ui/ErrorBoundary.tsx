import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-base font-semibold text-foreground mb-1">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
        >
          Reload page
        </button>
      </div>
    )
  }
}

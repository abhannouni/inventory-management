import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import i18n from '../../i18n';
import Button from '../ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort net for render/lifecycle errors anywhere below it. Without this,
 * a single uncaught error unmounts the whole React tree and leaves a blank
 * white page — the worst possible outcome for someone on their phone in a
 * store. Wraps the entire app in `App.tsx` so the sidebar/header chrome
 * doesn't need its own boundary to stay reachable after a crash.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBackHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="module-soon" style={{ maxWidth: 480 }}>
          <div className="module-soon-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="module-soon-title">{i18n.t('errorBoundary.title', { ns: 'common' })}</div>
          <div className="module-soon-subtitle">{i18n.t('errorBoundary.message', { ns: 'common' })}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="outline" onClick={this.handleBackHome}>
              {i18n.t('errorBoundary.backHome', { ns: 'common' })}
            </Button>
            <Button variant="primary" onClick={this.handleReload}>
              {i18n.t('errorBoundary.reload', { ns: 'common' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

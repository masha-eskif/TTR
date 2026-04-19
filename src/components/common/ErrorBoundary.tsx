import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown): void {
    console.error('[ttr] uncaught error:', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen">
        <h1 className="screen__title">Что-то сломалось</h1>
        <p className="muted">
          Произошла ошибка. Подробности в консоли (F12).
        </p>
        <pre
          style={{
            background: 'var(--bg-card)',
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 200,
            border: '1px solid var(--line-soft)',
          }}
        >
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </pre>
        <button
          type="button"
          className="btn btn--primary mt-md"
          onClick={() => {
            this.reset();
            location.reload();
          }}
        >
          Перезагрузить
        </button>
      </div>
    );
  }
}

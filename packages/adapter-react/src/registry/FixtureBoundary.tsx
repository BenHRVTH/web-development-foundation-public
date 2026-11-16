import { Component, type ErrorInfo, type ReactNode } from 'react';
export interface FixtureBoundaryProps {
  componentId: string;
  fixtureId: string;
  children: ReactNode;
  onError?:
    | ((diagnostic: {
        componentId: string;
        fixtureId: string;
        message: string;
        componentStack: string;
      }) => void)
    | undefined;
}
/** Key by componentId/fixtureId when changing fixture. No Studio or preview transport. */
export class FixtureBoundary extends Component<
  FixtureBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.({
      componentId: this.props.componentId,
      fixtureId: this.props.fixtureId,
      message: error.message,
      componentStack: info.componentStack ?? '',
    });
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        Nem jeleníthető meg: {this.props.componentId} / {this.props.fixtureId}.
        Ellenőrizd a komponens implementációját.
      </p>
    ) : (
      this.props.children
    );
  }
}

import React, { Component, ErrorInfo, ReactNode } from "react";
import styled from "styled-components";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const Overlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-base, #0d0d10);
  color: var(--text-main, #fafafa);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  padding: 40px;
  box-sizing: border-box;
`;

const ErrorContainer = styled.div`
  max-width: 800px;
  width: 100%;
  background-color: var(--bg-panel, #141417);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  color: #ef4444;
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  font-family: "Fira Code", monospace;
  background-color: var(--bg-header, #18181b);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #27272a);
  margin-bottom: 24px;
  color: #fca5a5;
  overflow-x: auto;
  font-size: 14px;
`;

const StackTrace = styled.pre`
  font-family: "Fira Code", monospace;
  background-color: var(--bg-header, #18181b);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #27272a);
  color: var(--text-muted, #71717a);
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  max-height: 300px;
  overflow-y: auto;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--border-color, #27272a);
  color: var(--text-main, #fafafa);
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 24px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3f3f46;
  }
`;

export class GlobalErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <Overlay>
          <ErrorContainer>
            <Header>
              <AlertCircle size={32} />
              <Title>The application encountered an unexpected error</Title>
            </Header>

            <p style={{ color: '#aaaaaa', marginBottom: '16px' }}>
              Atlas Studio ran into a problem and could not continue executing the UI.
              You can try reloading the editor to recover.
            </p>

            {this.state.error && (
              <ErrorMessage>
                {this.state.error.toString()}
              </ErrorMessage>
            )}

            {this.state.errorInfo && (
              <StackTrace>
                {this.state.errorInfo.componentStack}
              </StackTrace>
            )}

            <Button onClick={this.handleReload}>
              <RefreshCw size={16} />
              Reload Editor
            </Button>
          </ErrorContainer>
        </Overlay>
      );
    }

    return this.props.children;
  }
}

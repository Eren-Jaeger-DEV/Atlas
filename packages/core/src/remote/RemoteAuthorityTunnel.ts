/**
 * @atlas/core — RemoteAuthorityTunnel
 *
 * [STUB] Not yet connected to any real transport.
 * connect() does NOT open an SSH connection, socket, or IPC stream — it
 * generates a local tunnel ID and returns success unconditionally.
 * The class shape is preserved here for future real implementation
 * (SSH child-process spawn, WebSocket framing, WSL IPC).
 * Do not treat a successful connect() as proof of an active remote session.
 */

export type RemoteAuthorityType = "ssh" | "wsl" | "devcontainer";

export interface RemoteConnectionConfig {
  authority: RemoteAuthorityType;
  host: string;
  port: number;
  username?: string;
  remoteWorkspacePath: string;
}

export class RemoteAuthorityTunnel {
  private config: RemoteConnectionConfig;
  private connected = false;
  private activeTunnelId?: string | undefined;

  constructor(config: RemoteConnectionConfig) {
    this.config = config;
  }

  /**
   * [STUB] Does not open a real connection.
   * Sets connected = true and generates a local tunnel ID.
   * Replace with real SSH spawn / WebSocket handshake when implementing.
   */
  public async connect(): Promise<boolean> {
    this.activeTunnelId = `tunnel-${this.config.authority}-${Date.now()}`;
    this.connected = true;
    return true;
  }

  /**
   * Close the remote tunnel connection.
   */
  public disconnect(): void {
    this.connected = false;
    this.activeTunnelId = undefined;
  }

  /**
   * Check connection status.
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get active tunnel metadata.
   */
  public getTunnelDetails(): { tunnelId?: string | undefined; authority: RemoteAuthorityType; host: string } {
    return {
      tunnelId: this.activeTunnelId,
      authority: this.config.authority,
      host: `${this.config.username ? this.config.username + "@" : ""}${this.config.host}:${this.config.port}`,
    };
  }
}

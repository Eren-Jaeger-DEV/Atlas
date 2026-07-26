/**
 * @atlas/core \u2014 McpOAuthGateway
 *
 * [STUB] Credential cache for MCP server tokens, NOT a full OAuth 2.0 gateway.
 * Current implementation: stores/retrieves/expires tokens in a Map, and injects
 * Authorization Bearer headers into HTTP/SSE MCP transport calls.
 *
 * NOT yet implemented (required for a real OAuth 2.0 PKCE gateway):
 *   - Authorization URL construction with code_challenge
 *   - Authorization code exchange for access + refresh tokens
 *   - Automatic token refresh on expiry
 *   - PKCE verifier persistence
 *
 * The class shape is preserved here for future real implementation.
 * Do not rely on this as a security boundary for sensitive MCP servers.
 */

export interface McpOAuthCredentials {
  serverId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

export class McpOAuthGateway {
  private tokens: Map<string, McpOAuthCredentials> = new Map();

  /**
   * Store credentials for an MCP server instance.
   */
  public setCredentials(serverId: string, creds: Omit<McpOAuthCredentials, "serverId">): McpOAuthCredentials {
    const fullCreds: McpOAuthCredentials = { serverId, ...creds };
    this.tokens.set(serverId, fullCreds);
    return fullCreds;
  }

  /**
   * Get valid active credentials for an MCP server instance.
   */
  public getCredentials(serverId: string): McpOAuthCredentials | undefined {
    const creds = this.tokens.get(serverId);
    if (!creds) return undefined;

    // Check if token has expired
    if (Date.now() >= creds.expiresAt) {
      return undefined; // Token expired
    }
    return creds;
  }

  /**
   * Intercept and inject Authorization Bearer headers for HTTP/SSE MCP transport calls.
   */
  public injectAuthHeaders(serverId: string, headers: Record<string, string> = {}): Record<string, string> {
    const creds = this.getCredentials(serverId);
    if (!creds) return headers;

    return {
      ...headers,
      Authorization: `${creds.tokenType || "Bearer"} ${creds.accessToken}`,
      "X-Atlas-MCP-Gateway": "v1.0",
    };
  }

  /**
   * Revoke credentials for a server.
   */
  public revoke(serverId: string): boolean {
    return this.tokens.delete(serverId);
  }
}

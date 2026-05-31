/**
 * Pluggable authentication for the MCP server transport.
 *
 * AuthProvider is called before each request reaches the MCP transport.
 * Return undefined to allow the request through, or a Response to reject it.
 *
 * Implementations:
 * - StaticTokenAuthProvider — shared bearer token from an environment variable
 *   (simple, suitable for personal/team deployments)
 *
 * Worker deployments wire an AuthProvider in worker.ts.
 * Stdio mode doesn't need one (local process, no network boundary).
 */

/**
 * Authentication gate for incoming MCP requests.
 *
 * Called once per request before the MCP transport processes it.
 * Return undefined to allow; return a Response (typically 401 or 403)
 * to reject.
 */
export interface AuthProvider {
    /**
     * Inspect the incoming request and decide whether to allow it.
     * @returns undefined to allow, or a Response to reject with.
     */
    validate(request: Request): Promise<Response | undefined>;
}

/**
 * Static bearer token authentication.
 *
 * Compares the Authorization header against a single shared token.
 * Uses constant-time comparison to prevent timing attacks.
 */
export class StaticTokenAuthProvider implements AuthProvider {
    private readonly expectedToken: string;

    constructor(token: string) {
        this.expectedToken = token;
    }

    validate(request: Request): Promise<Response | undefined> {
        const header = request.headers.get("Authorization");
        if (header === null) {
            return Promise.resolve(
                unauthorized("Missing Authorization header")
            );
        }

        const match = /^Bearer\s+(.+)$/i.exec(header);
        if (match === null) {
            return Promise.resolve(
                unauthorized("Invalid Authorization header format")
            );
        }

        const token = match[1] ?? "";
        if (token === "" || !constantTimeEqual(token, this.expectedToken)) {
            return Promise.resolve(unauthorized("Invalid token"));
        }

        return Promise.resolve(undefined);
    }
}

function unauthorized(message: string): Response {
    return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: {
            "content-type": "application/json",
            "WWW-Authenticate": 'Bearer realm="mcp-wayback-machine"',
        },
    });
}

/**
 * Constant-time string comparison to prevent timing side-channels.
 */
function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// api.js
//
// Thin fetch wrapper: attaches the session token, and surfaces the
// structured error codes the backend uses (PASSWORD_CHANGE_REQUIRED,
// NO_ACTIVE_COMPANY) so the app shell can react to them.

const BASE = '/api';

export class ApiError extends Error {
    constructor(status, body) {
        super(body?.error || `Request failed (${status})`);
        this.status = status;
        this.body = body;
    }
}

export function createApiClient(getToken, onUnauthorized) {
    async function request(path, options = {}) {
        // getToken() is non-null only for pre-auth MFA calls (Bearer).
        // All regular authenticated calls use the httpOnly grc_session cookie.
        const token = getToken?.();
        const headers = {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        // credentials:'include' ensures the httpOnly cookie is sent on
        // same-site and cross-origin requests (e.g. local dev on a different port).
        const res = await fetch(BASE + path, { ...options, headers, credentials: 'include' });
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const body = isJson ? await res.json().catch(() => null) : null;

        if (res.status === 401) {
            onUnauthorized?.();
            throw new ApiError(res.status, body);
        }
        if (!res.ok) {
            throw new ApiError(res.status, body);
        }
        return body;
    }

    return {
        get: (path) => request(path),
        post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
        put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
        patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
        delete: (path, data) => request(path, { method: 'DELETE', ...(data ? { body: JSON.stringify(data) } : {}) }),
        // Fire-and-forget POST that's guaranteed to actually reach the server
        // even if the page/window is torn down immediately after (keepalive
        // survives navigation/close, unlike a plain fetch). Used for logout
        // in the standalone Dock window, where we call window.close() right
        // after firing this -- without keepalive the request gets aborted
        // mid-flight and the server never clears the session/cookie.
        postBeacon: (path) => {
            const token = getToken?.();
            fetch(BASE + path, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            }).catch(() => {});
        },
        // For CSV downloads (H1 templates, H6 exports) -- returns the raw
        // response so the caller can trigger a browser download.
        getBlob: async (path) => {
            const token = getToken?.();
            const res = await fetch(BASE + path, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.status === 401) {
                onUnauthorized?.();
                throw new ApiError(res.status, null);
            }
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new ApiError(res.status, body);
            }
            const disposition = res.headers.get('content-disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            return { blob: await res.blob(), filename: match ? match[1] : 'download.csv' };
        },
    };
}

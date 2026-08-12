// ---------------------------------------------------------------------------
// Google Identity Services — client-side OAuth token flow (no server needed)
// ---------------------------------------------------------------------------
// Tokens are kept in memory only (not persisted) to avoid storing sensitive
// values in localStorage. On page reload the user must re-authenticate, but
// the token lasts ~1 hour so a single page session is fine.
// ---------------------------------------------------------------------------

interface GISTokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface GISTokenClient {
  requestAccessToken(): void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string
            scope: string
            callback: (resp: GISTokenResponse) => void
            error_callback?: (err: { type: string }) => void
          }): GISTokenClient
          revoke(token: string, done: () => void): void
        }
      }
    }
  }
}

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ')

let _token: string | null = null
let _expiresAt = 0

// Load the GIS script once on demand.
let _gisPromise: Promise<void> | null = null
export function loadGIS(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  if (_gisPromise) return _gisPromise
  _gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return _gisPromise
}

/**
 * Trigger the Google OAuth popup. Resolves with an access token.
 * Throws if the user closes the popup or denies permission.
 */
export async function signIn(clientId: string): Promise<string> {
  await loadGIS()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(`${resp.error}: ${resp.error_description ?? 'OAuth error'}`))
        } else {
          _token = resp.access_token
          // expires_in is in seconds; subtract a 30s buffer
          _expiresAt = Date.now() + (resp.expires_in - 30) * 1000
          resolve(resp.access_token)
        }
      },
      error_callback: (err) => {
        // popup_closed_by_user etc.
        reject(new Error(err.type ?? 'OAuth cancelled'))
      },
    })
    client.requestAccessToken()
  })
}

/** Revoke the current token and clear in-memory state. */
export function signOut(): void {
  if (_token && window.google?.accounts) {
    window.google.accounts.oauth2.revoke(_token, () => {})
  }
  _token = null
  _expiresAt = 0
}

/** Returns the live access token, or null if expired / not signed in. */
export function getToken(): string | null {
  if (!_token || Date.now() >= _expiresAt) {
    _token = null
    return null
  }
  return _token
}

export function isSignedIn(): boolean {
  return !!getToken()
}

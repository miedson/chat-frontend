let refreshingPromise: Promise<boolean> | null = null
let refreshUnauthorized = false
let redirectingToLogin = false

async function refreshSession(): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => {
        refreshUnauthorized = response.status === 401 || response.status === 403
        return response.ok
      })
      .catch(() => {
        refreshUnauthorized = false
        return false
      })
      .finally(() => {
        refreshingPromise = null
      })
  }

  return refreshingPromise
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  })

  if (response.status !== 401) {
    return response
  }

  const refreshed = await refreshSession()

  if (!refreshed) {
    if (
      typeof window !== 'undefined' &&
      refreshUnauthorized &&
      !window.location.pathname.startsWith('/login') &&
      !redirectingToLogin
    ) {
      redirectingToLogin = true
      window.location.assign('/login')
    }

    return response
  }

  const retriedResponse = await fetch(input, {
    ...init,
    credentials: 'include',
  })

  if (retriedResponse.ok) {
    redirectingToLogin = false
  }

  return retriedResponse
}

export function resolveEarlyAccessUrl(configuredValue: string | undefined) {
  const configuredUrl = configuredValue?.trim()

  if (!configuredUrl) {
    return null
  }

  try {
    const url = new URL(configuredUrl)
    const isLocalHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')

    return url.protocol === 'https:' || isLocalHttp ? url.toString() : null
  } catch {
    return null
  }
}

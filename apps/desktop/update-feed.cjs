'use strict'

// Historical native URLs are a compatibility layout, not a channel registry.
/** @param {string} channel @param {boolean} light */
function darwinFeed(channel, light = false) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(channel) || channel.length > 32 ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(channel)) {
    throw new TypeError('Invalid channel name')
  }
  return {
    directory: `releases/darwin/${light ? 'light/' : ''}${channel}`,
    channel,
    fileName: `${channel}-mac.yml`,
    allowPrerelease: channel !== 'stable'
  }
}

// The feed is baked into app-update.yml, so require a canonical HTTPS base.
// A trailing slash is tolerated; credentials, query, and fragment are not.
/** @param {string | undefined} raw @returns {string | undefined} */
function feedBaseUrl(raw) {
  if (raw === undefined || raw === '') return undefined
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new TypeError(`updateFeedUrl is not a URL: ${raw}`)
  }
  const canonical = url.origin + url.pathname.replace(/\/+$/, '')
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || canonical !== raw.replace(/\/+$/, '')) {
    throw new TypeError(`updateFeedUrl must be a canonical https base (got ${raw}, expected ${canonical})`)
  }
  return canonical
}

module.exports = { darwinFeed, feedBaseUrl }

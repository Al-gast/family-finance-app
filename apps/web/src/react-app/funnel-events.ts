export const funnelEventNames = [
  'landing_view',
  'demo_start',
  'demo_complete',
  'early_access_click',
] as const

export type FunnelEventName = (typeof funnelEventNames)[number]
export type FunnelEventSink = (eventName: FunnelEventName) => void

export function createFunnelTracker(sink: FunnelEventSink) {
  const emittedOnce = new Set<FunnelEventName>()

  return {
    track(eventName: FunnelEventName, once = false) {
      if (once && emittedOnce.has(eventName)) {
        return
      }

      // The event name is intentionally the entire analytics contract. Never
      // add calculator values, product names, user identifiers, or URL data.
      sink(eventName)

      if (once) {
        emittedOnce.add(eventName)
      }
    },
  }
}

const browserTracker = createFunnelTracker((eventName) => {
  window.dispatchEvent(new Event(eventName))
})

export function trackFunnelEvent(eventName: FunnelEventName, once = false) {
  browserTracker.track(eventName, once)
}

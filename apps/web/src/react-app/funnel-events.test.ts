import { describe, expect, it, vi } from 'vitest'
import { createFunnelTracker, funnelEventNames } from './funnel-events'

describe('funnel events', () => {
  it('supports only the approved event names', () => {
    expect(funnelEventNames).toEqual([
      'landing_view',
      'demo_start',
      'demo_complete',
      'early_access_click',
    ])
  })

  it('emits only an event name and no financial payload', () => {
    const sink = vi.fn()
    const tracker = createFunnelTracker(sink)

    tracker.track('demo_complete')

    expect(sink).toHaveBeenCalledWith('demo_complete')
    expect(sink.mock.calls[0]).toHaveLength(1)
  })

  it('can suppress duplicate one-time funnel steps', () => {
    const sink = vi.fn()
    const tracker = createFunnelTracker(sink)

    tracker.track('demo_start', true)
    tracker.track('demo_start', true)

    expect(sink).toHaveBeenCalledTimes(1)
  })
})

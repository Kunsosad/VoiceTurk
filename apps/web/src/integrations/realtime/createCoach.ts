import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'
import { MockRealtimeCoachClient } from './MockRealtimeCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export function createCoach(): RealtimeCoachClient {
  return 'speechSynthesis' in window ? new BrowserTTSCoachClient() : new MockRealtimeCoachClient()
}

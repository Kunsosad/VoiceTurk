import { AgoraRealtimeCoachClient } from './AgoraRealtimeCoachClient'
import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'
import { MockRealtimeCoachClient } from './MockRealtimeCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export function createCoach(): RealtimeCoachClient {
  const provider = import.meta.env.VITE_REALTIME_PROVIDER ?? import.meta.env.NEXT_PUBLIC_REALTIME_PROVIDER
  if (provider === 'agora') return new AgoraRealtimeCoachClient()
  if ('speechSynthesis' in window) return new BrowserTTSCoachClient()
  return new MockRealtimeCoachClient()
}

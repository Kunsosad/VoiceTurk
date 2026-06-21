import { AgoraRealtimeCoachClient } from './AgoraRealtimeCoachClient'
import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'
import type { RealtimeInfo } from '../../types/domain'

export function createCoach(provider?: RealtimeInfo['provider']): RealtimeCoachClient {
  if (provider === 'browser_tts') return new BrowserTTSCoachClient()
  if (provider === 'agora' || provider === 'agora_convoai') return new AgoraRealtimeCoachClient()
  // Provider is selected from backend session data at join time.
  return new AgoraRealtimeCoachClient()
}

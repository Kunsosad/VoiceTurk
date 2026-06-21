import { AgoraRealtimeCoachClient } from './AgoraRealtimeCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export function createCoach(): RealtimeCoachClient {
  // Backend session data is the provider source of truth. The hybrid Agora adapter
  // joins RTC only when the backend supplies Agora credentials and otherwise uses TTS.
  return new AgoraRealtimeCoachClient()
}

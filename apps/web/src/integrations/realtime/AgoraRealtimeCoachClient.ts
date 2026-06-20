import type { RecordingItem } from '../../types/domain'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

// Stable boundary for a future Agora adapter. It deliberately has no SDK dependency in the local MVP.
export class AgoraRealtimeCoachClient implements RealtimeCoachClient {
  join = async (_input: {session_id: string}) => { throw new Error('Agora adapter is not configured') }
  speak = async (_message: string) => {}
  setCurrentTaskContext = (_context: RecordingItem) => {}
  leave = async () => {}
}

import type { RecordingItem } from '../../types/domain'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export class MockRealtimeCoachClient implements RealtimeCoachClient {
  join = async () => {}
  speak = async (_message: string) => {}
  setCurrentTaskContext = (_context: RecordingItem) => {}
  leave = async () => {}
}

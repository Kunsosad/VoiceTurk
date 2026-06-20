import type { RecordingItem } from '../../types/domain'

export interface RealtimeCoachClient {
  join(input: {session_id: string}): Promise<void>
  speak(message: string): Promise<void>
  setCurrentTaskContext(context: RecordingItem): void
  leave(): Promise<void>
}

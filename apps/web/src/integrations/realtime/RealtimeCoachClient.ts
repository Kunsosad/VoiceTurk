import type { RecordingItem, RealtimeInfo } from '../../types/domain'

export type Unsubscribe = () => void
export interface RealtimeCoachClient {
  joinSession(input: {session_id: string; realtime: RealtimeInfo}): Promise<void>
  leaveSession(): Promise<void>
  setCurrentTaskContext(context: RecordingItem): void
  speak(message: string): Promise<void>
  stopSpeaking(): void
  onUserSpeechStart(callback: () => void): Unsubscribe
  onUserSpeechEnd(callback: () => void): Unsubscribe
  onMicLevel(callback: (level: number) => void): Unsubscribe
  onMicMuted(callback: (muted: boolean) => void): Unsubscribe
  onConnectionStateChange(callback: (state: string) => void): Unsubscribe
}

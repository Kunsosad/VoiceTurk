import type { FeedbackContext, RecordingItem, RealtimeInfo } from '../../types/domain'

export type Unsubscribe = () => void
export type CoachJoinResult = {
  transport: 'agora_rtc' | 'browser'
  rtcJoined: boolean
  micPublished: boolean
  voiceProvider: 'agora_convoai' | 'browser_tts' | 'browser_tts_fallback' | 'text_only'
}
export interface RealtimeCoachClient {
  joinSession(input: {session_id: string; realtime: RealtimeInfo}): Promise<CoachJoinResult>
  leaveSession(): Promise<void>
  setCurrentTaskContext(context: RecordingItem): void
  speak(message: string): Promise<void>
  speakFeedback(message: string, context?: FeedbackContext | null): Promise<void>
  stopSpeaking(): void
  onUserSpeechStart(callback: () => void): Unsubscribe
  onUserSpeechEnd(callback: () => void): Unsubscribe
  onMicLevel(callback: (level: number) => void): Unsubscribe
  onMicMuted(callback: (muted: boolean) => void): Unsubscribe
  onConnectionStateChange(callback: (state: string) => void): Unsubscribe
}

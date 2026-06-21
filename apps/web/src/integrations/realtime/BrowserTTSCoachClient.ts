import type { FeedbackContext, RecordingItem } from '../../types/domain'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export class BrowserTTSCoachClient implements RealtimeCoachClient {
  joinSession = async () => ({transport: 'browser' as const, rtcJoined: false, micPublished: false,
    voiceProvider: ('speechSynthesis' in window ? 'browser_tts' : 'text_only') as 'browser_tts' | 'text_only'})
  leaveSession = async () => this.stopSpeaking()
  setCurrentTaskContext = (_context: RecordingItem) => {}
  stopSpeaking = () => window.speechSynthesis?.cancel()
  speak = (message: string) => new Promise<void>(resolve => {
    if (!('speechSynthesis' in window)) return resolve()
    this.stopSpeaking()
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'vi-VN'; utterance.onend = () => resolve(); utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
  speakFeedback = (message: string, _context?: FeedbackContext | null) => this.speak(message)
  onUserSpeechStart = (_callback: () => void) => () => {}
  onUserSpeechEnd = (_callback: () => void) => () => {}
  onMicLevel = (_callback: (level: number) => void) => () => {}
  onMicMuted = (_callback: (muted: boolean) => void) => () => {}
  onConnectionStateChange = (_callback: (state: string) => void) => () => {}
}

import type { RecordingItem } from '../../types/domain'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export class BrowserTTSCoachClient implements RealtimeCoachClient {
  join = async () => {}
  setCurrentTaskContext = (_context: RecordingItem) => {}
  leave = async () => { window.speechSynthesis?.cancel() }
  speak = async (message: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'vi-VN'
    window.speechSynthesis.speak(utterance)
  }
}

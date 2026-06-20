import AgoraRTC, { type IAgoraRTCClient, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import type { RecordingItem } from '../../types/domain'
import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export class AgoraRealtimeCoachClient implements RealtimeCoachClient {
  private client: IAgoraRTCClient = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'})
  private mic?: IMicrophoneAudioTrack
  private meter?: number
  private tts = new BrowserTTSCoachClient()
  private speechStart = new Set<() => void>(); private speechEnd = new Set<() => void>()
  private micLevels = new Set<(level: number) => void>(); private micMuted = new Set<(muted: boolean) => void>()
  private connection = new Set<(state: string) => void>(); private speaking = false

  constructor() {
    this.client.on('connection-state-change', state => this.connection.forEach(callback => callback(state)))
  }
  async joinSession({realtime}: Parameters<RealtimeCoachClient['joinSession']>[0]) {
    if (realtime.provider !== 'agora' || !realtime.agora_app_id || !realtime.agora_channel) {
      this.connection.forEach(callback => callback('FALLBACK_BROWSER_TTS')); return
    }
    try {
      await this.client.join(realtime.agora_app_id, realtime.agora_channel, realtime.agora_token, realtime.uid)
      this.mic = await AgoraRTC.createMicrophoneAudioTrack({encoderConfig: 'speech_standard'})
      await this.client.publish([this.mic])
    } catch {
      this.connection.forEach(callback => callback('FALLBACK_BROWSER_TTS')); return
    }
    this.meter = window.setInterval(() => {
      const level = this.mic?.getVolumeLevel() ?? 0
      this.micLevels.forEach(callback => callback(level))
      const next = level > 0.02
      if (next !== this.speaking) {
        this.speaking = next
        ;(next ? this.speechStart : this.speechEnd).forEach(callback => callback())
      }
      this.micMuted.forEach(callback => callback(Boolean(this.mic?.muted)))
    }, 150)
  }
  async leaveSession() { if (this.meter) clearInterval(this.meter); this.mic?.stop(); this.mic?.close(); await this.client.leave(); this.stopSpeaking() }
  setCurrentTaskContext = (_context: RecordingItem) => {}
  speak = (message: string) => this.tts.speak(message)
  stopSpeaking = () => this.tts.stopSpeaking()
  onUserSpeechStart = (callback: () => void) => this.subscribe(this.speechStart, callback)
  onUserSpeechEnd = (callback: () => void) => this.subscribe(this.speechEnd, callback)
  onMicLevel = (callback: (level: number) => void) => this.subscribe(this.micLevels, callback)
  onMicMuted = (callback: (muted: boolean) => void) => this.subscribe(this.micMuted, callback)
  onConnectionStateChange = (callback: (state: string) => void) => this.subscribe(this.connection, callback)
  private subscribe<T>(set: Set<T>, callback: T) { set.add(callback); return () => set.delete(callback) }
}

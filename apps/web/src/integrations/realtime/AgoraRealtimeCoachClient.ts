import AgoraRTC, { type IAgoraRTCClient, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import { api } from '../../features/api'
import type { FeedbackContext, RecordingItem } from '../../types/domain'
import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export class AgoraRealtimeCoachClient implements RealtimeCoachClient {
  private client: IAgoraRTCClient = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'})
  private mic?: IMicrophoneAudioTrack
  private meter?: number
  private tts = new BrowserTTSCoachClient()
  private sessionId?: string
  private expectedAgentUid?: string
  private agentReady = false
  private initialGreetingPending = false
  private agentWaiters = new Set<(ready: boolean) => void>()
  private speechStart = new Set<() => void>(); private speechEnd = new Set<() => void>()
  private micLevels = new Set<(level: number) => void>(); private micMuted = new Set<(muted: boolean) => void>()
  private connection = new Set<(state: string) => void>(); private speaking = false

  constructor() {
    this.client.on('connection-state-change', state => this.emit(state))
    this.client.on('user-joined', user => {
      if (!this.expectedAgentUid || String(user.uid) !== this.expectedAgentUid) return
      this.agentReady = true
      this.initialGreetingPending = true
      this.emit('AGENT_READY')
      this.agentWaiters.forEach(resolve => resolve(true)); this.agentWaiters.clear()
    })
    this.client.on('user-left', user => {
      if (this.expectedAgentUid && String(user.uid) === this.expectedAgentUid) {
        this.agentReady = false; this.emit('AGENT_LEFT_FALLBACK')
      }
    })
    this.client.on('user-published', async (user, mediaType) => {
      if (mediaType !== 'audio') return
      await this.client.subscribe(user, mediaType)
      user.audioTrack?.play()
      this.emit('REMOTE_AUDIO_SUBSCRIBED')
    })
  }

  async joinSession({session_id, realtime}: Parameters<RealtimeCoachClient['joinSession']>[0]) {
    const usesAgora = realtime.provider === 'agora' || realtime.provider === 'agora_convoai'
    if (!usesAgora || !realtime.agora_app_id || !realtime.agora_channel) {
      this.emit('FALLBACK_BROWSER_TTS')
      return {transport: 'browser' as const, rtcJoined: false, micPublished: false,
        voiceProvider: 'browser_tts' as const}
    }
    this.sessionId = session_id
    this.expectedAgentUid = realtime.agora_agent_uid ?? undefined
    this.emit('CONNECTING')
    try {
      await this.client.join(realtime.agora_app_id, realtime.agora_channel, realtime.agora_token, realtime.uid)
      this.mic = await AgoraRTC.createMicrophoneAudioTrack({encoderConfig: 'speech_standard'})
      await this.client.publish([this.mic])
      this.emit('CONNECTED_MIC_PUBLISHED')
    } catch {
      await this.cleanupRtc()
      this.emit('ERROR_FALLBACK')
      return {transport: 'browser' as const, rtcJoined: false, micPublished: false,
        voiceProvider: 'browser_tts_fallback' as const}
    }
    this.startMeter()
    if (realtime.provider === 'agora_convoai' && realtime.convoai_available) {
      const ready = this.agentReady || await this.waitForAgent(8000)
      if (ready) return {transport: 'agora_rtc' as const, rtcJoined: true, micPublished: true,
        voiceProvider: 'agora_convoai' as const}
      this.emit('AGENT_TIMEOUT_FALLBACK')
    }
    return {transport: 'agora_rtc' as const, rtcJoined: true, micPublished: true,
      voiceProvider: 'browser_tts_fallback' as const}
  }

  async leaveSession() {
    if (this.sessionId) await api.stopCoach(this.sessionId).catch(() => undefined)
    await this.cleanupRtc(); this.stopSpeaking()
    this.sessionId = undefined; this.expectedAgentUid = undefined; this.agentReady = false
  }

  setCurrentTaskContext = (_context: RecordingItem) => {}

  async speak(message: string) {
    if (this.agentReady && this.sessionId) {
      if (this.initialGreetingPending) { this.initialGreetingPending = false; return }
      const result = await api.speakCoach(this.sessionId, {kind: 'instruction', message}).catch(() => null)
      if (result?.available) return
      this.emit('AGENT_SPEAK_FALLBACK')
    }
    await this.tts.speak(message)
  }

  async speakFeedback(message: string, context?: FeedbackContext | null) {
    if (this.agentReady && this.sessionId) {
      const result = await api.speakCoach(this.sessionId, {kind: 'feedback', message,
        feedback_context: context as Record<string, unknown> | null | undefined}).catch(() => null)
      if (result?.available) return
      this.emit('AGENT_FEEDBACK_FALLBACK')
    }
    await this.tts.speak(message)
  }

  stopSpeaking = () => this.tts.stopSpeaking()
  onUserSpeechStart = (callback: () => void) => this.subscribe(this.speechStart, callback)
  onUserSpeechEnd = (callback: () => void) => this.subscribe(this.speechEnd, callback)
  onMicLevel = (callback: (level: number) => void) => this.subscribe(this.micLevels, callback)
  onMicMuted = (callback: (muted: boolean) => void) => this.subscribe(this.micMuted, callback)
  onConnectionStateChange = (callback: (state: string) => void) => this.subscribe(this.connection, callback)

  private waitForAgent(timeoutMs: number) {
    return new Promise<boolean>(resolve => {
      const done = (ready: boolean) => { clearTimeout(timer); this.agentWaiters.delete(done); resolve(ready) }
      const timer = window.setTimeout(() => done(false), timeoutMs)
      this.agentWaiters.add(done)
    })
  }

  private startMeter() {
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

  private async cleanupRtc() {
    if (this.meter) clearInterval(this.meter); this.meter = undefined
    this.mic?.stop(); this.mic?.close(); this.mic = undefined
    if (this.client.connectionState !== 'DISCONNECTED') await this.client.leave().catch(() => undefined)
  }

  private emit(state: string) { this.connection.forEach(callback => callback(state)) }
  private subscribe<T>(set: Set<T>, callback: T) { set.add(callback); return () => set.delete(callback) }
}

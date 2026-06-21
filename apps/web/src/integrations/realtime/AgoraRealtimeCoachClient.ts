import AgoraRTC, { type IAgoraRTCClient, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import type { FeedbackContext, RecordingItem } from '../../types/domain'
import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'
import type { RealtimeCoachClient } from './RealtimeCoachClient'

export class AgoraRealtimeCoachClient implements RealtimeCoachClient {
  private client: IAgoraRTCClient = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'})
  private mic?: IMicrophoneAudioTrack
  private meter?: number
  private tts = new BrowserTTSCoachClient()
  private expectedAgentUid?: string
  private agentDetected = false
  private agentAudioSubscribed = false
  private useBrowserFallback = true
  private allowCoachFallback = false
  private agentWaiters = new Set<(detected: boolean) => void>()
  private speechStart = new Set<() => void>(); private speechEnd = new Set<() => void>()
  private micLevels = new Set<(level: number) => void>(); private micMuted = new Set<(muted: boolean) => void>()
  private connection = new Set<(state: string) => void>(); private speaking = false

  constructor() {
    this.client.on('connection-state-change', state => this.emit(state))
    this.client.on('user-joined', user => {
      const uid = String(user.uid)
      console.info('[VoiceTurk RTC] remote user joined', {uid, expectedAgentUid: this.expectedAgentUid})
      this.emit(`REMOTE_USER_JOINED uid=${uid}`)
      if (this.expectedAgentUid && uid === this.expectedAgentUid) {
        this.agentDetected = true
        this.useBrowserFallback = false
        this.emit(`AGENT_CONNECTED uid=${uid}`)
        this.agentWaiters.forEach(resolve => resolve(true))
        this.agentWaiters.clear()
      }
    })
    this.client.on('user-left', user => {
      const uid = String(user.uid)
      this.emit(`REMOTE_USER_LEFT uid=${uid}`)
      if (this.expectedAgentUid === uid) {
        this.agentDetected = false
        this.useBrowserFallback = this.allowCoachFallback
        this.emit(`${this.allowCoachFallback ? 'AGENT_LEFT_FALLBACK' : 'AGENT_LEFT_FAILED'} uid=${uid}`)
      }
    })
    this.client.on('user-published', async (user, mediaType) => {
      if (mediaType !== 'audio') return
      try {
        await this.client.subscribe(user, mediaType)
        user.audioTrack?.play()
        const uid = String(user.uid)
        console.info('[VoiceTurk RTC] remote audio subscribed', {uid, expectedAgentUid: this.expectedAgentUid})
        this.emit(`REMOTE_AUDIO_SUBSCRIBED uid=${uid}`)
        if (this.expectedAgentUid === uid) {
          this.agentAudioSubscribed = true
          this.emit(`AGENT_AUDIO_SUBSCRIBED uid=${uid}`)
        }
      } catch (error) {
        console.warn('[VoiceTurk RTC] remote audio subscribe failed', {uid: String(user.uid), error})
        this.emit(`REMOTE_AUDIO_SUBSCRIBE_FAILED uid=${String(user.uid)}`)
      }
    })
  }
  async joinSession({realtime}: Parameters<RealtimeCoachClient['joinSession']>[0]) {
    if (realtime.provider !== 'agora') {
      this.emit('FALLBACK_BROWSER_TTS')
      return {transport: 'browser' as const, rtcJoined: false, micPublished: false,
        voiceProvider: 'browser_tts' as const}
    }
    this.allowCoachFallback = Boolean(realtime.allow_coach_fallback)
    if (!realtime.agora_app_id || !realtime.agora_channel || !realtime.agora_token) {
      this.useBrowserFallback = this.allowCoachFallback
      this.emit(`AGENT_START_FAILED code=${realtime.agent_join_error_code ?? 'MISSING_AGORA_RTC_CONFIG'}`)
      return {transport: 'browser' as const, rtcJoined: false, micPublished: false,
        voiceProvider: this.allowCoachFallback ? 'browser_tts_fallback' as const : 'agora_agent_failed' as const,
        warning: realtime.agent_join_message ?? 'Agora RTC configuration is missing'}
    }
    this.expectedAgentUid = realtime.coach_provider === 'agora_agent' && realtime.agent_rtc_uid
      ? String(realtime.agent_rtc_uid) : undefined
    this.agentDetected = false
    this.agentAudioSubscribed = false
    this.useBrowserFallback = this.allowCoachFallback && realtime.coach_provider !== 'agora_agent'
    console.info('[VoiceTurk RTC] joining channel', {channel: realtime.agora_channel,
      localUid: String(realtime.uid), expectedAgentUid: this.expectedAgentUid,
      agentJoinStatus: realtime.agent_join_status})
    try {
      const localUid = await this.client.join(realtime.agora_app_id, realtime.agora_channel,
        realtime.agora_token, realtime.contributor_rtc_uid ?? realtime.uid)
      console.info('[VoiceTurk RTC] local user joined', {channel: realtime.agora_channel,
        localUid: String(localUid), expectedAgentUid: this.expectedAgentUid})
      this.mic = await AgoraRTC.createMicrophoneAudioTrack({encoderConfig: 'speech_standard'})
      await this.client.publish([this.mic])
      this.emit(`LOCAL_MIC_PUBLISHED uid=${String(localUid)}`)
      const existingAgent = this.client.remoteUsers.find(user =>
        this.expectedAgentUid && String(user.uid) === this.expectedAgentUid)
      if (existingAgent) {
        this.agentDetected = true
        this.useBrowserFallback = false
        this.emit(`AGENT_CONNECTED uid=${String(existingAgent.uid)}`)
      }
    } catch (error) {
      this.mic?.stop(); this.mic?.close(); this.mic = undefined
      if (this.client.connectionState !== 'DISCONNECTED') await this.client.leave().catch(() => {})
      console.error('[VoiceTurk RTC] local join or mic publish failed', {channel: realtime.agora_channel, error})
      this.useBrowserFallback = this.allowCoachFallback
      this.emit('AGORA_RTC_FAILED')
      return {transport: 'browser' as const, rtcJoined: false, micPublished: false,
        voiceProvider: this.allowCoachFallback ? 'browser_tts_fallback' as const : 'agora_agent_failed' as const,
        warning: 'Agora RTC join or microphone publish failed'}
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
    if (this.expectedAgentUid) {
      this.emit(`AGENT_WAITING uid=${this.expectedAgentUid}`)
      const detected = this.agentDetected || await this.waitForAgent(30000)
      if (detected) {
        return {transport: 'agora_rtc' as const, rtcJoined: true, micPublished: true,
          voiceProvider: 'agora_agent' as const, agentDetected: true,
          agentAudioSubscribed: this.agentAudioSubscribed}
      }
      this.useBrowserFallback = this.allowCoachFallback
      this.emit(`AGENT_NOT_DETECTED uid=${this.expectedAgentUid}`)
      return {transport: 'agora_rtc' as const, rtcJoined: true, micPublished: true,
        voiceProvider: this.allowCoachFallback ? 'browser_tts_fallback' as const : 'agora_agent_failed' as const,
        agentDetected: false,
        warning: 'Agent not detected in RTC channel'}
    }
    this.emit(`AGENT_START_FAILED code=${realtime.agent_join_error_code ?? 'AGENT_JOIN_FAILED'}`)
    return {transport: 'agora_rtc' as const, rtcJoined: true, micPublished: true,
      voiceProvider: this.allowCoachFallback ? 'browser_tts_fallback' as const : 'agora_agent_failed' as const,
      warning: realtime.agent_join_message ?? undefined}
  }
  async leaveSession() { if (this.meter) clearInterval(this.meter); this.meter = undefined;
    this.agentWaiters.forEach(resolve => resolve(false)); this.agentWaiters.clear()
    this.mic?.stop(); this.mic?.close(); this.mic = undefined;
    if (this.client.connectionState !== 'DISCONNECTED') await this.client.leave(); this.stopSpeaking()
    this.expectedAgentUid = undefined; this.agentDetected = false; this.agentAudioSubscribed = false;
    this.useBrowserFallback = true;
    this.allowCoachFallback = false }
  setCurrentTaskContext = (_context: RecordingItem) => {}
  speak = async (message: string) => { if (this.useBrowserFallback) await this.tts.speak(message) }
  speakFeedback = async (message: string, _context?: FeedbackContext | null) => {
    if (this.useBrowserFallback) await this.tts.speak(message)
  }
  stopSpeaking = () => this.tts.stopSpeaking()
  onUserSpeechStart = (callback: () => void) => this.subscribe(this.speechStart, callback)
  onUserSpeechEnd = (callback: () => void) => this.subscribe(this.speechEnd, callback)
  onMicLevel = (callback: (level: number) => void) => this.subscribe(this.micLevels, callback)
  onMicMuted = (callback: (muted: boolean) => void) => this.subscribe(this.micMuted, callback)
  onConnectionStateChange = (callback: (state: string) => void) => this.subscribe(this.connection, callback)
  private waitForAgent(timeoutMs: number) {
    return new Promise<boolean>(resolve => {
      const done = (detected: boolean) => {
        window.clearTimeout(timer); this.agentWaiters.delete(done); resolve(detected)
      }
      const timer = window.setTimeout(() => done(false), timeoutMs)
      this.agentWaiters.add(done)
    })
  }
  private emit(state: string) { this.connection.forEach(callback => callback(state)) }
  private subscribe<T>(set: Set<T>, callback: T) { set.add(callback); return () => set.delete(callback) }
}

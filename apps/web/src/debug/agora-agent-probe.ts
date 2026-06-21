import AgoraRTC, {type IAgoraRTCClient, type IMicrophoneAudioTrack} from 'agora-rtc-sdk-ng'

const form = document.querySelector<HTMLFormElement>('#probe-form')!
const status = document.querySelector<HTMLElement>('#status')!
const events = document.querySelector<HTMLElement>('#events')!
const leaveButton = document.querySelector<HTMLButtonElement>('#leave')!
const client: IAgoraRTCClient = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'})
let mic: IMicrophoneAudioTrack | undefined
let expectedAgentUid = ''
let detectionTimer: number | undefined

function value(id: string) {
  return document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!.value.trim()
}

function log(event: string, detail: Record<string, unknown> = {}) {
  const line = `${new Date().toISOString()} ${event} ${JSON.stringify(detail)}`
  console.info('[VoiceTurk Agora probe]', event, detail)
  events.textContent = `${line}\n${events.textContent ?? ''}`
  status.textContent = event
}

client.on('connection-state-change', (current, previous, reason) =>
  log('CONNECTION_STATE_CHANGE', {current, previous, reason}))
client.on('user-joined', user => {
  const uid = String(user.uid)
  log('REMOTE_USER_JOINED', {uid, expectedAgentUid})
  if (uid === expectedAgentUid) {
    if (detectionTimer) window.clearTimeout(detectionTimer)
    log('AGENT_JOINED', {uid})
  }
})
client.on('user-published', async (user, mediaType) => {
  log('REMOTE_USER_PUBLISHED', {uid: String(user.uid), mediaType})
  if (mediaType !== 'audio') return
  try {
    await client.subscribe(user, mediaType)
    user.audioTrack?.play()
    const uid = String(user.uid)
    log(uid === expectedAgentUid ? 'AGENT_AUDIO_SUBSCRIBED' : 'REMOTE_AUDIO_SUBSCRIBED', {uid})
  } catch (error) {
    log('REMOTE_AUDIO_SUBSCRIBE_FAILED', {uid: String(user.uid), error: String(error)})
  }
})
client.on('user-left', user => log('REMOTE_USER_LEFT', {uid: String(user.uid)}))

async function leave() {
  if (detectionTimer) window.clearTimeout(detectionTimer)
  mic?.stop(); mic?.close(); mic = undefined
  if (client.connectionState !== 'DISCONNECTED') await client.leave()
  log('LEFT_CHANNEL')
}

form.addEventListener('submit', async event => {
  event.preventDefault()
  await leave().catch(() => undefined)
  const appId = value('app-id')
  const channel = value('channel')
  const uid = value('contributor-uid')
  const token = value('token')
  expectedAgentUid = value('agent-uid')
  log('JOINING', {channel, localUid: uid, expectedAgentUid})
  try {
    const joinedUid = await client.join(appId, channel, token, uid)
    mic = await AgoraRTC.createMicrophoneAudioTrack({encoderConfig: 'speech_standard'})
    await client.publish(mic)
    log('LOCAL_MIC_PUBLISHED', {channel, localUid: String(joinedUid), expectedAgentUid})
    detectionTimer = window.setTimeout(() => {
      log('AGENT_NOT_DETECTED', {channel, localUid: String(joinedUid), expectedAgentUid})
    }, 15000)
  } catch (error) {
    log('PROBE_FAILED', {channel, localUid: uid, expectedAgentUid, error: String(error)})
  }
})

leaveButton.addEventListener('click', () => void leave())
window.addEventListener('beforeunload', () => void leave())

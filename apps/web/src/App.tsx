import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './features/api'
import { BrowserMediaRecorder } from './integrations/recorder/BrowserMediaRecorder'
import { createCoach } from './integrations/realtime/createCoach'
import { apiUrl } from './shared/api/httpClient'
import type { Campaign, Dataset, Role, Sample, Session } from './types/domain'
import './styles.css'

const demoLines = [
  ['Tôi chưa nhận được hàng.', 'delivery_delay', 'Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến.'],
  ['Đơn hàng của tôi đang ở đâu?', 'order_status', 'Khách hàng muốn biết trạng thái hiện tại của đơn hàng.'],
  ['Tôi muốn hoàn tiền cho đơn này.', 'refund_request', 'Khách hàng không hài lòng và muốn hoàn tiền.'],
  ['Sao đơn hàng giao trễ vậy?', 'delivery_delay', 'Khách hàng khó chịu vì đơn hàng giao muộn.'],
  ['Tôi cần kiểm tra trạng thái đơn hàng.', 'order_status', 'Khách hàng cần tổng đài kiểm tra đơn giúp mình.'],
]

function Status({value}: {value: string}) { return <span className={`status ${value.toLowerCase()}`}>{value}</span> }

function BuyerPanel({campaigns, refresh}: {campaigns: Campaign[]; refresh: () => Promise<void>}) {
  const [selected, setSelected] = useState<string>('')
  const [coverage, setCoverage] = useState<Record<string, unknown> | null>(null)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [verify, setVerify] = useState('')
  const [message, setMessage] = useState('')

  async function act(action: () => Promise<unknown>, success: string) {
    try { await action(); setMessage(success); await refresh() } catch (error) { setMessage((error as Error).message) }
  }

  async function create() {
    await act(() => api.createCampaign({buyer_id: 'buyer_001', name: `E-commerce Prosody Dataset ${campaigns.length + 1}`,
      domain: 'ecommerce_cskh', target_emotions: ['neutral', 'confused', 'impatient', 'angry'],
      script_lines: demoLines.map(([transcript, intent, context_brief]) => ({transcript, intent, context_brief}))}), 'Draft campaign created.')
  }

  return <section>
    <div className="section-head"><div><p className="eyebrow">BUYER CONSOLE</p><h2>Campaigns and dataset proof</h2></div>
      <div className="actions"><button onClick={create}>Create demo draft</button><button className="secondary" onClick={() => act(api.seed, 'Seed campaign is ready.')}>Seed active demo</button></div></div>
    {message && <p className="notice">{message}</p>}
    <div className="grid">
      {campaigns.map(campaign => <article className={`card ${selected === campaign.campaign_id ? 'selected' : ''}`} key={campaign.campaign_id} onClick={() => setSelected(campaign.campaign_id)}>
        <div className="card-top"><h3>{campaign.name}</h3><Status value={campaign.status}/></div>
        <p>{campaign.domain} · {campaign.item_count} recording items</p><p className="muted">{campaign.target_emotions.join(' · ')}</p>
        <div className="actions">
          {campaign.status === 'DRAFT' && <button onClick={e => {e.stopPropagation(); act(() => api.generate(campaign.campaign_id), 'Recording items generated.')}}>Generate items</button>}
          {campaign.status === 'PREVIEW_READY' && <button onClick={e => {e.stopPropagation(); act(() => api.activate(campaign.campaign_id), 'Campaign activated.')}}>Activate</button>}
          <button className="secondary" onClick={async e => {e.stopPropagation(); setCoverage(await api.coverage(campaign.campaign_id)); setSelected(campaign.campaign_id)}}>Coverage</button>
        </div>
      </article>)}
    </div>
    {selected && <div className="split">
      <article className="card"><h3>Coverage</h3>{coverage ? <><div className="metric">{Math.round(Number(coverage.coverage_ratio) * 100)}%</div><pre>{JSON.stringify(coverage, null, 2)}</pre></> : <p className="muted">Choose Coverage on a campaign.</p>}</article>
      <article className="card"><h3>Dataset export</h3><p>Exports accepted samples only and issues a local hash proof.</p>
        <button onClick={async () => {try {setDataset(await api.build(selected)); setVerify('')} catch(e) {setMessage((e as Error).message)}}}>Build version 1.0</button>
        {dataset && <div className="result"><Status value={dataset.status}/><p>{dataset.sample_count} accepted sample(s)</p><code>{dataset.manifest_hash}</code>
          <button className="secondary" onClick={async () => setVerify((await api.verify(dataset.dataset_version_id, dataset.manifest_hash)).result)}>Verify manifest</button>{verify && <strong className="match">{verify}</strong>}</div>}
      </article>
    </div>}
  </section>
}

function ContributorPanel({campaigns}: {campaigns: Campaign[]}) {
  const [campaignId, setCampaignId] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [index, setIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [message, setMessage] = useState('Select an active campaign to begin.')
  const recorder = useRef(new BrowserMediaRecorder())
  const startedAt = useRef(0)
  const coach = useMemo(createCoach, [])
  const item = session?.items[index]

  useEffect(() => { if (!item) return; coach.setCurrentTaskContext(item); const text = `Hãy đọc câu sau với cảm xúc ${item.target_emotion}: ${item.transcript}`; setMessage(text); coach.speak(text) }, [item, coach])

  async function startSession() {
    try { const next = await api.startSession(campaignId); setSession(next); setIndex(0); await coach.join({session_id: next.session_id}) } catch(e) {setMessage((e as Error).message)}
  }
  async function startRecording() { try {await recorder.current.start(); startedAt.current = Date.now(); setBlob(null); setRecording(true)} catch(e) {setMessage(`Microphone unavailable: ${(e as Error).message}`)} }
  async function stopRecording() { const audio = await recorder.current.stop(); setDuration(Date.now() - startedAt.current); setBlob(audio); setRecording(false) }
  async function submit() {
    if (!item || !session || !blob || duration < 500) { setMessage('Client pre-check: record at least 0.5 seconds before submitting.'); return }
    const data = new FormData(); data.append('audio', blob, 'recording.webm'); data.append('session_id', session.session_id); data.append('contributor_id', 'contributor_001'); data.append('duration_ms', String(duration))
    try { const result = await api.submitAudio(item.item_id, data); setMessage(result.message_vi); await coach.speak(result.message_vi); setBlob(null); if (result.action === 'CONTINUE_NEXT') setIndex(value => value + 1) } catch(e) {setMessage((e as Error).message)}
  }
  async function complete() { if (!session) return; await api.completeSession(session.session_id); await coach.leave(); setSession(null); setMessage('Session completed. Unrecorded items returned to the open pool.') }

  const active = campaigns.filter(c => c.status === 'ACTIVE')
  return <section><p className="eyebrow">CONTRIBUTOR STUDIO</p><h2>Guided recording session</h2>
    {!session && <article className="card start-card"><label>Active campaign<select value={campaignId} onChange={e => setCampaignId(e.target.value)}><option value="">Select…</option>{active.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}</select></label><button disabled={!campaignId} onClick={startSession}>Start session</button></article>}
    {session && item && <div className="studio"><div className="progress">Item {index + 1} of {session.items.length}<span style={{width: `${((index + 1) / session.items.length) * 100}%`}}/></div>
      <article className="prompt"><p className="eyebrow">{item.intent} · {item.target_emotion}</p><h3>{item.transcript}</h3><p>{item.context_brief}</p></article>
      <div className="coach"><strong>Voice Coach</strong><p>{message}</p><button className="ghost" onClick={() => coach.speak(message)}>Speak again</button></div>
      <div className="recorder"><div className={`mic ${recording ? 'live' : ''}`}>●</div><p>{recording ? 'Recording…' : blob ? `Ready · ${(duration / 1000).toFixed(1)}s` : 'Ready to record'}</p>
        <div className="actions">{!recording ? <button onClick={startRecording}>Start recording</button> : <button className="danger" onClick={stopRecording}>Stop</button>}<button className="secondary" disabled={!blob} onClick={submit}>Submit audio</button></div></div>
      <button className="ghost" onClick={complete}>Complete session now</button></div>}
    {session && !item && <article className="card"><h3>All assigned items submitted</h3><p>DeepCheck and validation continue in the background.</p><button onClick={complete}>Complete session</button></article>}
    {!session && <p className="notice">{message}</p>}
  </section>
}

function ValidatorPanel() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [message, setMessage] = useState('')
  const refresh = async () => setSamples(await api.queue())
  useEffect(() => { refresh().catch(e => setMessage(e.message)) }, [])
  async function decide(id: string, decision: string) { try {await api.review(id, decision); setMessage(`${decision} saved by backend.`); await refresh()} catch(e) {setMessage((e as Error).message)} }
  return <section><div className="section-head"><div><p className="eyebrow">VALIDATOR QUEUE</p><h2>Human quality review</h2></div><button className="secondary" onClick={refresh}>Refresh queue</button></div>{message && <p className="notice">{message}</p>}
    {!samples.length && <article className="empty"><h3>No samples waiting</h3><p>Submit a contributor recording, then refresh.</p></article>}
    <div className="grid">{samples.map(sample => <article className="card" key={sample.sample_id}><div className="card-top"><Status value={sample.status}/><strong>{Math.round((sample.quality_score ?? 0) * 100)} quality</strong></div><h3>{sample.transcript_snapshot}</h3><p>{sample.context_brief}</p><p className="muted">Target: {sample.target_emotion_snapshot}</p><audio controls src={apiUrl(sample.audio_url)}/><div className="actions"><button onClick={() => decide(sample.sample_id, 'ACCEPT')}>Accept</button><button className="secondary" onClick={() => decide(sample.sample_id, 'NEED_RETAKE')}>Need retake</button><button className="danger" onClick={() => decide(sample.sample_id, 'REJECT')}>Reject</button></div></article>)}</div>
  </section>
}

export default function App() {
  const [role, setRole] = useState<Role>('Buyer')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [online, setOnline] = useState(false)
  const refresh = async () => setCampaigns(await api.campaigns())
  useEffect(() => { api.health().then(() => setOnline(true)).catch(() => setOnline(false)); refresh().catch(() => {}) }, [])
  return <><header><div className="brand"><span>VT</span><div><strong>VoiceTurk</strong><small>Vietnamese prosody studio</small></div></div><nav>{(['Buyer','Contributor','Validator'] as Role[]).map(value => <button className={role === value ? 'active' : ''} onClick={() => setRole(value)} key={value}>{value}</button>)}</nav><div className={`api-state ${online ? 'online' : ''}`}>● API {online ? 'online' : 'offline'}</div></header><main>{role === 'Buyer' && <BuyerPanel campaigns={campaigns} refresh={refresh}/>} {role === 'Contributor' && <ContributorPanel campaigns={campaigns}/>} {role === 'Validator' && <ValidatorPanel/>}</main><footer>Local-first MVP · Browser TTS · Local storage · Local hash proof</footer></>
}

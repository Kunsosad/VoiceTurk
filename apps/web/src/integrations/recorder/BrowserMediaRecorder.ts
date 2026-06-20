import type { AudioMetrics } from '../../types/domain'

export type RecorderCallbacks = {onLevel?: (dbfs: number) => void; onSpeechStart?: () => void; onSpeechEnd?: () => void; onMuted?: () => void}
export type RecordingResult = {blob: Blob; metrics: AudioMetrics}

export class BrowserMediaRecorder {
  private stream?: MediaStream; private context?: AudioContext; private processor?: ScriptProcessorNode
  private source?: MediaStreamAudioSourceNode; private chunks: Float32Array[] = []; private startedAt = 0
  private speaking = false; private silentSince = 0; private callbacks: RecorderCallbacks = {}

  async start(callbacks: RecorderCallbacks = {}) {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('Microphone device not found'), {code: 'MIC_NOT_FOUND'})
    try { this.stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}}) }
    catch (error) { const name = (error as DOMException).name; throw Object.assign(error as Error, {code: name === 'NotAllowedError' ? 'MIC_PERMISSION_DENIED' : name === 'NotFoundError' ? 'MIC_NOT_FOUND' : 'MIC_TRACK_FAILED'}) }
    const track = this.stream.getAudioTracks()[0]
    if (!track) throw Object.assign(new Error('Microphone track failed'), {code: 'MIC_TRACK_FAILED'})
    this.callbacks = callbacks; this.chunks = []; this.startedAt = performance.now(); this.speaking = false; this.silentSince = 0
    track.onmute = () => callbacks.onMuted?.()
    this.context = new AudioContext(); this.source = this.context.createMediaStreamSource(this.stream)
    this.processor = this.context.createScriptProcessor(2048, 1, 1)
    this.processor.onaudioprocess = event => {
      const data = new Float32Array(event.inputBuffer.getChannelData(0)); this.chunks.push(data)
      const rms = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
      const dbfs = 20 * Math.log10(Math.max(rms, 1e-8)); callbacks.onLevel?.(dbfs)
      const active = dbfs > -45
      if (active && !this.speaking) { this.speaking = true; callbacks.onSpeechStart?.() }
      if (!active && this.speaking) { if (!this.silentSince) this.silentSince = performance.now(); if (performance.now() - this.silentSince > 450) { this.speaking = false; callbacks.onSpeechEnd?.() } }
      else if (active) this.silentSince = 0
    }
    this.source.connect(this.processor); this.processor.connect(this.context.destination)
  }

  async stop(): Promise<RecordingResult> {
    if (!this.context) throw new Error('Recording has not started')
    const sampleRate = this.context.sampleRate
    this.processor?.disconnect(); this.source?.disconnect(); this.stream?.getTracks().forEach(track => track.stop()); await this.context.close()
    const length = this.chunks.reduce((sum, value) => sum + value.length, 0); const samples = new Float32Array(length)
    let offset = 0; this.chunks.forEach(value => {samples.set(value, offset); offset += value.length})
    const blob = new Blob([this.encodeWav(samples, sampleRate)], {type: 'audio/wav'})
    const peak = samples.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0)
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / Math.max(1, samples.length))
    const frame = Math.max(1, Math.round(sampleRate * .02)); let silent = 0; let frames = 0
    for (let start = 0; start < samples.length; start += frame) { let energy = 0; const end = Math.min(start + frame, samples.length); for (let i=start;i<end;i++) energy += samples[i] ** 2; if (20 * Math.log10(Math.max(Math.sqrt(energy/(end-start)), 1e-8)) < -45) silent++; frames++ }
    this.context = undefined
    return {blob, metrics: {duration_ms: Math.round(samples.length / sampleRate * 1000), rms_dbfs: 20*Math.log10(Math.max(rms,1e-8)), peak_dbfs: 20*Math.log10(Math.max(peak,1e-8)), silence_ratio: silent/Math.max(1,frames), clipping_ratio: samples.reduce((sum,value)=>sum+(Math.abs(value)>=.99?1:0),0)/Math.max(1,samples.length)}}
  }

  private encodeWav(samples: Float32Array, sampleRate: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(buffer)
    const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset+index, char.charCodeAt(0)))
    text(0,'RIFF'); view.setUint32(4,36+samples.length*2,true); text(8,'WAVE'); text(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); text(36,'data'); view.setUint32(40,samples.length*2,true)
    samples.forEach((value,index)=>view.setInt16(44+index*2,Math.max(-1,Math.min(1,value))*0x7fff,true)); return buffer
  }
}

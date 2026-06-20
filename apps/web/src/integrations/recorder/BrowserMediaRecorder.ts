export class BrowserMediaRecorder {
  private recorder?: MediaRecorder
  private chunks: Blob[] = []
  private stream?: MediaStream

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({audio: true})
    this.chunks = []
    this.recorder = new MediaRecorder(this.stream)
    this.recorder.ondataavailable = event => this.chunks.push(event.data)
    this.recorder.start()
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) return reject(new Error('Recording has not started'))
      this.recorder.onstop = () => {
        this.stream?.getTracks().forEach(track => track.stop())
        resolve(new Blob(this.chunks, {type: this.recorder?.mimeType || 'audio/webm'}))
      }
      this.recorder.stop()
    })
  }
}

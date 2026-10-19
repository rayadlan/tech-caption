/* PCM capture with a streaming box-average resampler; no browser SpeechRecognition API. */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(1600);
    this.index = 0;
    this.sum = 0;
    this.weight = 0;
    this.ratio = sampleRate / 16000;
    this.closed = false;
    this.port.onmessage = (e) => {
      if (e.data === "flush") {
        if (this.index) this.port.postMessage(this.buffer.slice(0, this.index));
        this.index = 0;
        this.closed = true;
        this.port.postMessage("flushed");
      }
    };
  }
  process(inputs) {
    if (this.closed) return false;
    const channels = inputs[0];
    if (!channels?.length) return true;
    const n = channels[0].length;
    for (let i = 0; i < n; i++) {
      let sample = 0;
      for (const ch of channels) sample += ch[i];
      sample /= channels.length;
      let left = 1;
      while (left > 1e-8) {
        const take = Math.min(left, this.ratio - this.weight);
        this.sum += sample * take;
        this.weight += take;
        left -= take;
        if (this.weight >= this.ratio - 1e-8) {
          this.buffer[this.index++] = this.sum / this.ratio;
          this.sum = 0;
          this.weight = 0;
          if (this.index === 1600) {
            this.port.postMessage(this.buffer, [this.buffer.buffer]);
            this.buffer = new Float32Array(1600);
            this.index = 0;
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);

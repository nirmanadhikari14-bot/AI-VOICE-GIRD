export class AudioStreamer {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private ws: WebSocket | null = null;
  private isRecording = false;

  private wsUrl: string;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }

  async start() {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 }); // Downsample to 16kHz
      
      // Load the worklet
      const workletCode = `
        class AudioProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input.length > 0) {
              const channelData = input[0];
              // Convert Float32Array to Int16Array
              const pcmData = new Int16Array(channelData.length);
              for (let i = 0; i < channelData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(channelData[i] * 32768)));
              }
              this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
            }
            return true;
          }
        }
        registerProcessor('audio-processor', AudioProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(workletUrl);

      this.ws = new WebSocket(this.wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        const source = this.audioContext!.createMediaStreamSource(this.mediaStream!);
        this.workletNode = new AudioWorkletNode(this.audioContext!, 'audio-processor');

        this.workletNode.port.onmessage = (event) => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(event.data);
          }
        };

        source.connect(this.workletNode);
        this.workletNode.connect(this.audioContext!.destination);
        this.isRecording = true;
      };

    } catch (err) {
      console.error('Failed to start audio stream:', err);
      this.stop();
      throw err;
    }
  }

  stop() {
    this.isRecording = false;
    
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isActive() {
    return this.isRecording;
  }
}

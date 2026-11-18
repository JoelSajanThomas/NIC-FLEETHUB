/**
 * Audio Recording and Speech Capture Service
 */

export class AudioRecorder {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.recognition = null;
    this.transcript = "";
    this.isRecording = false;
  }

  async start(lang = "en", onInterimTranscript = null) {
    if (this.isRecording) return;
    this.chunks = [];
    this.transcript = "";

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = lang === "ar" ? "ar-SA" : (lang === "hi" ? "hi-IN" : "en-US");
        this.recognition.onresult = (event) => {
          let str = "";
          for (let i = 0; i < event.results.length; i++) {
            str += event.results[i][0].transcript + " ";
          }
          this.transcript = str.trim();
          if (onInterimTranscript) onInterimTranscript(this.transcript);
        };
        this.recognition.start();
      } catch (e) {
        console.warn("[AudioRecorder] SpeechRecognition start failed:", e);
      }
    }

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve({ blob: null, transcript: "" });
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.isRecording = false;
        resolve({
          blob,
          transcript: this.transcript
        });
      };

      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }

      this.mediaRecorder.stop();
    });
  }
}

export const audioRecorder = new AudioRecorder();
export default audioRecorder;

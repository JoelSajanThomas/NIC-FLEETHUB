/**
 * Reusable Voice Recording Component with visual wave indicator
 */
import { audioRecorder } from "../services/audio-recorder.js";
import { voiceApi } from "../api/voice.js";

export function renderVoiceWidget(targetTextareaId, lang = "en") {
  return `
    <div class="voice-widget-container">
      <button type="button" class="btn btn-voice" id="voiceRecordBtn">
        <span class="mic-icon">🎤</span>
        <span class="voice-status-text">Record Voice Note</span>
      </button>
      <div class="voice-wave-indicator" style="display: none;">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  `;
}

import { api } from "./client.js";

export const voiceApi = {
  processVoice: (formData) => api.upload("/api/voice/process", formData),
  translate: (text, target = "en") => api.post("/api/translate", { text, target })
};

export default voiceApi;

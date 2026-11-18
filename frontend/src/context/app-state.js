/**
 * Application Global State Store
 */
import { config } from "../config/env.js";

class AppState {
  constructor() {
    this.user = null;
    this.currentLang = localStorage.getItem("fleethub_lang") || config.DEFAULT_LANGUAGE;
    this.activeTab = "dashboard";
    this.listeners = new Set();
  }

  setUser(user) {
    this.user = user;
    if (user && user.lang) {
      this.setLang(user.lang);
    }
    this.emitChange();
  }

  setLang(lang) {
    if (config.SUPPORTED_LANGUAGES.includes(lang)) {
      this.currentLang = lang;
      localStorage.setItem("fleethub_lang", lang);
      this.emitChange();
    }
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    this.emitChange();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitChange() {
    this.listeners.forEach((fn) => fn(this));
  }
}

export const appState = new AppState();
export default appState;

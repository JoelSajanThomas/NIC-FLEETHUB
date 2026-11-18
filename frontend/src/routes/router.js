/**
 * Lightweight hash/view router for the application console
 */

export class ViewRouter {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentView = null;
    window.addEventListener("hashchange", () => this.handleRoute());
  }

  register(hash, handler) {
    this.routes[hash] = handler;
  }

  handleRoute() {
    const rawHash = window.location.hash.slice(1);
    const [path, ...params] = rawHash.split(":");
    const handler = this.routes[path] || this.routes["default"];
    if (handler) {
      handler(params.join(":"));
    }
  }

  navigate(hash) {
    window.location.hash = hash;
  }
}

export const router = new ViewRouter();
export default router;

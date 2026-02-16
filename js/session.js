const SessionManager = {
  get(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return sessionStorage.getItem(key);
    }
  },

  set(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    sessionStorage.removeItem(key);
  },

  clear() {
    sessionStorage.clear();
  },

  getUser() {
    return this.get('user');
  },

  setUser(user) {
    this.set('user', user);
  },

  isAuthenticated() {
    return !!this.getUser();
  },

  logout() {
    this.remove('user');
    window.location.href = 'index.html';
  }
};

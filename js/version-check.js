const VersionChecker = {
  currentVersion: null,
  checkInterval: null,
  toastShown: false,

  async generateHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  },

  async checkForUpdates() {
    try {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';

      const response = await fetch(`${currentPage}?t=${Date.now()}`);
      const content = await response.text();
      
      const newHash = await this.generateHash(content);

      if (!this.currentVersion) {
        this.currentVersion = newHash;
        return false;
      }

      if (this.currentVersion !== newHash) {
        this.currentVersion = newHash;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      return false;
    }
  },

  showUpdateToast() {
    if (this.toastShown) return;
    
    this.toastShown = true;
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-warning update-toast';
    toast.id = 'update-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 256 256" fill="currentColor">
        <path d="M240,128a104,104,0,0,1-208,0c0-51,36.9-93.4,86.1-101.6a8,8,0,0,1,3.8,15.6,88,88,0,1,0,73.8,0,8,8,0,1,1,3.8-15.6C203.1,34.6,240,77,240,128ZM128,32a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V40A8,8,0,0,0,128,32Z"></path>
      </svg>
      <span style="flex:1">
        <strong>Atualização disponível!</strong><br>
        <small style="font-size: 12px;">Clique para atualizar a página</small>
      </span>
      <button onclick="VersionChecker.refreshPage()" class="toast-btn" style="background: #d97706; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;">
        ATUALIZAR
      </button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .update-toast {
        background: #fff3cd !important;
        border-color: #d97706 !important;
        padding: 12px 16px !important;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .toast-btn:hover {
        background: #b85e00 !important;
      }
    `;
    document.head.appendChild(style);

    toast.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      this.refreshPage();
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.getElementById('update-toast')) {
        toast.classList.add('toast-hide');
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
          this.toastShown = false;
        }, 300);
      }
    }, 30000);
  },

  refreshPage() {
    window.location.reload(true);
  },

  startChecking(interval = 10000) {
    setTimeout(async () => {
      if (await this.checkForUpdates()) {
        this.showUpdateToast();
      }
    }, 2000);

    this.checkInterval = setInterval(async () => {
      if (await this.checkForUpdates()) {
        this.showUpdateToast();
      }
    }, interval);
  },

  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('painel.html')) {
    VersionChecker.startChecking(15000);
  }
});

window.addEventListener('beforeunload', () => {
  VersionChecker.stopChecking();
});
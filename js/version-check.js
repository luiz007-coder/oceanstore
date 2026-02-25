const VersionChecker = {
  currentVersion: null,
  checkInterval: null,
  toastShown: false,
  filesToCheck: [
    'index.html',
    'overview.html', 
    'market.html',
    'redemption.html',
    'painel.html',
    'criar_conta.html',
    'redefinir_senha.html',
    'js/auth.js',
    'js/session.js',
    'js/supabase.js',
    'js/profile-header.js',
    'js/version-check.js'
  ],

  async generateFileHash(url) {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) return null;
      
      const content = await response.text();
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch (error) {
      return null;
    }
  },

  async generateMasterHash() {
    try {
      const hashes = [];
      
      for (const file of this.filesToCheck) {
        const hash = await this.generateFileHash(file);
        if (hash) {
          hashes.push(`${file}:${hash}`);
        }
      }
      
      const combined = hashes.sort().join('|');
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    } catch (error) {
      return Date.now().toString();
    }
  },

  async checkForUpdates() {
    try {
      const masterHash = await this.generateMasterHash();

      if (!this.currentVersion) {
        this.currentVersion = masterHash;
        return false;
      }

      const hasChanged = this.currentVersion !== masterHash;
      
      if (hasChanged) {
        this.currentVersion = masterHash;
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  },

  showUpdateToast() {
    if (this.toastShown) return;
    
    this.toastShown = true;
    
    const toast = document.createElement('div');
    toast.className = 'toast update-toast';
    toast.id = 'update-toast';
    toast.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <strong style="font-size: 14px; color: #1e293b;">Nova atualização disponível!</strong>
        <span style="font-size: 12px; color: #475569;">Recarregue a página.</span>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .update-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        min-width: 280px;
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 16px 20px;
        z-index: 999999;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .update-toast:hover {
        background: #f8fafc;
      }
    `;
    document.head.appendChild(style);

    toast.addEventListener('click', () => {
      window.location.reload(true);
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.getElementById('update-toast')) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
          this.toastShown = false;
        }, 200);
      }
    }, 5000);
  },

  refreshPage() {
    window.location.reload(true);
  },

  startChecking(interval = 8000) {
    setTimeout(async () => {
      if (await this.checkForUpdates()) {
        this.showUpdateToast();
      }
    }, 2000);

    this.checkInterval = setInterval(async () => {
      try {
        if (await this.checkForUpdates()) {
          this.showUpdateToast();
        }
      } catch (error) {}
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
  VersionChecker.startChecking(8000);
});

window.addEventListener('beforeunload', () => {
  VersionChecker.stopChecking();
});

window.VersionChecker = VersionChecker;
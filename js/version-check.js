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
      
      console.log('Versão atual:', this.currentVersion ? this.currentVersion.substring(0, 8) + '...' : 'none');
      console.log('Nova versão:', masterHash.substring(0, 8) + '...');

      if (!this.currentVersion) {
        this.currentVersion = masterHash;
        return false;
      }

      const hasChanged = this.currentVersion !== masterHash;
      
      if (hasChanged) {
        console.log('MUDANÇA DETECTADA!');
        console.log('Arquivos modificados:');
        
        for (const file of this.filesToCheck) {
          const oldHash = await this.generateFileHash(file);
          await new Promise(r => setTimeout(r, 10));
          const newHash = await this.generateFileHash(file);
          
          if (oldHash && newHash && oldHash !== newHash) {
            console.log(`   ${file} foi modificado`);
          }
        }
        
        this.currentVersion = masterHash;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na verificação:', error);
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
      <div style="flex: 1;">
        <strong style="display: block; font-size: 15px; color: #b45309;">Nova versão disponível!</strong>
        <span style="font-size: 12px; color: #92400e; display: block; margin-top: 2px;">
          A OceanStore foi atualizada
        </span>
      </div>
      <button onclick="VersionChecker.refreshPage()" class="toast-btn" style="background: #d97706; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease; white-space: nowrap; box-shadow: 0 2px 8px rgba(217,119,6,0.3);">
        ATUALIZAR
      </button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .update-toast {
        background: linear-gradient(135deg, #fffbeb, #fef3c7) !important;
        border: 2px solid #fbbf24 !important;
        padding: 9px 15px !important;
        cursor: pointer;
        transition: all 0.3s ease !important;
        max-width: 420px !important;
        animation: slideInRight 0.3s ease !important;
        z-index: 999999 !important;
      }
      .toast-btn:hover {
        background: #b45309 !important;
        transform: scale(1.05);
      }
      .toast-btn:active {
        transform: scale(0.95);
      }
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
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
    }, 15000);
  },

  refreshPage() {
    window.location.reload(true);
  },

  startChecking(interval = 8000) {
    console.log('Conferindo...');
    console.log('Monitorando...', this.filesToCheck.length, 'arquivos');
    
    setTimeout(async () => {
      if (await this.checkForUpdates()) {
        this.showUpdateToast();
      }
    }, 2000);

    this.checkInterval = setInterval(async () => {
      try {
        if (await this.checkForUpdates()) {
          console.log('🎯 Atualização global detectada!');
          this.showUpdateToast();
        }
      } catch (error) {
        console.error('Erro:', error);
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
  VersionChecker.startChecking(8000);
});

window.addEventListener('beforeunload', () => {
  VersionChecker.stopChecking();
});

window.VersionChecker = VersionChecker;
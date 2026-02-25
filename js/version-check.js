const VersionChecker = {
  currentVersion: null,
  checkInterval: null,
  toastShown: false,
  lastCheck: 0,
  checkCount: 0,

  async generateHash(content) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Erro ao gerar hash:', error);
      return Date.now().toString();
    }
  },

  async getCurrentPageContent() {
    try {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      const response = await fetch(`${currentPage}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Erro ao buscar página:', error);
      return null;
    }
  },

  async checkForUpdates() {
    try {
      this.checkCount++;

      if (this.checkCount > 50 && this.lastCheck > 0) {
        const timeSinceLastCheck = Date.now() - this.lastCheck;
        if (timeSinceLastCheck < 5000) {
          console.log('Muitas verificações, aguardando...');
          return false;
        }
      }

      const content = await this.getCurrentPageContent();
      if (!content) return false;

      const newHash = await this.generateHash(content);
      
      console.log('Version check:', {
        current: this.currentVersion ? this.currentVersion.substring(0, 8) : 'none',
        new: newHash.substring(0, 8),
        timestamp: new Date().toLocaleTimeString()
      });

      if (!this.currentVersion) {
        this.currentVersion = newHash;
        this.lastCheck = Date.now();
        return false;
      }

      const hasChanged = this.currentVersion !== newHash;
      
      if (hasChanged) {
        console.log('🚀 Atualização detectada!');
        this.currentVersion = newHash;
        this.lastCheck = Date.now();
        return true;
      }

      this.lastCheck = Date.now();
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
      <svg viewBox="0 0 256 256" fill="currentColor" width="24" height="24">
        <path d="M240,128a104,104,0,0,1-208,0c0-51,36.9-93.4,86.1-101.6a8,8,0,0,1,3.8,15.6,88,88,0,1,0,73.8,0,8,8,0,1,1,3.8-15.6C203.1,34.6,240,77,240,128ZM128,32a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V40A8,8,0,0,0,128,32Z"></path>
      </svg>
      <div style="flex: 1;">
        <strong style="display: block; font-size: 14px;">Nova atualização disponível!</strong>
        <span style="font-size: 12px; color: #92400e;">Clique para atualizar a página</span>
      </div>
      <button onclick="VersionChecker.refreshPage()" class="toast-btn" style="background: #d97706; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 12px; transition: all 0.2s ease;">
        ATUALIZAR
      </button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .update-toast {
        background: #fffbeb !important;
        border: 2px solid #fbbf24 !important;
        border-left: 6px solid #d97706 !important;
        padding: 16px 20px !important;
        cursor: pointer;
        transition: all 0.2s ease;
        max-width: 380px !important;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
      }
      .update-toast svg {
        color: #d97706 !important;
      }
      .toast-btn:hover {
        background: #b45309 !important;
      }
      .toast-btn:active {
        transform: scale(0.95);
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
    console.log('VersionChecker iniciado - verificando a cada', interval/1000, 'segundos');

    setTimeout(async () => {
      const hasUpdate = await this.checkForUpdates();
      console.log('Primeira verificação:', hasUpdate ? 'Atualização encontrada' : 'Versão atual OK');
    }, 3000);

    this.checkInterval = setInterval(async () => {
      try {
        if (await this.checkForUpdates()) {
          console.log('Atualização detectada! Mostrando toast...');
          this.showUpdateToast();
        }
      } catch (error) {
        console.error('Erro no ciclo de verificação:', error);
      }
    }, interval);
  },

  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('VersionChecker parado');
    }
  },

  async forceCheck() {
    console.log('Forçando verificação de atualização...');
    if (await this.checkForUpdates()) {
      this.showUpdateToast();
      return true;
    }
    console.log('Nenhuma atualização encontrada');
    return false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('painel.html')) {
    console.log('Iniciando em:', window.location.pathname);
    VersionChecker.startChecking(15000);
  } else {
    console.log('VersionChecker desativado no painel admin');
  }
});

window.addEventListener('beforeunload', () => {
  VersionChecker.stopChecking();
});

window.VersionChecker = VersionChecker;
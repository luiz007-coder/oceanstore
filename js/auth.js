const Auth = {
  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 3; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `E-${randomPart}`;
  },

  async fetchHabboUser(nick) {
    try {
      const response = await fetch(`https://www.habbo.com.br/api/public/users?name=${encodeURIComponent(nick)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuário do Habbo:', error);
      return null;
    }
  },

  async verifyMotto(nick, code) {
    try {
      const habboUser = await this.fetchHabboUser(nick);
      if (!habboUser) return false;
      
      const motto = habboUser.motto || '';
      return motto.includes(code);
    } catch (error) {
      console.error('Erro na verificação:', error);
      return false;
    }
  },

  async startAuth(nick) {
    const isMember = await this.verifyMember(nick);
    if (!isMember) {
      return { 
        success: false, 
        error: 'Você não é membro da Escola de Formação de Executivos.' 
      };
    }

    const code = this.generateCode();

    const authData = {
      nick,
      code,
      expires: Date.now() + 10 * 60 * 1000
    };
    sessionStorage.setItem('habbo_auth', JSON.stringify(authData));
    
    return {
      success: true,
      code
    };
  },

  async checkAndLogin() {
    const authData = JSON.parse(sessionStorage.getItem('habbo_auth') || '{}');
    
    if (!authData.code || !authData.nick) {
      return { success: false, error: 'Nenhuma autenticação em andamento' };
    }

    if (Date.now() > authData.expires) {
      sessionStorage.removeItem('habbo_auth');
      return { success: false, error: 'Código expirado' };
    }

    const isValid = await this.verifyMotto(authData.nick, authData.code);
    
    if (isValid) {
      const result = await DB.users.findOrCreate(authData.nick);

      SessionManager.setUser(result.user);

      sessionStorage.removeItem('habbo_auth');
      
      return { 
        success: true, 
        user: result.user,
        isNew: result.created 
      };
    }
    
    return { success: false };
  },

  async verifyMember(nick) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Listagem de Membros!D20:D1000?key=${SHEETS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.values) return false;
      
      const members = data.values.map(row => row[0]?.trim().toLowerCase());
      return members.includes(nick.toLowerCase());
    } catch (error) {
      console.error('Erro ao verificar membro:', error);
      return false;
    }
  },

  async checkAuth() {
    if (!SessionManager.isAuthenticated()) {
      window.location.replace('index.html');
      return false;
    }
    
    const user = SessionManager.getUser();
    try {
      const dbUser = await DB.users.getByNick(user.nick);
      if (!dbUser || dbUser.banned) {
        this.logout();
        return false;
      }

      const isAdmin = await SheetsAPI.checkIsAdmin(user.nick);
      if (user.isAdmin !== isAdmin) {
        user.isAdmin = isAdmin;
        SessionManager.setUser(user);
        await DB.users.update(dbUser.id, { is_admin: isAdmin });
      }
      return true;
    } catch {
      return true;
    }
  },

  async checkAdmin() {
    const user = SessionManager.getUser();
    if (!user) {
      window.location.replace('index.html');
      return false;
    }
    
    const isAdmin = await SheetsAPI.checkIsAdmin(user.nick);
    if (!isAdmin) {
      window.location.replace('overview.html');
      return false;
    }
    return true;
  },

  logout() {
    SessionManager.logout();
    window.location.replace('index.html');
  }
};

const Auth = {
  generateCode() {
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `EFE-${random}`;
  },

  async verifyHabboMission(nick, code) {
    try {
      const existingUser = SessionManager.getUser();
      if (existingUser && existingUser.nick.toLowerCase() === nick.toLowerCase()) {
        return { success: true, skipVerification: true };
      }

      const response = await fetch(`https://www.habbo.com.br/api/public/users?name=${encodeURIComponent(nick)}`);
      
      if (!response.ok) {
        return { success: false, error: 'Usuário não encontrado no Habbo' };
      }

      const data = await response.json();

      const mission = data.motto || '';

      if (mission.includes(code)) {
        return { success: true };
      } else {
        return { success: false, error: 'Código não encontrado na missão' };
      }
    } catch (error) {
      console.error('Erro ao verificar Habbo:', error);
      return { success: false, error: 'Erro ao conectar com Habbo' };
    }
  },

  async login(nick) {
    try {
      const result = await DB.users.findOrCreate(nick);
      
      if (!result.created) {
        SessionManager.setUser(result.user);
        return { success: true, user: result.user, skipCode: true };
      }
    } catch (error) {
      console.error('Erro ao verificar usuário existente:', error);
    }

    const code = this.generateCode();
    SessionManager.set('verification_code', code);
    SessionManager.set('pending_nick', nick);
    return { success: false, code, requiresVerification: true };
  },

  async completeVerification() {
    const nick = SessionManager.get('pending_nick');
    const code = SessionManager.get('verification_code');
    
    if (!nick || !code) {
      return { success: false, error: 'Sessão inválida' };
    }

    try {
      const habboVerification = await this.verifyHabboMission(nick, code);
      
      if (!habboVerification.success) {
        return habboVerification;
      }

      const result = await DB.users.findOrCreate(nick);
      
      SessionManager.setUser(result.user);
      SessionManager.remove('verification_code');
      SessionManager.remove('pending_nick');
      
      return { success: true, user: result.user };
      
    } catch (error) {
      console.error('Erro na verificação:', error);
      return { success: false, error: 'Erro interno' };
    }
  },

  async checkAuth() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    
    const user = SessionManager.getUser();
    try {
      const isAdmin = await SheetsAPI.checkIsAdmin(user.nick);
      if (user.isAdmin !== isAdmin) {
        user.isAdmin = isAdmin;
        SessionManager.setUser(user);
        
        const dbUser = await DB.users.getByNick(user.nick);
        if (dbUser) {
          await DB.users.update(dbUser.id, { is_admin: isAdmin });
        }
      }
      return true;
    } catch {
      return true;
    }
  },

  async checkAdmin() {
    const user = SessionManager.getUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    
    const isAdmin = await SheetsAPI.checkIsAdmin(user.nick);
    if (!isAdmin) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  logout() {
    SessionManager.logout();
  }
};
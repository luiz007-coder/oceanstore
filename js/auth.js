const Auth = {
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

  async login(nick) {
    try {
      const isMember = await this.verifyMember(nick);
      
      if (!isMember) {
        return { 
          success: false, 
          error: 'Opa, parece que você não é membro da Escola de Formação de Executivos. Se acha que é um erro, contate o ministério da companhia.'
        };
      }

      const result = await DB.users.findOrCreate(nick);
      
      SessionManager.setUser(result.user);
      
      return { 
        success: true, 
        user: result.user,
        isNew: result.created 
      };
      
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro interno no servidor' };
    }
  },

  async checkAuth() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = 'index.html';
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
      window.location.href = 'index.html';
      return false;
    }
    
    const isAdmin = await SheetsAPI.checkIsAdmin(user.nick);
    if (!isAdmin) {
      window.location.href = 'overview.html';
      return false;
    }
    return true;
  },

  logout() {
    SessionManager.logout();
  }
};

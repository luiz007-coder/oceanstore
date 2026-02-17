const Auth = {
  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 3; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `A-${randomPart}`;
  },

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

  async login(nick, password, remember = false) {
    try {
      const passwordHash = await this.hashPassword(password);
      
      const users = await SupabaseClient.select('users', { 
        eq: { nick },
        select: 'id,nick,points,is_admin,banned,password_hash'
      });
      
      if (!users || users.length === 0) {
        return { success: false, error: 'Usuário não encontrado. Crie uma conta' };
      }

      const user = users[0];

      if (user.banned) {
        return { success: false, error: 'Usuário banido' };
      }

      if (user.password_hash !== passwordHash) {
        return { success: false, error: 'Senha incorreta' };
      }

      const isAdmin = await SheetsAPI.checkIsAdmin(nick);
      if (user.is_admin !== isAdmin) {
        await DB.users.update(user.id, { is_admin: isAdmin });
        user.is_admin = isAdmin;
      }

      await DB.users.update(user.id, { last_login: new Date().toISOString() });

      const sessionUser = {
        id: user.id,
        nick: user.nick,
        points: user.points || 0,
        isAdmin: user.is_admin
      };

      SessionManager.setUser(sessionUser);

      if (remember) {
        await this.createRememberToken(user.id);
      }

      return { success: true, user: sessionUser };

    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  },

  async createRememberToken(userId) {
    try {
      const token = Math.random().toString(36).substring(2) + 
                    Math.random().toString(36).substring(2);
      
      const expires = new Date();
      expires.setDate(expires.getDate() + 5);

      await SupabaseClient.insert('remember_tokens', {
        user_id: userId,
        token: token,
        expires_at: expires.toISOString()
      });

      localStorage.setItem('remember_token', token);
      localStorage.setItem('token_expires', expires.toISOString());

      return token;
    } catch (error) {
      console.error('Erro ao criar token:', error);
      return null;
    }
  },

  async checkRememberToken() {
    try {
      const token = localStorage.getItem('remember_token');
      const expires = localStorage.getItem('token_expires');

      if (!token || !expires) return null;
      if (new Date(expires) < new Date()) {
        localStorage.removeItem('remember_token');
        localStorage.removeItem('token_expires');
        return null;
      }

      const tokens = await SupabaseClient.select('remember_tokens', {
        eq: { token },
        select: '*, users!remember_tokens_user_id_fkey(id,nick,points,is_admin,banned)'
      });

      if (!tokens || tokens.length === 0) {
        localStorage.removeItem('remember_token');
        localStorage.removeItem('token_expires');
        return null;
      }

      const tokenData = tokens[0];
      const user = tokenData.users;

      if (user.banned) {
        localStorage.removeItem('remember_token');
        localStorage.removeItem('token_expires');
        return null;
      }

      const isAdmin = await SheetsAPI.checkIsAdmin(user.nick);
      if (user.is_admin !== isAdmin) {
        await DB.users.update(user.id, { is_admin: isAdmin });
        user.is_admin = isAdmin;
      }

      const sessionUser = {
        id: user.id,
        nick: user.nick,
        points: user.points || 0,
        isAdmin: user.is_admin
      };

      SessionManager.setUser(sessionUser);
      return sessionUser;

    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return null;
    }
  },

  async startRegistration(nick, password, remember = false) {
    try {
      const isMember = await this.verifyMember(nick);
      if (!isMember) {
        return { 
          success: false, 
          error: 'Apenas membros da companhia podem criar conta.' 
        };
      }

      const existingUser = await DB.users.getByNick(nick);
      if (existingUser) {
        return { success: false, error: 'Usuário já existe. Faça login.' };
      }

      const code = this.generateCode();
      const passwordHash = await this.hashPassword(password);

      const authData = {
        type: 'register',
        nick,
        passwordHash,
        remember,
        code,
        expires: Date.now() + 10 * 60 * 1000
      };
      sessionStorage.setItem('habbo_auth', JSON.stringify(authData));
      
      return { success: true, code };

    } catch (error) {
      console.error('Erro ao iniciar registro:', error);
      return { success: false, error: 'Erro ao iniciar registro' };
    }
  },

  async checkAndCompleteRegistration() {
    const authData = JSON.parse(sessionStorage.getItem('habbo_auth') || '{}');
    
    if (!authData.code || !authData.nick || authData.type !== 'register') {
      return { success: false, error: 'Nenhum registro em andamento' };
    }

    if (Date.now() > authData.expires) {
      sessionStorage.removeItem('habbo_auth');
      return { success: false, error: 'Código expirado' };
    }

    const isValid = await this.verifyMotto(authData.nick, authData.code);
    
    if (isValid) {
      try {
        const isMember = await this.verifyMember(authData.nick);
        if (!isMember) {
          sessionStorage.removeItem('habbo_auth');
          return { success: false, error: 'Você não é membro da EFE' };
        }

        const newUser = {
          nick: authData.nick,
          password_hash: authData.passwordHash,
          points: 0,
          is_admin: false,
          banned: false,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };

        const created = await DB.users.create(newUser);
        const userData = created[0];

        const isAdmin = await SheetsAPI.checkIsAdmin(authData.nick);
        if (isAdmin) {
          await DB.users.update(userData.id, { is_admin: true });
          userData.is_admin = true;
        }

        const sessionUser = {
          id: userData.id,
          nick: userData.nick,
          points: userData.points || 0,
          isAdmin: userData.is_admin
        };

        SessionManager.setUser(sessionUser);

        if (authData.remember) {
          await this.createRememberToken(userData.id);
        }

        sessionStorage.removeItem('habbo_auth');
        
        return { success: true, user: sessionUser };

      } catch (error) {
        console.error('Erro ao completar registro:', error);
        return { success: false, error: 'Erro ao criar conta' };
      }
    }
    
    return { success: false };
  },

  async startPasswordReset(nick, newPassword) {
    try {
      const existingUser = await DB.users.getByNick(nick);
      if (!existingUser) {
        return { success: false, error: 'Usuário não encontrado. Crie uma conta' };
      }

      if (existingUser.banned) {
        return { success: false, error: 'Usuário banido' };
      }

      const isMember = await this.verifyMember(nick);
      if (!isMember) {
        return { 
          success: false, 
          error: 'Você não é membro da EFE. Contate um administrador.' 
        };
      }

      const code = this.generateCode();
      const passwordHash = await this.hashPassword(newPassword);

      const authData = {
        type: 'reset',
        userId: existingUser.id,
        nick,
        passwordHash,
        code,
        expires: Date.now() + 10 * 60 * 1000
      };
      sessionStorage.setItem('habbo_auth', JSON.stringify(authData));
      
      return { success: true, code };

    } catch (error) {
      console.error('Erro ao iniciar redefinição:', error);
      return { success: false, error: 'Erro ao iniciar redefinição' };
    }
  },

  async checkAndCompletePasswordReset() {
    const authData = JSON.parse(sessionStorage.getItem('habbo_auth') || '{}');
    
    if (!authData.code || !authData.nick || authData.type !== 'reset') {
      return { success: false, error: 'Nenhuma redefinição em andamento' };
    }

    if (Date.now() > authData.expires) {
      sessionStorage.removeItem('habbo_auth');
      return { success: false, error: 'Código expirado' };
    }

    const isValid = await this.verifyMotto(authData.nick, authData.code);
    
    if (isValid) {
      try {
        const isMember = await this.verifyMember(authData.nick);
        if (!isMember) {
          sessionStorage.removeItem('habbo_auth');
          return { success: false, error: 'Você não é membro da EFE' };
        }

        await DB.users.update(authData.userId, { 
          password_hash: authData.passwordHash 
        });

        sessionStorage.removeItem('habbo_auth');
        
        return { success: true };

      } catch (error) {
        console.error('Erro ao completar redefinição:', error);
        return { success: false, error: 'Erro ao redefinir senha' };
      }
    }
    
    return { success: false };
  },

  logout() {
    localStorage.removeItem('remember_token');
    localStorage.removeItem('token_expires');
    
    SessionManager.logout();
    window.location.replace('index.html');
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
  }
};
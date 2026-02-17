const SUPABASE_URL = 'https://kehfrbisivbgystrkryn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlaGZyYmlzaXZiZ3lzdHJrcnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTA1MTUsImV4cCI6MjA4NjgyNjUxNX0.25Yf1A-VirdmWSicxmy4BZtZprY7dODmeAKW-TWyD_k';
const SHEETS_API_KEY = 'AIzaSyCpy7bGVYkINBv0TyCOGz8uzn2mzS2r7UQ';
const SHEETS_ID = '1yUGFjRJZHlG525ZhoiDgbbYl_cm-tASVQwzTgvNww30';

const SupabaseClient = {
  async request(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase error response:', errorText);
        throw new Error(`Supabase error (${response.status}): ${errorText}`);
      }
      
      if (response.status === 204) {
        return null;
      }
      
      return response.json();
    } catch (error) {
      console.error('Supabase request failed:', error);
      throw error;
    }
  },

  async select(table, query = {}) {
    const params = new URLSearchParams();
    
    if (query.select) {
      params.append('select', query.select);
    }
    
    if (query.eq) {
      Object.entries(query.eq).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(`${key}`, `eq.${value}`);
        }
      });
    }
    
    if (query.order) {
      params.append('order', `${query.order.column}.${query.order.ascending ? 'asc' : 'desc'}`);
    }
    
    if (query.limit) {
      params.append('limit', query.limit);
    }
    
    const endpoint = `${table}?${params.toString()}`;
    return this.request(endpoint);
  },

  async insert(table, data) {
    return this.request(table, {
      method: 'POST',
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
  },

  async update(table, id, data) {
    return this.request(`${table}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async upsert(table, data) {
    return this.request(table, {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify(Array.isArray(data) ? data : [data])
    });
  },

  async delete(table, id) {
    return this.request(`${table}?id=eq.${id}`, {
      method: 'DELETE'
    });
  }
};

const SheetsAPI = {
  async getAdmins() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Listagem de Membros!C2:D1000?key=${SHEETS_API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.values) return [];
      
      const adminCargos = [
        'Estagiário(a)', 'Ministro(a) da Segurança', 'Ministro(a) da Atualização',
        'Ministro(a) da Administração', 'Ministro(a) das Finanças', 'Ministro(a) da Contabilidade',
        'Ministro(a) da Assistência', 'Vice-Líder', 'Líder'
      ];
      
      return data.values
        .filter(row => row[0] && adminCargos.includes(row[0].trim()))
        .map(row => ({
          cargo: row[0].trim(),
          nick: row[1] ? row[1].trim() : ''
        }))
        .filter(admin => admin.nick);
    } catch (error) {
      console.error('Erro ao buscar admins:', error);
      return [];
    }
  },

  async checkIsAdmin(nick) {
    try {
      const admins = await this.getAdmins();
      return admins.some(admin => admin.nick.toLowerCase() === nick.toLowerCase());
    } catch {
      return false;
    }
  },

  async getAllMembers() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Listagem de Membros!B2:B1000?key=${SHEETS_API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.values ? data.values.map(row => row[0].trim()) : [];
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      return [];
    }
  }
};

const Toast = {
  show(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg viewBox="0 0 256 256" fill="currentColor">
        ${type === 'success' ? '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-125.66a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,140.69l50.34-50.35A8,8,0,0,1,173.66,90.34Z"/>' : 
        type === 'error' ? '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/>' :
        '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"/>'}
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

const DB = {
  users: {
    async getByNick(nick) {
      try {
        const result = await SupabaseClient.select('users', { eq: { nick } });
        return result && result.length > 0 ? result[0] : null;
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
      }
    },
    
    async getAll() {
      try {
        return await SupabaseClient.select('users', { order: { column: 'points', ascending: false } });
      } catch (error) {
        console.error('Erro ao buscar todos usuários:', error);
        return [];
      }
    },
    
    async create(data) {
      try {
        const result = await SupabaseClient.insert('users', data);
        return result;
      } catch (error) {
        console.error('Erro ao criar usuário:', error);
        throw error;
      }
    },
    
    async update(id, data) {
      try {
        return await SupabaseClient.update('users', id, data);
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
      }
    },
    
    async updatePoints(id, points) {
      return this.update(id, { points });
    },
    
    async ban(id) {
      return this.update(id, { banned: true, banned_at: new Date().toISOString() });
    },
    
    async unban(id) {
      return this.update(id, { banned: false, banned_at: null });
    },
    
    async findOrCreate(nick) {
      try {
        let user = await this.getByNick(nick);
        
        if (user) {
          if (user.banned) {
            throw new Error('Usuário banido');
          }
          
          const isAdmin = await SheetsAPI.checkIsAdmin(nick);
          if (user.is_admin !== isAdmin) {
            await this.update(user.id, { is_admin: isAdmin });
            user.is_admin = isAdmin;
          }
          
          return { 
            created: false,
            user: { 
              id: user.id, 
              nick: user.nick, 
              points: user.points || 0,
              isAdmin: user.is_admin
            } 
          };
        }
        
        const isAdmin = await SheetsAPI.checkIsAdmin(nick);
        const newUser = {
          nick,
          points: 0,
          is_admin: isAdmin,
          banned: false,
          created_at: new Date().toISOString()
        };
        
        const created = await this.create(newUser);
        const newUserData = created[0];
        
        return { 
          created: true,
          user: { 
            id: newUserData.id, 
            nick: newUserData.nick, 
            points: newUserData.points || 0,
            isAdmin: newUserData.is_admin
          } 
        };
        
      } catch (error) {
        console.error('Erro no findOrCreate:', error);
        throw error;
      }
    }
  },

  redemptions: {
    async getAll() {
      try {
        return await SupabaseClient.select('redemptions', { 
          order: { column: 'created_at', ascending: false },
          select: '*, users!redemptions_user_id_fkey(nick)'
        });
      } catch (error) {
        console.error('Erro ao buscar resgates:', error);
        return [];
      }
    },
    
    async getByUser(userId) {
      try {
        return await SupabaseClient.select('redemptions', { 
          eq: { user_id: userId }, 
          order: { column: 'created_at', ascending: false }
        });
      } catch (error) {
        console.error('Erro ao buscar resgates do usuário:', error);
        return [];
      }
    },
    
    async create(data) {
      try {
        return await SupabaseClient.insert('redemptions', data);
      } catch (error) {
        console.error('Erro ao criar resgate:', error);
        throw error;
      }
    },
    
    async updateStatus(id, status) {
      try {
        return await SupabaseClient.update('redemptions', id, { status });
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }
    },
    
    async getPending() {
      try {
        return await SupabaseClient.select('redemptions', { 
          eq: { status: 'pending' },
          order: { column: 'created_at', ascending: true }
        });
      } catch (error) {
        console.error('Erro ao buscar resgates pendentes:', error);
        return [];
      }
    },
    
    async getPendingCount() {
      try {
        const result = await SupabaseClient.select('redemptions', { 
          select: 'id',
          eq: { status: 'pending' }
        });
        return result ? result.length : 0;
      } catch (error) {
        console.error('Erro ao contar resgates pendentes:', error);
        return 0;
      }
    },
    
    async getQueue() {
      try {
        const pending = await this.getPending();
        const userPendingCounts = {};
        pending.forEach(r => {
          userPendingCounts[r.user_id] = (userPendingCounts[r.user_id] || 0) + 1;
        });
        
        const userIds = Object.keys(userPendingCounts);
        const users = await DB.users.getAll();

        const queueUsers = users
          .filter(u => userIds.includes(u.id.toString()) && !u.banned)
          .map(u => ({
            ...u,
            pending_count: userPendingCounts[u.id]
          }))
          .sort((a, b) => b.points - a.points);
        
        console.log('Queue ordenada (maior para menor):', queueUsers.map(u => ({ nick: u.nick, points: u.points })));
        return queueUsers;
      } catch (error) {
        console.error('Erro ao buscar fila:', error);
        return [];
      }
    },
    
    async getCurrentTurn() {
      try {
        const store = await DB.store.getStatus();
        if (!store.current_user_id) return null;
        
        const user = await SupabaseClient.select('users', { 
          eq: { id: store.current_user_id },
          select: 'id,nick,points'
        });
        
        if (user && user[0]) {
          return user[0];
        }

        await SupabaseClient.update('store_settings', 1, { 
          current_user_id: null,
          turn_start_time: null
        });
        
        return null;
      } catch (error) {
        console.error('Erro ao buscar vez atual:', error);
        return null;
      }
    },
    
    async processNextTurn() {
      try {
        const store = await DB.store.getStatus();
        if (!store.is_open) return null;
        
        const queue = await this.getQueue();
        console.log('Queue for next turn:', queue);
        
        if (queue.length === 0) {
          await SupabaseClient.update('store_settings', 1, { 
            current_user_id: null,
            turn_start_time: null
          });
          return null;
        }
        
        const nextUser = queue[0];
        console.log('Next user in turn:', nextUser);
        
        await SupabaseClient.update('store_settings', 1, { 
          current_user_id: nextUser.id,
          turn_start_time: new Date().toISOString()
        });
        
        return nextUser;
      } catch (error) {
        console.error('Erro ao processar próximo turno:', error);
        return null;
      }
    },
    
    async completeTurn(userId) {
      try {
        const store = await DB.store.getStatus();
        if (store.current_user_id !== userId) return false;
        
        await this.processNextTurn();
        return true;
      } catch (error) {
        console.error('Erro ao completar turno:', error);
        return false;
      }
    }
  },

  rewards: {
    async getAll() {
      try {
        return await SupabaseClient.select('rewards', { order: { column: 'category', ascending: true } });
      } catch (error) {
        console.error('Erro ao buscar recompensas:', error);
        return [];
      }
    },
    
    async getById(id) {
      try {
        const result = await SupabaseClient.select('rewards', { eq: { id } });
        return result && result[0] ? result[0] : null;
      } catch (error) {
        console.error('Erro ao buscar recompensa:', error);
        return null;
      }
    },
    
    async getByCategory(category) {
      try {
        return await SupabaseClient.select('rewards', { eq: { category } });
      } catch (error) {
        console.error('Erro ao buscar recompensas por categoria:', error);
        return [];
      }
    },
    
    async create(data) {
      try {
        return await SupabaseClient.insert('rewards', data);
      } catch (error) {
        console.error('Erro ao criar recompensa:', error);
        throw error;
      }
    },
    
    async update(id, data) {
      try {
        return await SupabaseClient.update('rewards', id, data);
      } catch (error) {
        console.error('Erro ao atualizar recompensa:', error);
        throw error;
      }
    },
    
    async delete(id) {
      try {
        return await SupabaseClient.delete('rewards', id);
      } catch (error) {
        console.error('Erro ao deletar recompensa:', error);
        throw error;
      }
    }
  },

  missions: {
    async getAll() {
      try {
        return await SupabaseClient.select('missions', { order: { column: 'points', ascending: true } });
      } catch (error) {
        console.error('Erro ao buscar missões:', error);
        return [];
      }
    },
    
    async create(data) {
      try {
        return await SupabaseClient.insert('missions', data);
      } catch (error) {
        console.error('Erro ao criar missão:', error);
        throw error;
      }
    },
    
    async update(id, data) {
      try {
        return await SupabaseClient.update('missions', id, data);
      } catch (error) {
        console.error('Erro ao atualizar missão:', error);
        throw error;
      }
    },
    
    async delete(id) {
      try {
        return await SupabaseClient.delete('missions', id);
      } catch (error) {
        console.error('Erro ao deletar missão:', error);
        throw error;
      }
    },
    
    async submit(userId, missionId, proofUrl) {
      try {
        const mission = await SupabaseClient.select('missions', { eq: { id: missionId } });
        if (!mission || !mission[0]) throw new Error('Missão não encontrada');

        return await SupabaseClient.insert('user_missions', {
          user_id: userId,
          mission_id: missionId,
          points_earned: mission[0].points,
          status: 'pending',
          proof_url: proofUrl,
          completed_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro ao submeter missão:', error);
        throw error;
      }
    },
    
    async getPendingWithDetails() {
      try {
        return await SupabaseClient.select('user_missions', { 
          eq: { status: 'pending' },
          order: { column: 'completed_at', ascending: true },
          select: '*, users!user_missions_user_id_fkey(nick), missions(name, points)'
        });
      } catch (error) {
        console.error('Erro ao buscar missões pendentes:', error);
        return [];
      }
    },
    
    async getByUserWithDetails(userId) {
      try {
        return await SupabaseClient.select('user_missions', { 
          eq: { user_id: userId },
          order: { column: 'completed_at', ascending: false },
          select: '*, missions(name, points)'
        });
      } catch (error) {
        console.error('Erro ao buscar missões do usuário:', error);
        return [];
      }
    },
    
    async getTodayCount() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const result = await SupabaseClient.select('user_missions', {
          select: 'id',
          eq: { status: 'approved' },
          gte: { completed_at: today.toISOString() },
          lt: { completed_at: tomorrow.toISOString() }
        });
        
        return result ? result.length : 0;
      } catch (error) {
        console.error('Erro ao contar missões hoje:', error);
        return 0;
      }
    },
    
    async getByUser(userId) {
      try {
        return await SupabaseClient.select('user_missions', {
          eq: { user_id: userId }
        });
      } catch (error) {
        console.error('Erro ao buscar missões do usuário:', error);
        return [];
      }
    },
    
    async approve(id, adminId) {
      try {
        const userMission = await SupabaseClient.select('user_missions', { 
          eq: { id },
          select: '*, users!user_missions_user_id_fkey(id,points), missions(points)'
        });
        
        if (!userMission || !userMission[0]) throw new Error('Missão não encontrada');
        
        const missionData = userMission[0];
        const pointsToAdd = missionData.missions.points;
        const newPoints = (missionData.users.points || 0) + pointsToAdd;
        await DB.users.update(missionData.user_id, { points: newPoints });

        return await SupabaseClient.update('user_missions', id, { 
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null
        });
      } catch (error) {
        console.error('Erro ao aprovar missão:', error);
        throw error;
      }
    },
    
    async reject(id, reason, adminId) {
      try {
        if (!reason || reason.trim() === '') {
          throw new Error('Motivo da rejeição é obrigatório');
        }
        
        return await SupabaseClient.update('user_missions', id, { 
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro ao rejeitar missão:', error);
        throw error;
      }
    }
  },

  rankings: {
    async getTop(limit = 10) {
      try {
        return await SupabaseClient.select('users', { 
          select: 'nick,points,is_admin,banned',
          eq: { banned: false },
          order: { column: 'points', ascending: false },
          limit 
        });
      } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        return [];
      }
    },
    
    async getUserPosition(userId) {
      try {
        const users = await SupabaseClient.select('users', { 
          select: 'id,points',
          eq: { banned: false },
          order: { column: 'points', ascending: false }
        });
        if (!users) return 0;
        const index = users.findIndex(u => u.id === userId);
        return index + 1;
      } catch (error) {
        console.error('Erro ao buscar posição do usuário:', error);
        return 0;
      }
    },
    
    async getFullRanking() {
      try {
        return await SupabaseClient.select('users', {
          select: 'id,nick,points,is_admin,banned',
          order: { column: 'points', ascending: false }
        });
      } catch (error) {
        console.error('Erro ao buscar ranking completo:', error);
        return [];
      }
    }
  },

  store: {
    async getStatus() {
      try {
        const data = await SupabaseClient.select('store_settings', { eq: { id: 1 } });
        return (data && data[0]) || { 
          is_open: false, 
          next_open_date: null,
          current_user_id: null,
          turn_start_time: null,
          auto_close_date: null,
          last_reset_date: null
        };
      } catch (error) {
        console.error('Erro ao buscar status da loja:', error);
        return { is_open: false, next_open_date: null, current_user_id: null };
      }
    },
    
    async setStatus(isOpen, nextOpenDate = null) {
      try {
        let autoCloseDate = null;

        if (!isOpen) {
          const users = await DB.users.getAll();
          
          for (const user of users) {
            await DB.users.update(user.id, { points: 0 });
          }

          const now = new Date();
          let nextDate;
          
          if (now.getDate() >= 5) {
            if (now.getMonth() === 11) {
              nextDate = new Date(now.getFullYear() + 1, 0, 5, 0, 0, 0);
            } else {
              nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 5, 0, 0, 0);
            }
          } else {
            nextDate = new Date(now.getFullYear(), now.getMonth(), 5, 0, 0, 0);
          }
          
          nextOpenDate = nextDate.toISOString();
          
          Toast.show(`Pontos resetados! Próxima abertura: ${nextDate.toLocaleDateString('pt-BR')}`, 'success');
        }

        if (isOpen) {
          const closeDate = new Date();
          closeDate.setDate(closeDate.getDate() + 5);
          autoCloseDate = closeDate.toISOString();

          setTimeout(async () => {
            await DB.redemptions.processNextTurn();
          }, 100);
        }
        
        const existing = await SupabaseClient.select('store_settings', { eq: { id: 1 } });
        
        if (existing && existing.length > 0) {
          return await SupabaseClient.update('store_settings', 1, { 
            is_open: isOpen, 
            next_open_date: nextOpenDate,
            auto_close_date: autoCloseDate,
            current_user_id: isOpen ? null : null,
            turn_start_time: isOpen ? null : null,
            updated_at: new Date().toISOString()
          });
        } else {
          return await SupabaseClient.insert('store_settings', { 
            id: 1, 
            is_open: isOpen, 
            next_open_date: nextOpenDate,
            auto_close_date: autoCloseDate,
            current_user_id: null,
            turn_start_time: null,
            last_reset_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Erro ao salvar status da loja:', error);
        return null;
      }
    },

    async resetCurrentTurn() {
      try {
        await SupabaseClient.update('store_settings', 1, { 
          current_user_id: null,
          turn_start_time: null
        });
        return true;
      } catch (error) {
        console.error('Erro ao resetar turno:', error);
        return false;
      }
    },
    
    async checkAutoClose() {
      try {
        const store = await this.getStatus();
        if (!store.is_open || !store.auto_close_date) return false;
        
        const now = new Date();
        const closeDate = new Date(store.auto_close_date);

        if (now >= closeDate) {
          const users = await DB.users.getAll();
          for (const user of users) {
            await DB.users.update(user.id, { points: 0 });
          }

          const nextDate = new Date();
          if (nextDate.getDate() >= 10) {
            if (nextDate.getMonth() === 11) {
              nextDate.setFullYear(nextDate.getFullYear() + 1, 0, 5);
            } else {
              nextDate.setMonth(nextDate.getMonth() + 1, 5);
            }
          } else {
            nextDate.setDate(5);
          }
          
          await this.setStatus(false, nextDate.toISOString());
          
          console.log('Pontos resetados. Loja fechada até', nextDate.toLocaleDateString());

          if (typeof Toast !== 'undefined') {
            Toast.show(`Loja fechada! Pontos resetados. Próxima abertura: ${nextDate.toLocaleDateString('pt-BR')}`, 'warning');
          }
          
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro no auto close:', error);
        return false;
      }
    },
    
    async checkAndOpenNext() {
      try {
        const store = await this.getStatus();
        if (store.is_open) return false;
        
        const now = new Date();
        const currentDay = now.getDate();

        if (currentDay === 5) {
          if (!store.next_open_date || new Date(store.next_open_date) <= now) {
            const closeDate = new Date();
            closeDate.setDate(closeDate.getDate() + 5);
            
            await this.setStatus(true, null);

            await SupabaseClient.update('store_settings', 1, { 
              auto_close_date: closeDate.toISOString()
            });
            
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('Erro no auto open:', error);
        return false;
      }
    },
    
    async getRemainingTime() {
      try {
        const store = await this.getStatus();
        if (!store.turn_start_time) return 0;
        
        const startTime = new Date(store.turn_start_time).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000 / 60);
        const remaining = 60 - elapsed;
        
        return remaining > 0 ? remaining : 0;
      } catch (error) {
        console.error('Erro ao calcular tempo restante:', error);
        return 0;
      }
    },
    
    async getRemainingDays() {
      try {
        const store = await this.getStatus();
        if (!store.is_open || !store.auto_close_date) return 0;
        
        const now = new Date();
        const closeDate = new Date(store.auto_close_date);
        const diffTime = closeDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 0;
      } catch (error) {
        console.error('Erro ao calcular dias restantes:', error);
        return 0;
      }
    },
  
    async calculateNextOpenDate() {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let nextOpenDate;

      if (currentDay < 5) {
        nextOpenDate = new Date(currentYear, currentMonth, 5, 0, 0, 0);
      } 
      else {
        if (currentMonth === 11) {
          nextOpenDate = new Date(currentYear + 1, 0, 5, 0, 0, 0);
        } else {
          nextOpenDate = new Date(currentYear, currentMonth + 1, 5, 0, 0, 0);
        }
      }
      
      return nextOpenDate.toISOString();
    },
    
    async checkTurnExpired() {
      try {
        const store = await this.getStatus();
        if (!store.is_open || !store.current_user_id || !store.turn_start_time) return false;
        
        const remaining = await this.getRemainingTime();
        if (remaining <= 0) {
          await DB.redemptions.processNextTurn();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro ao verificar turno expirado:', error);
        return false;
      }
    }
  }
};
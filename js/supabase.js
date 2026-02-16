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
        return await SupabaseClient.insert('users', data);
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
    
    async findOrCreate(nick) {
      try {
        let user = await this.getByNick(nick);
        
        if (user) {
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
              points: user.points,
              isAdmin: user.is_admin
            } 
          };
        }
        
        const isAdmin = await SheetsAPI.checkIsAdmin(nick);
        const newUser = {
          nick,
          points: 0,
          is_admin: isAdmin,
          created_at: new Date().toISOString()
        };
        
        const created = await this.create(newUser);
        const newUserData = created[0];
        
        return { 
          created: true,
          user: { 
            id: newUserData.id, 
            nick: newUserData.nick, 
            points: newUserData.points,
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
          select: '*, users(nick)'
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
        const userIds = [...new Set(pending.map(r => r.user_id))];
        
        const users = await DB.users.getAll();
        return users
          .filter(u => userIds.includes(u.id))
          .sort((a, b) => a.points - b.points);
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
        
        return user && user[0] ? user[0] : null;
      } catch (error) {
        console.error('Erro ao buscar vez atual:', error);
        return null;
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
    
    async submit(userId, missionId) {
      try {
        const mission = await SupabaseClient.select('missions', { eq: { id: missionId } });
        if (!mission || !mission[0]) throw new Error('Missão não encontrada');

        return await SupabaseClient.insert('user_missions', {
          user_id: userId,
          mission_id: missionId,
          points_earned: mission[0].points,
          status: 'pending',
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
          select: 'nick,points',
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
          select: 'id,nick,points,is_admin',
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
          queue: []
        };
      } catch (error) {
        console.error('Erro ao buscar status da loja:', error);
        return { is_open: false, next_open_date: null, current_user_id: null };
      }
    },
    
    async setStatus(isOpen, nextOpenDate = null) {
      try {
        const existing = await SupabaseClient.select('store_settings', { eq: { id: 1 } });
        if (existing && existing.length > 0) {
          return await SupabaseClient.update('store_settings', 1, { 
            is_open: isOpen, 
            next_open_date: nextOpenDate,
            current_user_id: isOpen ? null : existing[0].current_user_id,
            turn_start_time: null,
            updated_at: new Date().toISOString()
          });
        } else {
          return await SupabaseClient.insert('store_settings', { 
            id: 1, 
            is_open: isOpen, 
            next_open_date: nextOpenDate,
            current_user_id: null,
            turn_start_time: null,
            created_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Erro ao salvar status da loja:', error);
        return null;
      }
    },
    
    async startTurn(userId) {
      try {
        return await SupabaseClient.update('store_settings', 1, {
          current_user_id: userId,
          turn_start_time: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro ao iniciar turno:', error);
        return null;
      }
    },
    
    async nextTurn() {
      try {
        const store = await this.getStatus();
        const users = await DB.users.getAll();

        const currentIndex = users.findIndex(u => u.id === store.current_user_id);

        const nextUser = users[currentIndex + 1];
        
        if (nextUser) {
          return await SupabaseClient.update('store_settings', 1, {
            current_user_id: nextUser.id,
            turn_start_time: new Date().toISOString()
          });
        } else {
          return await SupabaseClient.update('store_settings', 1, {
            current_user_id: null,
            turn_start_time: null
          });
        }
      } catch (error) {
        console.error('Erro ao passar turno:', error);
        return null;
      }
    },
    
    async skipTurn() {
      return this.nextTurn();
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
    
    async checkAndAutoSkip() {
      try {
        const remaining = await this.getRemainingTime();
        if (remaining <= 0) {
          await this.nextTurn();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro no auto skip:', error);
        return false;
      }
    }
  }
};
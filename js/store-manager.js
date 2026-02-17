const StoreManager = {
  async checkTurnExpired() {
    try {
      const store = await DB.store.getStatus();
      if (!store.is_open || !store.current_user_id || !store.turn_start_time) return false;
      
      const startTime = new Date(store.turn_start_time).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000 / 60);
      
      if (elapsed >= 60) {
        console.log('Turn expired, processing next turn');
        await DB.redemptions.processNextTurn();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar turno expirado:', error);
      return false;
    }
  },

  async getRemainingTime() {
    try {
      const store = await DB.store.getStatus();
      if (!store.turn_start_time) return 0;
      
      const startTime = new Date(store.turn_start_time).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = 3600 - elapsed;
      
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      console.error('Erro ao calcular tempo restante:', error);
      return 0;
    }
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};
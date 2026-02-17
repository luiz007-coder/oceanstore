const StoreManager = {
  async checkTurnExpired() {
    try {
      const store = await DB.store.getStatus();
      if (!store.is_open || !store.current_user_id || !store.turn_start_time) return false;
      
      const remaining = await DB.store.getRemainingTime();
      if (remaining <= 0) {
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

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};
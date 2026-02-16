const ProfileHeader = {
  init() {
    this.render();
    this.attachEvents();
  },

  render() {
    const user = SessionManager.getUser();
    if (!user) return;

    const existing = document.getElementById('profile-header');
    if (existing) existing.remove();

    const header = document.createElement('div');
    header.id = 'profile-header';
    header.innerHTML = `
      <div class="profile-trigger">
        <span class="profile-nick">${user.nick}</span>
        <span class="profile-points">${user.points} pts</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="profile-dropdown">
        <div class="dropdown-item">
          <span class="label">Nick</span>
          <span class="value">${user.nick}</span>
        </div>
        <div class="dropdown-item">
          <span class="label">Pontos</span>
          <span class="value">${user.points}</span>
        </div>
        ${user.isAdmin ? `
        <div class="dropdown-divider"></div>
        <a href="painel.html" class="dropdown-link">Painel admin</a>
        ` : ''}
        <div class="dropdown-divider"></div>
        <button class="logout-btn" onclick="Auth.logout()">Sair</button>
      </div>
    `;
    document.body.appendChild(header);
  },

  attachEvents() {
    document.addEventListener('click', (e) => {
      const header = document.getElementById('profile-header');
      if (!header) return;
      
      const trigger = header.querySelector('.profile-trigger');
      const dropdown = header.querySelector('.profile-dropdown');
      
      if (trigger.contains(e.target)) {
        dropdown.classList.toggle('active');
      } else if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  },

  update() {
    this.render();
  }
};

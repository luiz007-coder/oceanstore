const ProfileHeader = {
  init() {
    this.render();
    this.attachEvents();
  },

  getAvatarUrl(nick) {
    return `https://www.habbo.com.br/habbo-imaging/avatarimage?&user=${encodeURIComponent(nick)}&action=std&direction=2&head_direction=2&img_format=png&gesture=std&headonly=1&size=l`;
  },

  render() {
    const user = SessionManager.getUser();
    if (!user) return;

    const existing = document.getElementById('profile-header');
    if (existing) existing.remove();

    const avatarUrl = this.getAvatarUrl(user.nick);

    const header = document.createElement('div');
    header.id = 'profile-header';
    header.innerHTML = `
      <div class="profile-trigger">
        <img src="${avatarUrl}" alt="${user.nick}" class="profile-avatar">
        <span class="profile-nick">${user.nick}</span>
        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path>
        </svg>
      </div>
      <div class="profile-dropdown">
        <div class="dropdown-user">
          <img src="${avatarUrl}" alt="${user.nick}" class="dropdown-avatar">
          <div class="dropdown-user-info">
            <span class="dropdown-user-nick">${user.nick}</span>
            <span class="dropdown-user-points">${user.points} pontos</span>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        ${user.isAdmin ? `
          <a href="painel.html" class="dropdown-item">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z"></path>
            </svg>
            <span>Painel Admin</span>
          </a>
        ` : ''}
        <div class="dropdown-divider"></div>
        <button class="dropdown-item logout-btn" onclick="Auth.logout()">
          <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
            <path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z"></path>
          </svg>
          <span>Sair</span>
        </button>
      </div
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

const ProfileHeader = {
  init() {
    this.render();
    this.attachEvents();
    this.updateSidebarUser();
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
        <i class="ph ph-caret-down"></i>
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
        <button class="dropdown-item logout-btn" onclick="Auth.logout()">
          <i class="ph ph-sign-out"></i>
          <span>Sair</span>
        </button>
      </div>
    `;
    document.body.appendChild(header);
  },

  updateSidebarUser() {
    const user = SessionManager.getUser();
    if (!user) return;

    const avatarUrl = this.getAvatarUrl(user.nick);
    
    const sidebarUser = document.querySelector('.sidebar-user-mobile');
    if (sidebarUser) {
      sidebarUser.innerHTML = `
        <div class="user-info">
          <img src="${avatarUrl}" alt="${user.nick}" class="user-avatar">
          <div class="user-details">
            <span class="user-nick">${user.nick}</span>
            <span class="user-points">${user.points} pontos</span>
          </div>
        </div>
      `;
    }
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
    this.updateSidebarUser();
  }
};
document.addEventListener('DOMContentLoaded', () => {
    const authButtons = document.getElementById('auth-buttons');
    
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (token && user) {
        // 用户已登录，显示用户菜单
        authButtons.innerHTML = `
            <li class="user-menu">
                <div class="user-avatar">${user.username[0].toUpperCase()}</div>
                <div class="dropdown-menu">
                    <a href="/profile.html">个人资料</a>
                    <a href="#" id="logout-btn">退出登录</a>
                </div>
            </li>
        `;

        // 处理用户菜单的显示/隐藏
        const userAvatar = document.querySelector('.user-avatar');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        userAvatar.addEventListener('click', () => {
            dropdownMenu.classList.toggle('active');
        });

        // 点击页面其他地方时隐藏下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                dropdownMenu.classList.remove('active');
            }
        });

        // 处理退出登录
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 清除本地存储的认证信息
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // 刷新页面
            window.location.reload();
        });
    } else {
        // 用户未登录，显示登录/注册按钮
        authButtons.innerHTML = `
            <li><a href="login.html" class="auth-btn login">登录</a></li>
            <li><a href="register.html" class="auth-btn register">注册</a></li>
        `;
    }
}); 
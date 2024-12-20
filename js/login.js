import { API_BASE_URL } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const submitButton = loginForm.querySelector('.submit-btn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // 禁用提交按钮
            submitButton.disabled = true;
            submitButton.textContent = '登录中...';
            
            // 收集表单数据
            const formData = {
                username: loginForm.username.value,
                password: loginForm.password.value
            };
            
            // 发送登录请求
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '登录失败');
            }

            // 保存令牌和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // 显示成功消息
            alert('登录成功！');
            
            // 跳转到首页
            window.location.href = '/';
        } catch (error) {
            // 显示错误消息
            alert('登录失败：' + error.message);
        } finally {
            // 恢复提交按钮
            submitButton.disabled = false;
            submitButton.textContent = '登录';
        }
    });

    // 忘记密码链接处理
    const forgotPasswordLink = document.getElementById('forgot-password');
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('请联系管理员重置密码');
    });
}); 
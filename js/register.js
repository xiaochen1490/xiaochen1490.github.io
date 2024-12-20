import { API_BASE_URL } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const submitButton = registerForm.querySelector('.submit-btn');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // 验证密码
            const password = registerForm.password.value;
            const confirmPassword = registerForm['confirm-password'].value;

            if (password !== confirmPassword) {
                throw new Error('两次输入的密码不一致');
            }

            // 禁用提交按钮
            submitButton.disabled = true;
            submitButton.textContent = '注册中...';
            
            // 收集表单数据
            const formData = {
                username: registerForm.username.value,
                email: registerForm.email.value,
                password: password
            };
            
            // 发送注册请求
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '注册失败');
            }

            // 显示成功消息
            alert('注册成功！请登录');
            
            // 跳转到登录页面
            window.location.href = '/login.html';
        } catch (error) {
            // 显示错误消息
            alert('注册失败：' + error.message);
        } finally {
            // 恢复提交按钮
            submitButton.disabled = false;
            submitButton.textContent = '注册';
        }
    });
}); 
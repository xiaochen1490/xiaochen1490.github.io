import { submitContact } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const submitButton = contactForm.querySelector('.submit-btn');
    
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // 禁用提交按钮
            submitButton.disabled = true;
            submitButton.textContent = '发送中...';
            
            // 收集表单数据
            const formData = {
                name: contactForm.name.value,
                email: contactForm.email.value,
                subject: contactForm.subject.value,
                message: contactForm.message.value
            };
            
            // 提交表单
            const response = await submitContact(formData);
            
            // 显示成功消息
            alert('消息已成功发送！');
            
            // 重置表单
            contactForm.reset();
        } catch (error) {
            // 显示错误消息
            alert('发送失败：' + error.message);
        } finally {
            // 恢复提交按钮
            submitButton.disabled = false;
            submitButton.textContent = '发送消息';
        }
    });
}); 
const API_BASE_URL = 'http://localhost:3000/api';

// 博客相关 API
export const getBlogPosts = async () => {
    const response = await fetch(`${API_BASE_URL}/posts`);
    if (!response.ok) throw new Error('获取博客文章失败');
    return response.json();
};

export const getBlogPost = async (id) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`);
    if (!response.ok) throw new Error('获取博客文章失败');
    return response.json();
};

// 项目相关 API
export const getProjects = async () => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) throw new Error('获取项目列表失败');
    return response.json();
};

// 联系表单 API
export const submitContact = async (formData) => {
    const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('提交表单失败');
    return response.json();
}; 
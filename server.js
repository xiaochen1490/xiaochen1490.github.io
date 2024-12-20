const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 加载环境变量
dotenv.config();

// 创建数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 初始化数据库表
async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // 创建用户表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 创建博客文章表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tags JSON,
                author_id INT,
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        `);

        // 创建项目表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                technologies JSON,
                imageUrl VARCHAR(255),
                demoUrl VARCHAR(255),
                githubUrl VARCHAR(255),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 创建联系表单表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('数据库表初始化成功');
    } catch (err) {
        console.error('数据库表初始化失败:', err);
    }
}

const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 身份验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '无效的认证令牌' });
        }
        req.user = user;
        next();
    });
};

// 用户认证路由
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 检查用户名是否已存在
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: '注册成功' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        const user = users[0];

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 受保护的路由示例
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// API 路由
// 获取博客文章列表
app.get('/api/posts', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM posts ORDER BY date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 获取单篇博客文章
app.get('/api/posts/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: '文章不存在' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 获取项目列表
app.get('/api/projects', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM projects ORDER BY date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 处理联系表单提交
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // 保存到数据库
        await pool.execute(
            'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject, message]
        );

        // 发送邮件通知
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `新的联系表单消息: ${subject}`,
            text: `
                姓名: ${name}
                邮箱: ${email}
                主题: ${subject}
                消息: ${message}
            `
        });

        res.json({ message: '消息已发送' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initDatabase();
}); 
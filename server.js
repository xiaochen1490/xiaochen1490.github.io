const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

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
        
        // 创建博客文章表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tags JSON
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
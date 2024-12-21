const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 创建数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'personal_website',
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
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('数据库表初始化成功');
    } catch (err) {
        console.error('数据库表初始化失败:', err);
        process.exit(1); // 如果数据库初始化失败，终止程序
    }
}

// CORS 配置
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// 中间件
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static('.'));

// 根路径处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 中间件：验证 JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '未提供认证token' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '无效的token' });
        }
        req.user = user;
        next();
    });
};

// 注册路由
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 检查用户是否已存在
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        await pool.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: '注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 登录路由
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

        // 生成 JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET
        );

        res.json({ token });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户数据路由
app.get('/api/user-data', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('获取用户数据错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 启动服务器
app.listen(PORT, async () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    await initDatabase(); // 初始化数据库表
});
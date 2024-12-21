const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key'; // 在生产环境中应该使用环境变量

// CORS 配置
const corsOptions = {
    origin: '*', // 允许所有来源访问
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// 中间件
app.use(cors(corsOptions));
app.use(bodyParser.json());

// 模拟数据库
let users = [];

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
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        const newUser = {
            id: users.length + 1,
            username,
            password: hashedPassword,
            createdAt: new Date()
        };

        users.push(newUser);

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
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 生成 JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

        res.json({ token });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户数据路由
app.get('/api/user-data', authenticateToken, (req, res) => {
    const user = users.find(u => u.username === req.user.username);
    if (!user) {
        return res.status(404).json({ message: '用户不存在' });
    }

    // 返回用户数据（不包含密码）
    const { password, ...userData } = user;
    res.json(userData);
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 
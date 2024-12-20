const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personal-website')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// 博客文章模型
const Post = mongoose.model('Post', {
  title: String,
  content: String,
  category: String,
  date: { type: Date, default: Date.now },
  tags: [String]
});

// 项目模型
const Project = mongoose.model('Project', {
  title: String,
  description: String,
  technologies: [String],
  imageUrl: String,
  demoUrl: String,
  githubUrl: String,
  date: { type: Date, default: Date.now }
});

// 联系表单模型
const Contact = mongoose.model('Contact', {
  name: String,
  email: String,
  subject: String,
  message: String,
  date: { type: Date, default: Date.now }
});

// API 路由
// 获取博客文章列表
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 获取单篇博客文章
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: '文章不存在' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 获取项目列表
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ date: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 处理联系表单提交
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // 保存到数据库
    const contact = new Contact({ name, email, subject, message });
    await contact.save();

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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
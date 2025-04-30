const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const { dbConfig, serverConfig } = require('./config'); // 修改这行，导入 serverConfig
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = serverConfig.port; // 修改这行，使用配置中的端口

// 中间件 - 增加请求体大小限制
app.use(bodyParser.json({ limit: '50mb' }));  // 将默认限制增加到 50MB
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));  // 同样增加 URL 编码数据的限制
app.use(express.static(path.join(__dirname, 'public')));

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 仅在内存中处理图片上传，不保存到磁盘
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

// FCKEditor文件上传处理路由 - 返回Base64编码的图片
app.post('/fckeditor/editor/filemanager/connectors/php/upload.php', upload.single('NewFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('<script>window.parent.OnUploadCompleted(1, "", "", "No file was uploaded.");</script>');
        }

        // 获取文件信息
        const fileType = req.file.mimetype;
        const fileName = req.file.originalname;
        
        // 创建Base64字符串
        const base64Data = req.file.buffer.toString('base64');
        const base64Url = `data:${fileType};base64,${base64Data}`;
        
        // 使用FCKEditor的回调函数返回Base64编码的图片
        res.send(`<script>window.parent.OnUploadCompleted(0, "${base64Url}", "${fileName}", "");</script>`);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).send('<script>window.parent.OnUploadCompleted(1, "", "", "Server error occurred");</script>');
    }
});

// FCKEditor旧版文件上传处理路由 (兼容性) - 返回Base64编码的图片
app.post('/fileupload', upload.single('NewFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('<script>window.parent.OnUploadCompleted(1, "", "", "No file was uploaded.");</script>');
        }

        // 获取文件信息
        const fileType = req.file.mimetype;
        const fileName = req.file.originalname;
        
        // 创建Base64字符串
        const base64Data = req.file.buffer.toString('base64');
        const base64Url = `data:${fileType};base64,${base64Data}`;
        
        // 使用FCKEditor的回调函数返回Base64编码的图片
        res.send(`<script>window.parent.OnUploadCompleted(0, "${base64Url}", "${fileName}", "");</script>`);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).send('<script>window.parent.OnUploadCompleted(1, "", "", "Server error occurred");</script>');
    }
});

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('已成功连接到 MySQL 数据库');
    connection.release();
    
    // 确保表存在
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zbzn_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('数据表已就绪');
  } catch (err) {
    console.error('数据库连接失败:', err);
  }
}

testConnection();

// API 端点保存内容到数据库
app.post('/api/save-content', async (req, res) => {
  const { title, projectType, content } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ success: false, message: '标题和内容不能为空' });
  }
  
  try {
    const [results] = await pool.query(
      'INSERT INTO zbzn_history (title, category, content) VALUES (?, ?, ?)',
      [title, projectType, content]
    );
    
    res.json({
      success: true,
      message: '内容已成功保存',
      id: results.insertId
    });
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({ success: false, message: '数据库错误' });
  }
});

// 获取所有保存的内容
app.get('/api/get-contents', async (req, res) => {
  try {
    const [results] = await pool.query(
      'SELECT id, title, category, created_at FROM zbzn_history ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({ success: false, message: '数据库错误' });
  }
});

// 根据 ID 获取具体内容
app.get('/api/get-content/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const [results] = await pool.query(
      'SELECT * FROM zbzn_history WHERE id = ?',
      [id]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '内容不存在' });
    }
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({ success: false, message: '数据库错误' });
  }
});

// 更新内容的 API 端点
app.post('/api/update-content', async (req, res) => {
  const { id, title, category, content } = req.body;
  
  if (!id || !title || !content) {
    return res.status(400).json({ success: false, message: 'ID、标题和内容不能为空' });
  }
  
  try {
    const [results] = await pool.query(
      'UPDATE zbzn_history SET title = ?, category = ?, content = ? WHERE id = ?',
      [title, category, content, id]
    );
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '未找到要更新的内容' });
    }
    
    res.json({
      success: true,
      message: '内容已成功更新'
    });
  } catch (error) {
    console.error('更新数据失败:', error);
    res.status(500).json({ success: false, message: '数据库错误' });
  }
});

// 删除内容的 API 端点
app.delete('/api/delete-content/:id', async (req, res) => {
  const id = req.params.id;
  
  if (!id) {
    return res.status(400).json({ success: false, message: '内容 ID 不能为空' });
  }
  
  try {
    const [results] = await pool.query(
      'DELETE FROM zbzn_history WHERE id = ?',
      [id]
    );
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '未找到要删除的内容' });
    }
    
    res.json({
      success: true,
      message: '内容已成功删除'
    });
  } catch (error) {
    console.error('删除数据失败:', error);
    res.status(500).json({ success: false, message: '数据库错误' });
  }
});

// 提供前端HTML页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

// 优雅关闭连接池
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('数据库连接池已关闭');
    process.exit(0);
  } catch (err) {
    console.error('关闭连接池时出错:', err);
    process.exit(1);
  }
}); 
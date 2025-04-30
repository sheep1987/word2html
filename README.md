# FCKEditor 富文本编辑器应用

这是一个使用FCKEditor富文本编辑器的Web应用程序，包含内容编辑和Base64图片上传功能。

## 功能特点

- 富文本内容编辑和保存
- 图片以Base64格式上传和存储（直接嵌入HTML，无需外部文件链接）
- 内容列表管理
- 支持不同项目类型的分类

## 安装与运行

### 前提条件

- Node.js (v12.0.0 或更高版本)
- npm (v6.0.0 或更高版本)
- MySQL数据库 (v5.7 或更高版本)

### 安装步骤

1. 克隆或下载此仓库
2. 进入项目目录
3. 安装依赖

```bash
npm install
```

4. 配置数据库连接信息

编辑`config.js`文件，根据您的数据库设置修改连接信息：

```javascript
// 数据库连接配置
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'toubiao'
};

// 服务器配置
const serverConfig = {
  port: 85
};
```

5. 启动应用

```bash
npm start
```

应用将在配置的端口上运行，默认为 http://localhost:85

### 开发模式

使用以下命令以开发模式运行，支持代码变更自动重启服务：

```bash
npm run dev
```

## 图片处理说明

本应用使用Base64编码处理图片，而不是传统的文件URL方式。这带来以下优势：

- **无需文件存储**：图片数据直接内嵌在HTML中，无需单独的文件存储系统
- **便于导出和迁移**：内容可以完整导出，不存在图片链接失效问题
- **减少HTTP请求**：避免了加载外部图片的额外HTTP请求

然而，Base64编码也有一些注意事项：

- **体积增加**：Base64编码后，图片数据体积通常增加约33%
- **不适合大图片**：过大的图片使用Base64可能导致文档体积过大，影响加载性能
- **不可缓存**：内嵌图片无法像外部图片那样被浏览器缓存

## 页面说明

- `/index.html` - 主编辑页面
- `/view.html` - 内容查看页面
- `/history.html` - 内容历史列表
- `/fckeditor-test.html` - FCKEditor测试页面
- `/imageupload-test.html` - Base64图片上传测试页面

## 技术栈

- 前端：HTML、CSS、JavaScript、FCKEditor
- 后端：Node.js、Express、MySQL
- 图片处理：Base64编码，Multer内存存储

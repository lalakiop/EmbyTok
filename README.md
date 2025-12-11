# EmbyTok

EmbyTok 是一个为 Emby 媒体服务器设计的竖屏视频浏览客户端，提供类似 TikTok 的体验，让用户能够以更现代、便捷的方式浏览个人媒体库。

<div style="display:flex; flex-direction:row;">
<img src="tmp/1.jpg" width="24%" />
<img src="tmp/2.jpg" width="24%" />
<img src="tmp/3.jpg" width="24%" />
<img src="tmp/4.jpg" width="24%" />
</div>

## 功能特性

- 📱 **TikTok 式浏览体验**：全屏竖屏视频浏览，上下滑动切换视频
- 🎵 **音频控制**：一键静音/取消静音，直观的音量图标反馈
- ❤️ **收藏功能**：点赞并收藏喜欢的视频，支持在收藏夹中浏览
- 🔍 **多种浏览模式**：
  - 最新视频
  - 随机推荐
  - 收藏夹
- 📁 **媒体库管理**：支持多个媒体库的浏览、选择和隐藏
- 🌐 **响应式设计**：适配移动端和桌面端，自动调整布局
- ⏩ **滑动控制进度**：左右滑动调整视频播放进度
- 📦 **Android 应用**：可通过 Capacitor 构建为原生 Android 应用
- 📱 **视图切换**：支持视频流视图和网格视图的一键切换
- 📐 **方向过滤**：可选择只显示垂直、水平或两者都显示的视频
- 🖥️ **全屏模式**：支持进入/退出全屏播放
- 🎯 **自动布局**：根据屏幕方向自动调整最佳显示方式
- 📱 **竖屏优化**：专为手机竖屏体验优化的界面设计
- ♾️ **无限连播模式**：支持视频自动连续播放，无需手动操作
- 📱 **平板模式**：支持平板模式

最新代码请移步 https://gitee.com/miguyomi/embytok
## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Capacitor (用于构建 Android 应用)
- Lucide React (图标)
- 多架构 Docker 支持 (AMD64/ARM64)
- Nginx 生产环境部署
- PWA 支持

## 安装和设置

### 前置要求

- Node.js (v14 或更高版本)
- npm 或 yarn

### 安装步骤

1. 克隆仓库：
   ```bash
   git clone <repository-url>
   cd embytok
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 构建生产版本：
   ```bash
   npm run build
   ```

## 使用方法

1. 启动应用后，在登录界面输入您的 Emby 服务器信息：
   - 服务器地址（例如：http://192.168.1.100:8096）
   - 用户名
   - 密码（如果需要）

2. 登录成功后，您可以：
   - 上下滑动浏览视频
   - 点击视频播放/暂停
   - 使用右侧控制栏点赞、查看信息、控制音频
   - 通过左上角菜单切换媒体库和浏览模式
   - 左右滑动控制视频播放进度
   - 点击网格图标切换到网格视图

## 构建 Android 应用

1. 确保您已安装 Android Studio 和 Android SDK

2. 添加 Android 平台：
   ```bash
   npm run cap:add
   ```

3. 同步项目：
   ```bash
   npm run cap:sync
   ```

4. 构建 APK：
   ```bash
   ./build-apk.sh
   ```

## Docker 部署

项目包含 Docker 支持，可以轻松部署为 Web 应用。支持多架构（AMD64/ARM64），可在不同硬件平台上运行。

### 镜像信息

- **镜像名称**：crpi-90mw3693mrc3nsxp.cn-shanghai.personal.cr.aliyuncs.com/migumigu/embytok
- **支持架构**：AMD64 (x86_64), ARM64 (aarch64)
- **标签**：latest, 1.0.2

### 直接使用 Docker 命令

```bash
# 拉取并运行镜像（Docker 会自动选择适合您硬件架构的版本）
docker run -d \
  --name embytok-web \
  --restart unless-stopped \
  -p 8080:80 \
  crpi-90mw3693mrc3nsxp.cn-shanghai.personal.cr.aliyuncs.com/migumigu/embytok:latest
```

### 使用 Docker Compose

#### 简单部署

使用 `docker-compose.simple.yml` 进行快速部署：

```yaml
version: '3.8'

services:
  # EmbyTok 前端应用 - 简单版配置
  embytok:
    image: crpi-90mw3693mrc3nsxp.cn-shanghai.personal.cr.aliyuncs.com/migumigu/embytok:latest
    container_name: embytok-web
    restart: unless-stopped
    ports:
      - "5175:80"  # Web界面端口
    environment:
      - NODE_ENV=production
    network_mode: bridge
networks: {}
```

运行简单配置：

```bash
docker-compose -f docker-compose.simple.yml up -d
```

默认情况下，应用将在端口 5175 上可用。

## 配置

应用使用 localStorage 存储以下用户配置：
- 服务器配置（URL、用户ID、访问令牌）
- 隐藏的媒体库列表

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

[MIT License](LICENSE)

## 免责声明

EmbyTok 是一个非官方的 Emby 客户端，与 Emby 官方没有关联。使用时请确保遵守您所在地区的相关法律法规。

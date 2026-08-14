# 摸鱼战机 (dsh-moyu-fighter)

一个藏在 DeepSeek Harness 网页端左侧留白区里的卷轴弹幕射击小游戏。

透明背景、纯黑绘制,平时完全隐形不打扰工作;鼠标一划进来,就是你的摸鱼战场。

将仓库地址复制给AI，说帮我安装即可。

**特色**

- **鼠标即战机**:隐藏系统光标,战机精确跟随鼠标、自动开火
- **弹幕随难度解锁**:自机狙连射、扇形 n-way、圆环、螺旋、正弦波浪、追踪弹、激光
- **进度可继承**:从区域**底部**滑出即保留分数/生命/难度,回来接着打
- **死亡自动重开**:GAME OVER 后鼠标停留在区域内,3 秒倒计时自动再战

---

> 以下内容面向 AI ：按步骤执行,命令失败时参考"故障排查"。

## 安装说明

### 产物

`dsh-moyu-fighter-1.0.0.tgz`(本仓库 Release v1.0.0 的资产,或本地 `npm pack` 生成)。

### 步骤

1. **确认环境**
   - 目标机器已安装 dsh（deepseekharness）,并确认要安装到的 profile 名(默认通常是 `web`,以目标部署配置为准)。
   - 将 tarball 下载到可写路径,后续命令以 `./dsh-moyu-fighter-1.0.0.tgz` 指代。

2. **安装**

   ```bash
   dsh plugin --profile <profile名> add ./dsh-moyu-fighter-1.0.0.tgz
   ```

   - 若 `dsh plugin add` 不可用或拒绝该包(纯客户端包),改用:

     ```bash
     cd <dsh 安装目录>
     pnpm add ./dsh-moyu-fighter-1.0.0.tgz
     ```

     并把包名 `dsh-moyu-fighter` 加入该 profile 的 `dsh.profile.bundles` 层列表。

3. **重启 profile(必须)**
   - 客户端名册(`dsh-client-modules`)进程内缓存包元数据,不重启不生效。

4. **验证生效**
   - dsh 服务启动后,请求 `/plugins/dsh-moyu-fighter/client.js` 应返回 200。
   - 打开网页对话界面,把鼠标移入左侧留白区并停留 1 秒:应出现说明卡片或倒计时,随后可游玩。

### 使用行为(验收标准)

- 首次进入显示「摸鱼战机」说明卡片,点「确认,开始!」直接开战;之后进入为 3 秒倒计时。
- 鼠标移动控制战机;移出区域游戏立即消失。
- 从区域底部滑出退出 → 分数/生命/难度保留,下次进入继承;从上/左/右退出 → 全新一局。
- 死亡后鼠标停留在区域内 → 自动 3 秒倒计时重开。

### 故障排查

| 现象 | 处理 |
| --- | --- |
| 页面无游戏,`/plugins/` 下无该包 | 未重启 profile,或包未进入该 profile 的 node_modules |
| `dsh plugin add` 报错 | 改用 `pnpm add` + `dsh.profile.bundles` 方式 |
| 游戏区始终不出现 | 窗口过窄(中间列 < 约 952px 时留白不足,自动隐藏),拉宽窗口 |
| 命令与版本不符 | 以目标机器 `dsh plugin --help` 和部署 bundle 文档为准 |

### 二次开发 / 调参

- 常量位于 `lib/client.js` 顶部:`HOVER_DELAY`(停留秒数)、`COUNTDOWN`(倒计时秒数)、`EXIT_EDGE`(底部判定容差)、`SCORE_MAP`(敌机分值)、难度系数(`tierOf` 与 `D` 相关公式)。
- 修改后 `npm pack` 重新分发,或直接替换已安装包内的 `lib/client.js` 并重启 profile。

## License

MIT

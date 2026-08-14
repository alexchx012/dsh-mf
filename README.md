# 摸鱼战机 (dsh-moyu-fighter)

DeepSeek Harness 网页端的小玩具：在对话页**左侧留白区**运行的卷轴弹幕射击游戏。

- 透明背景、纯黑绘制，不遮挡任何内容
- 鼠标控制战机（隐藏系统光标，战机即指针），自动开火
- 弹幕随难度递增：自机狙连射 / 扇形 n-way / 圆环 / 螺旋 / 正弦波浪 / 追踪弹 / 激光
- 3 条命；鼠标移出区域即退出；**从底部滑出保留分数/生命/难度进度**，下次进入继承
- 死亡后鼠标停留自动 3 秒倒计时重开

## 安装（给别人的 dsh）

把 `dsh-moyu-fighter-1.0.0.tgz`（或整个 `dsh-moyu-fighter/` 目录）拷给对方，然后：

```bash
# 方式一：dsh 官方插件安装命令
dsh plugin --profile <profile名> add ./dsh-moyu-fighter-1.0.0.tgz

# 方式二：直接装进 profile 的依赖
cd <你的 dsh 安装目录>
pnpm add ./dsh-moyu-fighter-1.0.0.tgz   # 或 npm install ./dsh-moyu-fighter-1.0.0.tgz
# 并把包名加入 profile 的 dsh.profile.bundles 层列表（如果 dsh plugin add 不可用）
```

**装完后重启该 profile**（客户端名册在进程内缓存，不重启不会出现在 `/plugins/` 列表里）。

> 版本说明：安装命令和 profile 结构可能随 dsh 版本略有出入，请以目标机器 `dsh plugin --help` 为准；
> 若 `dsh plugin add` 不接受纯客户端包，用方式二手动装进 node_modules 并确保
> `dsh.client` 清单可被扫描到，同样可行。

## 使用

1. 重启后打开 dsh web 页面（对话界面）
2. 把鼠标移入左侧留白区并停留 1 秒
3. 首次会显示说明卡片，点「确认，开始！」；之后每次是 3 秒倒计时自动开战
4. 鼠标移动即控制战机；移出区域游戏消失（从底部滑出可保留进度）

## 工作原理

- `cordis.patch.yml`：把一行 host 插件插入组合树（host 侧是空壳，见 `lib/index.js`）
- `package.json` 的 `dsh.client` 清单 + `exports["./client"]`：让浏览器名册
  （`dsh-client-modules`）扫描到 `lib/client.js`，在页面里作为客户端插件运行
- `lib/client.js`：`window.__ModuleLoader__.load({ id, factory })` 协议的标准客户端 bundle，
  注册进 `shell.overlay` 槽位，自动测量左侧留白区域并渲染游戏

## 二次开发

改 `lib/client.js` 里的常量即可调参（开局停留时长 `HOVER_DELAY`、倒计时 `COUNTDOWN`、
刷怪间隔、子弹速度系数等），或直接改弹幕逻辑。改完重新 `npm pack` 分发。

## License

MIT

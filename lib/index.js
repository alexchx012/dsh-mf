// dsh-moyu-fighter — host 面
// 本插件是纯客户端 UI（左侧留白区小游戏），host 侧只需提供一个空插件行，
// 让 `dsh plugin add` 能按 bundle 流程把它装进组合树并把 client bundle 挂上名册。
export const name = 'dsh-moyu-fighter'

export function apply(_ctx) {
  // 客户端游戏完全在浏览器里运行，host 侧无事可做。
}

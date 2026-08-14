// dsh-moyu-fighter — 浏览器客户端 bundle
// 协议：window.__ModuleLoader__.load({ id, factory })，被 dsh-client-modules
// 扫描进 __DSH_BOOT__ 名册，在浏览器里作为 cordis 插件运行 apply(ctx)。
window.__ModuleLoader__.load({
	id: "dsh-moyu-fighter",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		// 帮助按钮 hover 样式（动态插件里的 styles.insert 在真实 bundle 中不存在，手动插入 style 标签）
		const cssTagId = "dsh-moyu-fighter/help.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-moyu-fighter";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = ".ws-shmup-help-btn:hover{background:rgba(0,0,0,0.12)}";
			document.head.appendChild(tag);
		}

		const React = require("react");

		const CHAT_WIDTH = 748;
		const MIN_W = 84;
		const PAD = 10;
		const HEADER_GAP = 6;
		const HOVER_DELAY = 1000;
		const COUNTDOWN = 3;
		const EXIT_EDGE = 8;
		const PI2 = Math.PI * 2;
		const SCORE_MAP = { drone: 10, gunner: 25, spreader: 40, ringer: 60, spiraler: 80, siner: 70, homing: 100, beamer: 120 };

		function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
		function near(a, b) { return Math.abs(a - b) <= 1; }
		function normAngle(a) { while (a > Math.PI) a -= PI2; while (a < -Math.PI) a += PI2; return a; }

		// 槽位包装 div 是 display:contents（无盒），爬到第一个有真实盒子的后代再取几何
		function boxedElement(slotEl) {
			let el = slotEl;
			for (let i = 0; i < 5; i++) {
				const r = el.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) return el;
				if (!el.firstElementChild) return null;
				el = el.firstElementChild;
			}
			return null;
		}

		function readContentWidth(el) {
			const pick = (node) => {
				if (!node) return null;
				const v = getComputedStyle(node).getPropertyValue("--dsh-chat-content-width").trim();
				if (!v) return null;
				const n = parseFloat(v);
				return n > 0 ? n : null;
			};
			const direct = pick(el);
			if (direct !== null) return direct;
			const inner = el.querySelector('[data-slot="conversation.session"]');
			if (inner) {
				const box = boxedElement(inner);
				const v = pick(box || inner);
				if (v !== null) return v;
			}
			return CHAT_WIDTH;
		}

		function measure() {
			const slotEl = document.querySelector('[data-slot="conversation"]');
			if (!slotEl) return null;
			const conv = boxedElement(slotEl);
			if (!conv) return null;
			const cr = conv.getBoundingClientRect();
			if (cr.width <= 0 || cr.height <= 0) return null;

			// 上边界：从会话标题栏（名称/模式/对话·轨迹按钮/分隔线）下方开始
			let topY = cr.top + PAD;
			const headerSlot = document.querySelector('[data-slot="conversation.session.header"]');
			if (headerSlot) {
				const hb = boxedElement(headerSlot);
				if (hb) {
					const hr = hb.getBoundingClientRect();
					if (hr.height > 0 && hr.bottom > cr.top && hr.bottom < cr.bottom) {
						topY = hr.bottom + HEADER_GAP;
					}
				}
			}

			const contentW = Math.min(readContentWidth(conv), cr.width);
			const ws = Math.max(0, (cr.width - contentW) / 2);
			const w = ws - PAD - 8;
			const h = cr.bottom - PAD - topY;
			if (w < MIN_W || h < 140) return null;
			return {
				left: Math.round(cr.left + PAD),
				top: Math.round(topY),
				w: Math.round(w),
				h: Math.round(h),
			};
		}

		function spawnBurst(st, x, y, n) {
			for (let i = 0; i < n; i++) {
				const a = Math.random() * PI2;
				const sp = 40 + Math.random() * 90;
				st.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.3, max: 0.6, s: 2 + Math.random() * 3 });
			}
		}

		function onShipHit(st) {
			st.flash = 0.2;
			spawnBurst(st, st.ship.x, st.ship.y, 18);
		}

		function beginPlay(st, rect) {
			if (st.dead) {
				st.dead = false;
				st.score = 0;
				st.ship.lives = 3;
				st.t = 0;
			}
			st.mode = "playing";
			st.spawnTimer = 0.7;
			st.bullets.length = 0;
			st.ebullets.length = 0;
			st.enemies.length = 0;
			st.parts.length = 0;
			st.flash = 0;
			st.ship.invuln = 1.2;
			st.ship.cooldown = 0;
		}

		function tierOf(st) {
			return 1 + Math.floor(st.t / 25 + st.score / 1200);
		}

		function pickType(tier) {
			const r = Math.random();
			if (tier >= 6) {
				if (r < 0.06) return "drone";
				if (r < 0.2) return "gunner";
				if (r < 0.36) return "spreader";
				if (r < 0.55) return "ringer";
				if (r < 0.7) return "spiraler";
				if (r < 0.82) return "siner";
				if (r < 0.93) return "homing";
				return "beamer";
			}
			if (tier === 5) {
				if (r < 0.08) return "drone";
				if (r < 0.24) return "gunner";
				if (r < 0.42) return "spreader";
				if (r < 0.6) return "ringer";
				if (r < 0.76) return "spiraler";
				if (r < 0.9) return "siner";
				if (r < 0.97) return "homing";
				return "beamer";
			}
			if (tier === 4) {
				if (r < 0.12) return "drone";
				if (r < 0.32) return "gunner";
				if (r < 0.52) return "spreader";
				if (r < 0.72) return "ringer";
				if (r < 0.88) return "spiraler";
				return "siner";
			}
			if (tier === 3) {
				if (r < 0.2) return "drone";
				if (r < 0.45) return "gunner";
				if (r < 0.7) return "spreader";
				if (r < 0.85) return "ringer";
				return "spiraler";
			}
			if (tier === 2) {
				if (r < 0.35) return "drone";
				if (r < 0.65) return "gunner";
				if (r < 0.9) return "spreader";
				return "ringer";
			}
			if (r < 0.6) return "drone";
			if (r < 0.9) return "gunner";
			return "spreader";
		}

		function fireBullet(st, x, y, ang, speed, r, mode) {
			return st.ebullets[st.ebullets.length] = {
				x: x, y: y,
				x0: x,
				vx: Math.cos(ang) * speed,
				vy: Math.sin(ang) * speed,
				r: r,
				mode: mode || "straight",
				t: 0,
				p0: Math.random() * PI2,
				amp: 0,
				omega: 0,
				turn: 0,
			};
		}

		function update(st, dt, rect) {
			const ship = st.ship;
			ship.x = clamp(st.mouse.x, 10, rect.w - 10);
			ship.y = clamp(st.mouse.y, 34, rect.h - 12);
			ship.cooldown -= dt;
			ship.invuln = Math.max(0, ship.invuln - dt);
			st.flash = Math.max(0, st.flash - dt);

			const tier = tierOf(st);
			const D = st.t * 0.012 + st.score * 0.00008;
			const speedMul = 1 + D * 0.35;
			const fireMul = 1 + D * 0.25;

			if (ship.cooldown <= 0) {
				ship.cooldown = 0.13;
				st.bullets.push({ x: ship.x, y: ship.y - 11, vx: 0, vy: -430, r: 2.5 });
			}
			for (let i = st.bullets.length - 1; i >= 0; i--) {
				const b = st.bullets[i];
				b.y += b.vy * dt;
				if (b.y < -12) st.bullets.splice(i, 1);
			}

			st.spawnTimer -= dt;
			if (st.spawnTimer <= 0) {
				st.spawnTimer = Math.max(0.16, 0.85 - st.t * 0.005 - st.score * 0.00004);
				const type = pickType(tier);
				let vy = 0, r = 9, amp = 8, spin = 0;
				if (type === "drone") { vy = 62 + Math.random() * 46; r = 6; }
				else if (type === "gunner") { vy = 40 + Math.random() * 16; r = 8; }
				else if (type === "spreader") { vy = 30 + Math.random() * 10; r = 9; }
				else if (type === "ringer") { vy = 26 + Math.random() * 8; r = 9; spin = 0.25 + tier * 0.05; }
				else if (type === "spiraler") { vy = 30 + Math.random() * 12; r = 8; spin = 2 + tier * 0.55; }
				else if (type === "siner") { vy = 34 + Math.random() * 10; r = 8; amp = 18 + tier * 5; }
				else if (type === "homing") { vy = 30 + Math.random() * 10; r = 9; }
				else { vy = 24; r = 10; }
				vy *= 1 + D * 0.18;
				st.enemies.push({
					type: type,
					x: rect.w * (0.12 + Math.random() * 0.76),
					y: -14,
					r: r,
					vy: vy,
					phase: Math.random() * PI2,
					amp: amp,
					spin: spin,
					fire: 0.6 + Math.random() * 0.8,
					burst: 0,
					burstT: 0,
					warned: false,
					warnT: 0,
					beamActive: false,
					beamT: 0,
				});
			}

			for (let i = st.enemies.length - 1; i >= 0; i--) {
				const e = st.enemies[i];
				e.phase += dt * 2;
				e.y += e.vy * dt;
				e.x += Math.sin(e.phase) * e.amp * dt * 0.6;
				e.x = clamp(e.x, 5, rect.w - 5);

				if (e.type === "beamer") {
					if (e.warned) {
						e.warnT -= dt;
						if (e.warnT <= 0) {
							e.warned = false;
							e.beamActive = true;
							e.beamT = 0.5;
						}
					} else if (e.beamActive) {
						e.beamT -= dt;
						if (e.beamT <= 0) e.beamActive = false;
					}
				}

				if (e.burst > 0) {
					e.burstT -= dt;
					if (e.burstT <= 0) {
						e.burst -= 1;
						e.burstT = 0.12;
						const ang = Math.atan2(ship.y - e.y, ship.x - e.x);
						fireBullet(st, e.x, e.y, ang, 160 * fireMul, 3, "straight");
					}
				}

				e.fire -= dt;
				if (e.fire <= 0 && e.y > 12 && e.y < rect.h * 0.75 && st.ebullets.length < 380) {
					const base = Math.atan2(ship.y - e.y, ship.x - e.x);
					if (e.type === "gunner") {
						fireBullet(st, e.x, e.y, base, 150 * fireMul, 3, "straight");
						if (tier >= 5) e.burst = 2;
						else if (tier >= 3) e.burst = 1;
						e.fire = (1.1 + Math.random() * 0.5) / (1 + (tier - 1) * 0.08);
					} else if (e.type === "spreader") {
						const n = tier === 1 ? 3 : Math.min(5 + (tier - 1) * 2, 13);
						for (let k = 0; k < n; k++) {
							const a = base + (k - (n - 1) / 2) * 0.13;
							fireBullet(st, e.x, e.y, a, 125 * fireMul, 3, "straight");
						}
						e.fire = (1.5 + Math.random() * 0.7) / (1 + (tier - 1) * 0.06);
					} else if (e.type === "ringer") {
						const n = Math.min(8 + tier * 2, 20);
						for (let k = 0; k < n; k++) {
							const a = e.phase + (k / n) * PI2;
							fireBullet(st, e.x, e.y, a, (110 + tier * 6) * fireMul, 3.2, "straight");
						}
						e.phase += e.spin;
						e.fire = (1.5 + Math.random() * 0.5) / (1 + (tier - 1) * 0.05);
					} else if (e.type === "spiraler") {
						e.phase += e.spin;
						fireBullet(st, e.x, e.y, e.phase, (120 + tier * 5) * fireMul, 3, "straight");
						e.fire = Math.max(0.055, 0.11 - tier * 0.008);
					} else if (e.type === "siner") {
						const b = fireBullet(st, e.x, e.y, Math.PI / 2, 120 * fireMul, 3, "sine");
						b.x0 = e.x;
						b.amp = e.amp;
						b.omega = 5 + tier * 0.4;
						e.fire = (1.8 + Math.random() * 0.8) / (1 + (tier - 1) * 0.05);
					} else if (e.type === "homing") {
						const b = fireBullet(st, e.x, e.y, base, 105 * fireMul, 3.2, "homing");
						b.turn = 2.2 + tier * 0.15;
						e.fire = (1.3 + Math.random() * 0.6) / (1 + (tier - 1) * 0.07);
					} else if (e.type === "beamer") {
						if (!e.warned && !e.beamActive) {
							e.warned = true;
							e.warnT = 0.85;
							e.fire = 2.5;
						}
					}
				}

				if (e.beamActive && Math.abs(ship.x - e.x) < 5 && ship.y > e.y + 8 && ship.invuln <= 0) {
					ship.lives -= 1;
					ship.invuln = 1.3;
					st.ebullets.length = 0;
					onShipHit(st);
					if (ship.lives <= 0) { st.dead = true; st.mode = "over"; st.overUntil = performance.now() + 2200; }
				}

				if (e.y > rect.h + 22) st.enemies.splice(i, 1);
			}

			for (let i = st.ebullets.length - 1; i >= 0; i--) {
				const b = st.ebullets[i];
				if (b.mode === "sine") {
					b.t += dt;
					b.x = b.x0 + Math.sin(b.t * b.omega + b.p0) * b.amp;
					b.y += b.vy * dt;
				} else if (b.mode === "homing") {
					const want = Math.atan2(ship.y - b.y, ship.x - b.x);
					const cur = Math.atan2(b.vy, b.vx);
					const diff = normAngle(want - cur);
					const na = cur + clamp(diff, -b.turn * dt, b.turn * dt);
					const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
					b.vx = Math.cos(na) * sp;
					b.vy = Math.sin(na) * sp;
					b.x += b.vx * dt;
					b.y += b.vy * dt;
				} else {
					b.x += b.vx * dt;
					b.y += b.vy * dt;
				}
				if (b.y > rect.h + 14 || b.x < -16 || b.x > rect.w + 16) st.ebullets.splice(i, 1);
			}

			for (let i = st.bullets.length - 1; i >= 0; i--) {
				const b = st.bullets[i];
				let hit = -1;
				for (let j = st.enemies.length - 1; j >= 0; j--) {
					const e = st.enemies[j];
					const dx = b.x - e.x;
					const dy = b.y - e.y;
					const rr = b.r + e.r;
					if (dx * dx + dy * dy < rr * rr) { hit = j; break; }
				}
				if (hit >= 0) {
					const e = st.enemies[hit];
					st.score += SCORE_MAP[e.type] || 10;
					spawnBurst(st, e.x, e.y, 8);
					st.enemies.splice(hit, 1);
					st.bullets.splice(i, 1);
				}
			}

			if (st.mode === "playing" && ship.invuln <= 0) {
				let dead = false;
				for (let i = st.ebullets.length - 1; i >= 0; i--) {
					const b = st.ebullets[i];
					const dx = b.x - ship.x;
					const dy = b.y - ship.y;
					const rr = b.r + ship.r;
					if (dx * dx + dy * dy < rr * rr) {
						ship.lives -= 1;
						ship.invuln = 1.3;
						st.ebullets.length = 0;
						onShipHit(st);
						if (ship.lives <= 0) { st.dead = true; st.mode = "over"; st.overUntil = performance.now() + 2200; }
						dead = true;
						break;
					}
				}
				if (!dead && ship.invuln <= 0) {
					for (let i = st.enemies.length - 1; i >= 0; i--) {
						const e = st.enemies[i];
						const dx = e.x - ship.x;
						const dy = e.y - ship.y;
						const rr = e.r + ship.r;
						if (dx * dx + dy * dy < rr * rr) {
							ship.lives -= 1;
							ship.invuln = 1.3;
							spawnBurst(st, e.x, e.y, 10);
							st.enemies.splice(i, 1);
							st.ebullets.length = 0;
							onShipHit(st);
							if (ship.lives <= 0) { st.dead = true; st.mode = "over"; st.overUntil = performance.now() + 2200; }
							break;
						}
					}
				}
			}

			for (let i = st.parts.length - 1; i >= 0; i--) {
				const p = st.parts[i];
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.life -= dt;
				if (p.life <= 0) st.parts.splice(i, 1);
			}
		}

		function draw(st, ctx, rect, now) {
			const ship = st.ship;
			ctx.fillStyle = "#000";
			for (let i = 0; i < st.bullets.length; i++) {
				const b = st.bullets[i];
				ctx.fillRect(b.x - 1.5, b.y - 5, 3, 10);
			}
			for (let i = 0; i < st.enemies.length; i++) {
				const e = st.enemies[i];
				ctx.beginPath();
				ctx.moveTo(e.x, e.y - e.r);
				ctx.lineTo(e.x + e.r * 0.75, e.y + e.r * 0.65);
				ctx.lineTo(e.x - e.r * 0.75, e.y + e.r * 0.65);
				ctx.closePath();
				ctx.fill();
				if (e.type === "beamer") {
					if (e.warned) {
						ctx.fillStyle = "rgba(0,0,0,0.35)";
						ctx.fillRect(e.x - 1, e.y + 8, 2, rect.h - e.y - 8);
						ctx.fillStyle = "#000";
					} else if (e.beamActive) {
						ctx.fillRect(e.x - 3, e.y + 8, 6, rect.h - e.y - 8);
					}
				}
			}
			for (let i = 0; i < st.ebullets.length; i++) {
				const b = st.ebullets[i];
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.r, 0, PI2);
				ctx.fill();
			}
			for (let i = 0; i < st.parts.length; i++) {
				const p = st.parts[i];
				ctx.globalAlpha = Math.max(0, p.life / p.max);
				ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
				ctx.globalAlpha = 1;
			}
			if (ship.invuln <= 0 || (now % 180) < 90) {
				ctx.fillStyle = "#000";
				ctx.beginPath();
				ctx.moveTo(ship.x, ship.y - 11);
				ctx.lineTo(ship.x + 8, ship.y + 8);
				ctx.lineTo(ship.x - 8, ship.y + 8);
				ctx.closePath();
				ctx.fill();
			}
			if (st.flash > 0) {
				ctx.fillStyle = "rgba(0,0,0," + Math.min(0.3, st.flash * 1.5) + ")";
				ctx.fillRect(0, 0, rect.w, rect.h);
			}
			ctx.fillStyle = "#000";
			ctx.font = "600 11px system-ui, sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "alphabetic";
			ctx.fillText("SCORE " + st.score, 4, 13);
			let hearts = "";
			for (let i = 0; i < ship.lives; i++) hearts += "♥ ";
			if (hearts) {
				ctx.textAlign = "right";
				ctx.fillText(hearts.trim(), rect.w - 4, 13);
			}
		}

		function ShmupGame() {
			const geomRef = React.useRef(null);
			const gRef = React.useRef(null);
			const rootRef = React.useRef(null);
			const canvasRef = React.useRef(null);
			const [geom, setGeom] = React.useState(null);
			const [helpVisible, setHelpVisible] = React.useState(false);

			React.useEffect(() => {
				geomRef.current = geom;
			}, [geom]);

			React.useEffect(() => {
				const st = {
					mode: "idle",
					dead: true,
					helpDone: false,
					mouse: { x: 0, y: 0 },
					hoverStart: 0,
					countdownStart: 0,
					overUntil: 0,
					flash: 0,
					ship: { x: 0, y: 0, r: 8, cooldown: 0, lives: 3, invuln: 0 },
					bullets: [],
					ebullets: [],
					enemies: [],
					parts: [],
					score: 0,
					t: 0,
					spawnTimer: 1,
				};
				gRef.current = st;

				let raf = 0;
				let last = 0;
				let frame = 0;
				let obs = null;

				const recompute = () => {
					try {
						const m = measure();
						const cur = geomRef.current;
						if (m) {
							if (!cur || !near(cur.left, m.left) || !near(cur.top, m.top) || !near(cur.w, m.w) || !near(cur.h, m.h)) setGeom(m);
						} else if (cur !== null) {
							setGeom(null);
						}
					} catch (err) {}
				};

				const ensureObserver = () => {
					if (obs) return;
					try {
						const targets = [];
						const slotEl = document.querySelector('[data-slot="conversation"]');
						if (slotEl) {
							const c = boxedElement(slotEl);
							if (c) targets.push(c);
						}
						const headerSlot = document.querySelector('[data-slot="conversation.session.header"]');
						if (headerSlot) {
							const hb = boxedElement(headerSlot);
							if (hb) targets.push(hb);
						}
						if (!targets.length) return;
						obs = new ResizeObserver(recompute);
						for (let i = 0; i < targets.length; i++) obs.observe(targets[i]);
					} catch (err) {}
				};

				const loop = (now) => {
					raf = requestAnimationFrame(loop);
					try {
						const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
						last = now;
						const rect = geomRef.current;
						if (!rect) {
							if ((frame++ & 15) === 0) { recompute(); ensureObserver(); }
							return;
						}
						const canvas = canvasRef.current;
						if (!canvas) return;
						const ctx = canvas.getContext("2d");
						const dpr = window.devicePixelRatio || 1;
						const pw = Math.round(rect.w * dpr);
						const ph = Math.round(rect.h * dpr);
						if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
						ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
						ctx.clearRect(0, 0, rect.w, rect.h);

						const rootEl = rootRef.current;
						if (rootEl) rootEl.style.cursor = st.mode === "playing" ? "none" : "crosshair";

						if (st.mode === "idle") return;

						if (st.mode === "hovering") {
							if (now - st.hoverStart >= HOVER_DELAY) {
								if (!st.helpDone) {
									st.mode = "help";
									setHelpVisible(true);
								} else {
									st.mode = "countdown";
									st.countdownStart = now;
								}
							} else {
								return;
							}
						}

						if (st.mode === "help") return;

						if (st.mode === "countdown") {
							const elapsed = (now - st.countdownStart) / 1000;
							if (elapsed >= COUNTDOWN) {
								if (!st.helpDone) {
									st.mode = "help";
									setHelpVisible(true);
								} else {
									beginPlay(st, rect);
								}
							} else {
								const remain = Math.ceil(COUNTDOWN - elapsed);
								const size = Math.min(rect.w * 0.5, 76);
								ctx.fillStyle = "#000";
								ctx.textAlign = "center";
								ctx.textBaseline = "middle";
								ctx.font = "700 " + size + "px system-ui, sans-serif";
								ctx.fillText(String(remain), rect.w / 2, rect.h / 2 - 6);
								ctx.font = "600 12px system-ui, sans-serif";
								ctx.fillText("即将开始", rect.w / 2, rect.h / 2 + size * 0.66);
								return;
							}
						}

						if (st.mode === "over") {
							ctx.fillStyle = "#000";
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.font = "700 " + Math.min(rect.w * 0.24, 30) + "px system-ui, sans-serif";
							ctx.fillText("GAME OVER", rect.w / 2, rect.h / 2 - 12);
							ctx.font = "600 12px system-ui, sans-serif";
							ctx.fillText("SCORE " + st.score, rect.w / 2, rect.h / 2 + 16);
							if (now >= st.overUntil) {
								st.mode = "countdown";
								st.countdownStart = now;
							}
							return;
						}

						st.t += dt;
						update(st, dt, rect);
						draw(st, ctx, rect, now);
					} catch (err) {}
				};

				raf = requestAnimationFrame(loop);
				window.addEventListener("resize", recompute);

				return () => {
					try { cancelAnimationFrame(raf); } catch (e) {}
					try { window.removeEventListener("resize", recompute); } catch (e) {}
					try { if (obs) obs.disconnect(); } catch (e) {}
					st.mode = "idle";
				};
			}, []);

			const onEnter = () => {
				const st = gRef.current;
				if (!st) return;
				if (st.mode !== "playing") {
					st.mode = "hovering";
					st.hoverStart = performance.now();
				}
			};
			const onLeave = (e) => {
				const st = gRef.current;
				const root = rootRef.current;
				if (!st || !root) return;
				const r = root.getBoundingClientRect();
				let x = st.mouse.x;
				let y = st.mouse.y;
				if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
					x = e.clientX - r.left;
					y = e.clientY - r.top;
				}
				const bottomExit = y >= r.height - EXIT_EDGE;
				if (!bottomExit) {
					st.dead = true;
				}
				st.mode = "idle";
				setHelpVisible(false);
				st.bullets.length = 0;
				st.ebullets.length = 0;
				st.enemies.length = 0;
				st.parts.length = 0;
			};
			const onMove = (e) => {
				const st = gRef.current;
				const root = rootRef.current;
				if (!st || !root) return;
				const r = root.getBoundingClientRect();
				st.mouse.x = e.clientX - r.left;
				st.mouse.y = e.clientY - r.top;
			};
			const onHelpConfirm = () => {
				const st = gRef.current;
				if (!st) return;
				st.helpDone = true;
				setHelpVisible(false);
				const rect = geomRef.current;
				if (rect) beginPlay(st, rect);
			};

			if (!geom) return null;
			const helpOverlay = helpVisible ? React.createElement("div", {
				style: {
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 10,
					padding: 16,
					boxSizing: "border-box",
					textAlign: "center",
					color: "#000",
					font: "13px/1.7 system-ui, sans-serif",
					pointerEvents: "auto",
					cursor: "default",
					userSelect: "none",
				},
			},
				React.createElement("div", { style: { fontWeight: 700, fontSize: 15, letterSpacing: "0.06em" } }, "摸鱼战机"),
				React.createElement("div", null, "鼠标移动控制战机 · 自动开火"),
				React.createElement("div", null, "击落敌机得分，躲开弹幕"),
				React.createElement("div", null, "3 条命 · 移出区域即退出"),
				React.createElement("div", null, "鼠标从底部滑出可保留进度"),
				React.createElement("button", {
					className: "ws-shmup-help-btn",
					onClick: onHelpConfirm,
					style: {
						marginTop: 8,
						padding: "7px 22px",
						border: "1.5px solid #000",
						borderRadius: 999,
						background: "transparent",
						color: "#000",
						fontSize: 13,
						fontWeight: 600,
						fontFamily: "inherit",
						cursor: "pointer",
					},
				}, "确认，开始！")
			) : null;

			return React.createElement(
				"div",
				{
					ref: rootRef,
					style: {
						position: "absolute",
						left: geom.left,
						top: geom.top,
						width: geom.w,
						height: geom.h,
						pointerEvents: "auto",
						cursor: "crosshair",
						userSelect: "none",
						zIndex: 5,
					},
					onMouseEnter: onEnter,
					onMouseLeave: onLeave,
					onMouseMove: onMove,
				},
				React.createElement("canvas", {
					ref: canvasRef,
					style: { width: "100%", height: "100%", display: "block", pointerEvents: "none" },
				}),
				helpOverlay
			);
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			slots.inject("shell.overlay", () => slots.register(
				{ name: "shell.overlay", id: "whitespace-shmup", order: -80 },
				() => React.createElement(ShmupGame, null)
			));
		}

		exports.apply = apply;
		return module.exports;
	}
});

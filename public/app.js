'use strict';
/* ============================================================
   背单词 App 主逻辑
   功能：分类学习 / 加权随机抽词(强化记忆) / 4标签
        / 学习统计 / 按标签复习 / 连续打卡
   持久化：localStorage（标签、已学、轮数、打卡）
   ============================================================ */

// ===== 分类配置 =====
const CATS = {
  junior: { name: '初中', color: '#4f8cff', icon: '📘' },
  senior: { name: '高中', color: '#7c5cff', icon: '📗' },
  cet4:   { name: '四级', color: '#00a8a8', icon: '📘' },
  cet6:   { name: '六级', color: '#e84393', icon: '📕' },
  major:  { name: '专业', color: '#00b894', icon: '💻' }
};

// ===== 标签配置（权重越高越易被抽到，用于强化记忆）=====
const LABELS = {
  know:     { name: '认识',     color: '#34c759', weight: 0.3 },
  fuzzy:    { name: '模糊',     color: '#f5a623', weight: 3 },
  key:      { name: '重点',     color: '#ff6b35', weight: 4 },
  must:     { name: '必背',     color: '#e74c3c', weight: 5 },
  graduate: { name: '过关',     color: '#4f7cff', weight: 0 }
};
const LABEL_ORDER = ['know', 'fuzzy', 'key', 'must', 'graduate'];

/** 应用版本号 · 每次发版 bump（跟 service-worker.js CACHE_VERSION 同步）*/
const APP_VERSION = 'v1.0.0';

// ===== 存储读写 =====
// 原始读写（不经过 profile 前缀，给档案管理自己用）
function _rawLoad(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch (e) { return def; }
}
function _rawSave(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/** HTML 转义（防止用户输入的档案名带特殊字符破坏 DOM）*/
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ===== 多用户档案管理 =====
const PROFILES_KEY = 'wa:profiles';
const ACTIVE_PROFILE_KEY = 'wa:active-profile';
const MIGRATED_KEY = 'wa:migrated-v2';
const STATE_KEYS = ['labels', 'studied', 'sessions', 'totals', 'checkin', 'autoBackup', 'cursor', 'lookups', 'p-labels', 'p-studied', 'p-sessions', 'p-totals', 'p-cursor'];

function getProfiles() { return _rawLoad(PROFILES_KEY, []); }
function saveProfiles(p) { _rawSave(PROFILES_KEY, p); }
function getActiveProfileId() {
  const ps = getProfiles();
  const aid = _rawLoad(ACTIVE_PROFILE_KEY, null);
  if (aid && ps.some(p => p.id === aid)) return aid;
  return ps[0]?.id || null;
}
function getActiveProfileName() {
  const id = getActiveProfileId();
  if (!id) return null;
  return getProfiles().find(p => p.id === id)?.name || null;
}
function profileKey(key) {
  const id = getActiveProfileId();
  return id ? key.replace(/^wa:/, `wa:${id}:`) : key;
}
function createProfile(name) {
  const ps = getProfiles();
  const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  ps.push({ id, name: name || '新用户', createdAt: Date.now() });
  saveProfiles(ps);
  return id;
}
function renameProfile(id, newName) {
  const ps = getProfiles();
  const p = ps.find(x => x.id === id);
  if (p) { p.name = newName; saveProfiles(ps); }
}
function deleteProfile(id) {
  const ps = getProfiles().filter(p => p.id !== id);
  saveProfiles(ps);
  STATE_KEYS.forEach(k => localStorage.removeItem(`wa:${id}:${k}`));
  if (_rawLoad(ACTIVE_PROFILE_KEY, null) === id) {
    const na = ps[0]?.id;
    if (na) _rawSave(ACTIVE_PROFILE_KEY, na);
    else localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}
function setActiveProfile(id) {
  _rawSave(ACTIVE_PROFILE_KEY, id);
  reloadStore();
}
function reloadStore() {
  STORE.labels    = load('wa:labels', {});
  STORE.studied   = load('wa:studied', {});
  STORE.sessions  = load('wa:sessions', defaultsByCat());
  STORE.totals    = load('wa:totals',   defaultsByCat());
  STORE.checkin   = load('wa:checkin',  { streak: 0, lastDate: '', dates: [] });
  STORE.autoBackup= load('wa:autoBackup',{ lastAuto: '', count: 0, handleReady: false });
  STORE.cursor    = load('wa:cursor',   defaultsByCat());
  STORE.lookups   = load('wa:lookups', {});
  STORE.pLabels   = load('wa:p-labels', {});
  STORE.pStudied  = load('wa:p-studied', {});
  STORE.pSessions = load('wa:p-sessions', 0);
  STORE.pTotals   = load('wa:p-totals',  0);
  STORE.pCursor   = load('wa:p-cursor',  0);
}

// 一次性迁移：老数据 (wa:labels 等无前缀) → "用户1"档案
function migrateToProfiles() {
  if (_rawLoad(MIGRATED_KEY, false)) return;
  const hasOld = STATE_KEYS.some(k => localStorage.getItem(`wa:${k}`) !== null);
  if (hasOld) {
    const id = createProfile('用户1');
    STATE_KEYS.forEach(k => {
      const v = localStorage.getItem(`wa:${k}`);
      if (v !== null) {
        localStorage.setItem(`wa:${id}:${k}`, v);
        localStorage.removeItem(`wa:${k}`);
      }
    });
    _rawSave(ACTIVE_PROFILE_KEY, id);
  } else {
    const id = createProfile('默认用户');
    _rawSave(ACTIVE_PROFILE_KEY, id);
  }
  _rawSave(MIGRATED_KEY, true);
}
migrateToProfiles();

// 应用层 load/save：自动加 profile 前缀
function load(key, def) { return _rawLoad(profileKey(key), def); }
function save(key, val) { _rawSave(profileKey(key), val); }

/** 根据 WORDS 动态生成分类默认值对象，新增分类时自动适配，无需改代码 */
function defaultsByCat() {
  const cats = Object.keys(window.WORDS || {});
  const obj = {};
  for (const c of cats) obj[c] = 0;
  return obj;
}

const STORE = {
  labels:   load('wa:labels', {}),                                  // { "cat:word": "know|fuzzy|key|must|graduate" }
  studied:  load('wa:studied', {}),                                 // { "cat:word": 练习次数 }
  sessions: load('wa:sessions', defaultsByCat()),                    // 每分类完成轮数
  totals:   load('wa:totals',   defaultsByCat()),                    // 每分类累计练习词数
  checkin:  load('wa:checkin', { streak: 0, lastDate: '', dates: [] }),
  autoBackup: load('wa:autobackup', { lastAuto: '', count: 0, handleReady: false }), // 自动备份状态
  cursor:   load('wa:cursor',   defaultsByCat()),                    // 每分类未学词游标推进位置
  lookups:  load('wa:lookups', {}),                                  // 查词本：{ "cat:word": { count: 次数, lastAt: 时间戳 } }
  pLabels:  load('wa:p-labels', {}),                                 // 短语标签 { "phrase:短语": "know|fuzzy|..." }
  pStudied: load('wa:p-studied', {}),                                // 短语已学 { "phrase:短语": 次数 }
  pSessions: load('wa:p-sessions', 0),                               // 短语完成轮数
  pTotals:  load('wa:p-totals', 0),                                  // 短语累计练习数
  pCursor:  load('wa:p-cursor', 0)                                   // 短语游标
};
/** 持久化全部状态 */
function persist() {
  save('wa:labels', STORE.labels);
  save('wa:studied', STORE.studied);
  save('wa:sessions', STORE.sessions);
  save('wa:totals', STORE.totals);
  save('wa:checkin', STORE.checkin);
  save('wa:autobackup', STORE.autoBackup);
  save('wa:cursor', STORE.cursor);
  save('wa:lookups', STORE.lookups);
  save('wa:p-labels', STORE.pLabels);
  save('wa:p-studied', STORE.pStudied);
  save('wa:p-sessions', STORE.pSessions);
  save('wa:p-totals', STORE.pTotals);
  save('wa:p-cursor', STORE.pCursor);
}

// ===== 工具函数 =====
/** 今日日期字符串 YYYY-MM-DD */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function wordKey(cat, word) { return cat + ':' + word; }
function labelOf(cat, word) { return STORE.labels[wordKey(cat, word)]; }
/** 取某词的抽取权重 */
function weightOf(cat, word) {
  const l = labelOf(cat, word);
  if (l && LABELS[l]) return LABELS[l].weight;
  return STORE.studied[wordKey(cat, word)] ? 0.6 : 1;
}
function catCount(cat) { return (window.WORDS[cat] || []).length; }
/** 统计某分类各标签词数 */
function countLabels(cat) {
  const r = { know: 0, fuzzy: 0, key: 0, must: 0, graduate: 0 };
  Object.keys(STORE.labels).forEach(k => {
    if (k.startsWith(cat + ':')) { const l = STORE.labels[k]; if (r[l] !== undefined) r[l]++; }
  });
  return r;
}
/** 统计某分类已学词数 */
function studiedCount(cat) {
  return Object.keys(STORE.studied).filter(k => k.startsWith(cat + ':')).length;
}

// ===== 掌握度 =====
/** 各分类目标掌握度（百分比） */
const TARGETS = { junior: 99, senior: 95, cet4: 90, cet6: 90, major: 95 };
/** 掌握度颜色分档：<50红 / 50-70橙 / 70-85黄 / 85-95蓝 / ≥95绿 */
function masteryColor(pct) {
  if (pct < 50) return '#e74c3c';
  if (pct < 70) return '#e67e22';
  if (pct < 85) return '#f1c40f';
  if (pct < 95) return '#3498db';
  return '#2ecc71';
}
/** 掌握度档位文字 */
function masteryLabel(pct) {
  if (pct < 50) return '起步';
  if (pct < 70) return '过半';
  if (pct < 85) return '良好';
  if (pct < 95) return '优秀';
  return '精通';
}
/** 计算某分类掌握度百分比 = (过关词 + 认识词) / 总词数 × 100 */
function masteryOf(cat) {
  const total = catCount(cat);
  if (total === 0) return 0;
  const lb = countLabels(cat);
  return Math.round((lb.graduate + lb.know) / total * 1000) / 10; // 保留一位小数
}

// ===== 抽词逻辑 =====
/**
 * 游标顺序推进抽词：优先未学过的词，按游标顺序取，绝不回头
 * 未学词按语料频次降序排列，游标每次前进 n，不重叠不跳段
 * 游标到末尾后回到 0 重新扫（此时未学池已因过关/标签变小，剩余少量继续扫）
 * 未学词不足 n 时，用加权随机从已学词补充（含必背/重点强化）
 * 已过关（标"过关"）的词不参与抽词
 * @param cat 分类
 * @param n 数量
 */
function pickWords(cat, n) {
  // 过滤掉已过关（标"过关"）的词
  const list = (window.WORDS[cat] || []).filter(w => labelOf(cat, w.word) !== 'graduate');
  if (list.length === 0) return [];

  // 拆分：未学过 vs 已学过
  // 注意：不在此处 sort！data.js 里的词已按 hit 排序（hit:true 在前），
  // 每次 sort 会打乱 hit 相同词的相对顺序，导致游标指向的位置对应不同的词 → 重复抽词
  const unlearned = list.filter(w => !STORE.studied[wordKey2(cat, w.word)]);
  const learned   = list.filter(w =>  STORE.studied[wordKey2(cat, w.word)]);

  // 初始化游标（防未定义）
  if (typeof STORE.cursor[cat] !== 'number' || STORE.cursor[cat] < 0) STORE.cursor[cat] = 0;
  // 游标超出当前未学池长度时归零重扫
  if (STORE.cursor[cat] >= unlearned.length) STORE.cursor[cat] = 0;

  const take = Math.min(n, unlearned.length);
  // 从游标位置开始取连续 take 个；若到末尾不够则回绕从头补够（极少发生）
  const result = [];
  if (unlearned.length > 0) {
    let i = STORE.cursor[cat];
    while (result.length < take) {
      result.push(unlearned[i]);
      i++;
      if (i >= unlearned.length) i = 0;
    }
    // 游标前进 take（模未学池长度，下次进来长度可能已变小）
    STORE.cursor[cat] = (STORE.cursor[cat] + take) % Math.max(1, unlearned.length);
  }

  // 不足 n 时，用加权随机从已学词补充
  if (result.length < n && learned.length > 0) {
    const used = new Set(result.map(w => w.word));
    while (result.length < n && used.size < learned.length) {
      const cand = learned.filter(w => !used.has(w.word));
      const total = cand.reduce((s, w) => s + weightOf(cat, w.word), 0);
      let r = Math.random() * total;
      let picked = cand[0];
      for (const w of cand) { r -= weightOf(cat, w.word); if (r <= 0) { picked = w; break; } }
      used.add(picked.word);
      result.push(picked);
    }
  }
  persist(); // 保存游标
  return result;
}

/** 构造存储 key 形式 "cat:word" */
function wordKey2(cat, word) { return cat + ':' + word; }

/**
 * 按标签筛选抽词（复习模式）
 */
function pickByLabels(cat, labels, n) {
  const list = (window.WORDS[cat] || []).filter(w => {
    const l = labelOf(cat, w.word);
    return l && labels.includes(l);
  });
  const shuffled = list.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ===== 查词 & 查词本 =====
/**
 * 跨 5 个分类搜索单词，返回所有匹配结果（精确匹配，大小写不敏感）
 * @param {string} word - 要搜索的单词
 * @returns {Array<{cat, word, phonetic, meaning, example}>} 匹配结果列表
 */
function searchWord(word) {
  const q = (word || '').trim().toLowerCase();
  if (!q) return [];
  const results = [];
  Object.keys(CATS).forEach(cat => {
    const list = window.WORDS[cat] || [];
    for (const w of list) {
      if (w.word.toLowerCase() === q) {
        results.push({ cat, word: w.word, phonetic: w.phonetic, meaning: w.meaning, example: w.example });
        break; // 同分类内不会有重复，找到即停
      }
    }
  });
  return results;
}

/**
 * 记录一次查词：count+1，更新 lastAt，自动收入查词本
 * @param {string} cat - 分类
 * @param {string} word - 单词
 */
function recordLookup(cat, word) {
  const k = wordKey(cat, word);
  const old = STORE.lookups[k] || { count: 0, lastAt: 0 };
  STORE.lookups[k] = { count: old.count + 1, lastAt: Date.now() };
  persist();
}

/** 取某词的查词次数 */
function lookupCount(cat, word) {
  const k = wordKey(cat, word);
  return (STORE.lookups[k] && STORE.lookups[k].count) || 0;
}

/** 查词本总词数 */
function lookupTotal() { return Object.keys(STORE.lookups).length; }

/**
 * 从查词本抽词练习（按查词次数降序，所有词都可复习/改标签）
 * @param {number} n - 抽取数量
 * @returns {Array} 单词对象数组
 */
function pickFromLookups(n) {
  // 1. 收集所有查过的词，附带 count
  const items = Object.keys(STORE.lookups).map(k => {
    const [cat, ...rest] = k.split(':');
    const word = rest.join(':');
    return { cat, word, count: STORE.lookups[k].count };
  });
  // 2. 按查词次数降序排列（查得越多越先练，不管什么标签都可复习/改标签）
  items.sort((a, b) => b.count - a.count);
  // 3. 取前 n 个，还原为 WORDS 里的完整对象
  const take = items.slice(0, n);
  return take.map(it => {
    const w = (window.WORDS[it.cat] || []).find(x => x.word === it.word);
    return w ? { ...w, _cat: it.cat, _lookupCount: it.count } : null;
  }).filter(Boolean);
}

// ===== 连续打卡 =====
/** 每天完成一轮即打卡，连续天数递增 */
function checkin() {
  const today = todayStr();
  if (STORE.checkin.lastDate === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
  STORE.checkin.streak = (STORE.checkin.lastDate === yStr) ? STORE.checkin.streak + 1 : 1;
  STORE.checkin.lastDate = today;
  STORE.checkin.dates.push(today);
  if (STORE.checkin.dates.length > 400) STORE.checkin.dates = STORE.checkin.dates.slice(-400);
}

// ===== 当前学习会话（内存）=====
let session = null;
let reviewSel = { labels: new Set(), n: 20 };

/** 初始化一次学习会话 */
function startSession(cat, words) {
  session = { cat, words, idx: 0, flipped: false, labels: {} };
  // 启动时重置倒计时（短语用 12s/条，单词用 8s/条）
  const secPer = (cat === 'phrase') ? SEC_PER_PHRASE : SEC_PER_WORD;
  timerReset(words.length, secPer);
}

// ===== 倒计时（紧迫感 · 默认 3s/词）=====
const SEC_PER_WORD = 8;        // 默认每词 8 秒（首遍过单词表时节奏较宽松，后续熟悉可下调到 5s/3s）
const SEC_PER_PHRASE = 12;     // 短语每条 12 秒（短语需要多看一眼，比单词更宽）
const TIMER_CIRC = 2 * Math.PI * 22;  // SVG 圆环周长（r=22）
let timer = {
  totalMs: 0,        // 目标总时长（毫秒）
  remainMs: 0,       // 剩余毫秒
  startedAt: 0,      // 本次计时开始的时间戳（用于切页暂停校正）
  paused: false,     // 是否手动暂停
  autoPaused: false, // 是否因切页面自动暂停
  elapsedAtStart: 0, // 会话开始时已过去的总时间
  id: null,          // setInterval id
  totalElapsed: 0    // 本轮实际花费的总毫秒（用于结果页）
};

/** 按词数重置倒计时并启动 */
function timerReset(wordCount, secPer) {
  timerStop();
  secPer = secPer || SEC_PER_WORD;
  const total = Math.max(10, wordCount * secPer) * 1000;
  timer.totalMs = total;
  timer.remainMs = total;
  timer.startedAt = Date.now();
  timer.elapsedAtStart = 0;
  timer.totalElapsed = 0;
  timer.paused = false;
  timer.autoPaused = false;
  timer.id = setInterval(timerTick, 250);
}

/** 停止并清空定时器 */
function timerStop() {
  if (timer.id) { clearInterval(timer.id); timer.id = null; }
}

/** 每 250ms 推进倒计时一次 */
function timerTick() {
  if (timer.paused || timer.autoPaused) return;
  const now = Date.now();
  timer.remainMs -= (now - timer.startedAt);
  timer.startedAt = now;
  if (timer.remainMs <= 0) {
    timer.remainMs = 0;
    // 时间到：累计实际用时 = 目标时间（到点了）
    timer.totalElapsed += timer.totalMs;
    timerStop();
    // 时间到：剩余词不算学过，跳结果页
    const done = Object.keys(session.labels).reduce((s, k) => s + (session.labels[k] || 0), 0);
    const total = session.words.length;
    alert(`⏱ 时间到！\n\n已完成 ${done} / ${total} 个词\n剩余 ${total - done} 个词不算学过，下次还会遇到。`);
    // 直接跳结果页（不调用 advance，不记 sessions 增量）
    persist();
    checkAutoBackup();
    location.hash = '#/result/' + session.cat;
    return;
  }
  // 更新 DOM 显示
  const el = document.getElementById('timer-circle');
  if (el) timerRender();
}

/** 把剩余时间格式化成 00:12 / 01:05 字符串 */
function fmtTime(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

/** 渲染圆环进度 + 数字 + 颜色 */
function timerRender() {
  const ratio = timer.totalMs > 0 ? timer.remainMs / timer.totalMs : 1;
  const cls = ratio > 0.6 ? 'ok' : ratio > 0.3 ? 'warn' : 'danger';
  const offset = TIMER_CIRC * (1 - ratio);
  const html = `
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <circle class="track" cx="26" cy="26" r="22"></circle>
      <circle class="progress ${cls}" cx="26" cy="26" r="22"
              stroke-dasharray="${TIMER_CIRC.toFixed(2)}"
              stroke-dashoffset="${offset.toFixed(2)}"></circle>
    </svg>
    <div class="timer-text">${fmtTime(timer.remainMs)}</div>`;
  const el = document.getElementById('timer-circle');
  if (el) el.innerHTML = html;
  // 同步暂停按钮文本
  const pb = document.getElementById('timer-pause-btn');
  if (pb) pb.textContent = (timer.paused || timer.autoPaused) ? '▶' : '⏸';
}

/** 手动暂停 / 继续 */
function timerTogglePause() {
  if (!timer.id) return;
  if (!timer.paused && !timer.autoPaused) {
    // 暂停
    timer.paused = true;
  } else if (timer.paused) {
    // 恢复
    timer.paused = false;
    timer.startedAt = Date.now();
  } else {
    // autoPaused 恢复
    timer.autoPaused = false;
    timer.startedAt = Date.now();
  }
  timerRender();
}

/** 切页面可见性：隐藏时自动暂停，可见时恢复 */
function timerOnVisibility() {
  if (!session || !timer.id) return;
  if (document.hidden) {
    if (!timer.paused && !timer.autoPaused) timer.autoPaused = true;
  } else {
    if (timer.autoPaused) {
      timer.autoPaused = false;
      timer.startedAt = Date.now();
      timerRender();
    }
  }
}

// ===== 短语本 =====
/** 短语存储 key 形式 "phrase:短语原文" */
function phraseKey(phrase) { return 'phrase:' + phrase; }
/** 取某短语的标签 */
function phraseLabelOf(phrase) { return STORE.pLabels[phraseKey(phrase)]; }
/** 短语总数 */
function phraseTotal() { return (window.PHRASES || []).length; }
/** 统计短语各标签数 */
function phraseCountLabels() {
  const r = { know: 0, fuzzy: 0, key: 0, must: 0, graduate: 0 };
  Object.keys(STORE.pLabels).forEach(k => {
    const l = STORE.pLabels[k];
    if (r[l] !== undefined) r[l]++;
  });
  return r;
}
/** 短语已学数 */
function phraseStudiedCount() {
  return Object.keys(STORE.pStudied).filter(k => k.startsWith('phrase:')).length;
}
/** 短语掌握度 = (过关+认识) / 总数 × 100 */
function phraseMastery() {
  const total = phraseTotal();
  if (total === 0) return 0;
  const lb = phraseCountLabels();
  return Math.round((lb.graduate + lb.know) / total * 1000) / 10;
}
/**
 * 从短语本抽词（游标顺序推进，复用单词本同款逻辑）
 * 跳过已过关的短语，未学优先，不足时从已学随机补充
 * @param {number} n - 抽取数量
 * @returns {Array} 短语对象数组
 */
function pickPhrases(n) {
  const list = (window.PHRASES || []).filter(p => phraseLabelOf(p.phrase) !== 'graduate');
  if (list.length === 0) return [];
  const unlearned = list.filter(p => !STORE.pStudied[phraseKey(p.phrase)]);
  const learned   = list.filter(p =>  STORE.pStudied[phraseKey(p.phrase)]);
  if (STORE.pCursor >= unlearned.length) STORE.pCursor = 0;
  const take = Math.min(n, unlearned.length);
  const result = [];
  if (unlearned.length > 0) {
    let i = STORE.pCursor;
    while (result.length < take) {
      result.push(unlearned[i]);
      i++;
      if (i >= unlearned.length) i = 0;
    }
    STORE.pCursor = (STORE.pCursor + take) % Math.max(1, unlearned.length);
  }
  if (result.length < n && learned.length > 0) {
    const used = new Set(result.map(p => p.phrase));
    while (result.length < n && used.size < learned.length) {
      const cand = learned.filter(p => !used.has(p.phrase));
      const shuffled = cand.sort(() => Math.random() - 0.5);
      result.push(shuffled[0]);
      used.add(shuffled[0].phrase);
    }
  }
  persist();
  return result;
}

// ===== 路由 =====
/** 解析 hash 并渲染对应页面 */
function route() {
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  const p = parts[0] || 'home';
  const app = document.getElementById('app');
  let html = '';
  if (p === 'home' || p === '') html = renderHome();
  else if (p === 'cat') html = renderCat(parts[1]);
  else if (p === 'study') html = renderStudy(parts[1], parseInt(parts[2] || '20', 10));
  else if (p === 'review') html = renderReview(parts[1]);
  else if (p === 'result') html = renderResult(parts[1]);
  else if (p === 'stats') html = renderStats();
  else if (p === 'lookup') html = renderLookup();
  else if (p === 'phrase') html = renderPhraseBook();
  else if (p === 'profile') html = renderProfile();
  else if (p === 'dev-plan') { renderDevPlan(app); return; }
  else if (p === 'changelog') { renderChangelog(app); return; }
  else html = renderHome();
  app.innerHTML = html;
  window.scrollTo(0, 0);
  // 路由渲染完，如果是学习页，立即把当前圆环进度渲染出来
  const p2 = (location.hash.slice(1) || '/').split('/').filter(Boolean)[0] || 'home';
  if (p2 === 'study' && timer.id) timerRender();

  // 同步 APP_VERSION 到 header 徽章
  const verEl = document.getElementById('app-version');
  if (verEl) verEl.textContent = APP_VERSION;
}

// ===== 页面渲染 =====

/** 首页：打卡条 + 三分类卡片 + 统计入口 */
function renderHome() {
  const ci = STORE.checkin;
  const cards = Object.keys(CATS).map(cat => {
    const total = catCount(cat);
    const lb = countLabels(cat);
    const studied = studiedCount(cat);
    const pct = masteryOf(cat);
    const color = masteryColor(pct);
    const target = TARGETS[cat] || 90;
    return `
      <div class="cat-card" data-action="go-cat" data-cat="${cat}" style="--c:${CATS[cat].color}">
        <div class="cat-head">
          <span class="cat-ico">${CATS[cat].icon}</span>
          <span class="cat-name">${CATS[cat].name}</span>
          <span class="cat-pct-badge" style="background:${color}">${pct}%</span>
        </div>
        <div class="mastery-bar-wrap">
          <div class="mastery-bar">
            <div class="mastery-fill" style="width:${pct}%;background:${color}"></div>
            <div class="mastery-target" style="left:${target}%" title="目标 ${target}%"></div>
          </div>
        </div>
        <div class="cat-foot">
          <small>已学 ${studied}/${total}</small>
        </div>
      </div>`;
  }).join('');
  return `
  <header class="topbar">
    <div class="brand">背单词</div>
    <span class="version-badge" id="app-version" title="Build version · 与 service-worker.js CACHE_VERSION 同步">v1.0.0</span>
    <button class="refresh-app-btn" id="refresh-app-btn" type="button" data-action="refresh-app" title="刷新应用 · 清缓存重载（数据更新后用）">🔄</button>
    <div class="profile-chip" data-action="go-profile" title="切换/管理用户">
      <span class="profile-icon">👤</span><span class="profile-name">${escapeHtml(getActiveProfileName() || '默认用户')}</span><span class="profile-caret">▾</span>
    </div>
    <div class="checkin" data-action="go-stats">
      <span class="fire">🔥</span><span>${ci.streak}</span><small>连续打卡</small>
    </div>
  </header>
  <main class="page">
    <div class="hero">
      <h2>每天背一点</h2>
      <p>坚持是最快的捷径</p>
    </div>
    <div class="search-box">
      <input type="text" id="search-input" placeholder="🔍 粘贴单词查释义 / 自动收入查词本" autocomplete="off">
      <button class="search-btn" data-action="search">搜索</button>
    </div>
    <div id="search-result"></div>
    <div class="cats-grid">${cards}</div>
    <div class="cat-card lookup-card" data-action="go-lookup" style="--c:#6c5ce7">
      <div class="cat-head">
        <span class="cat-ico">🔍</span>
        <span class="cat-name">查词本</span>
      </div>
      <div class="cat-stats">
        <span>已收集 ${lookupTotal()} 个词</span>
        <span>按查词次数排序</span>
      </div>
      <div class="mastery">
        <div class="mastery-info">
          <span>老记不住的词，专门练</span>
          <b>专练 ›</b>
        </div>
      </div>
    </div>
    <footer class="contact-footer">
      <small>📮 问题反馈 · <a href="mailto:[email protected]?subject=背单词%20PWA%20反馈">[email protected]</a></small>
    </footer>
    <div class="cat-card" data-action="go-phrase" style="--c:#e17055">
      <div class="cat-head">
        <span class="cat-ico">📚</span>
        <span class="cat-name">短语本</span>
      </div>
      <div class="cat-stats">
        <span>${phraseStudiedCount()}/${phraseTotal()} 已学 · 过关 ${phraseCountLabels().graduate}</span>
        <span>必背 ${phraseCountLabels().must} · 重点 ${phraseCountLabels().key}</span>
      </div>
      <div class="mastery">
        <div class="mastery-info">
          <span>掌握度 <small style="color:${masteryColor(phraseMastery())}">${masteryLabel(phraseMastery())}</small></span>
          <b style="color:${masteryColor(phraseMastery())}">${phraseMastery()}%</b>
        </div>
        <div class="mastery-bar">
          <div class="mastery-fill" style="width:${phraseMastery()}%;background:${masteryColor(phraseMastery())}"></div>
        </div>
      </div>
    </div>
    <button class="btn-ghost" data-action="go-stats">学习统计</button>
    <button class="btn-ghost" data-action="go-devplan" style="margin-top:8px;font-size:13px;opacity:.7">📋 开发计划</button>
    <button class="btn-ghost" data-action="go-changelog" style="margin-top:6px;font-size:13px;opacity:.7">📝 更新日志</button>
  </main>`;
}

/** 查词本详情页：列表 + 数量按钮 + 清空 */
function renderLookup() {
  // 收集所有查词记录，按次数降序
  const items = Object.keys(STORE.lookups).map(k => {
    const [cat, ...rest] = k.split(':');
    const word = rest.join(':');
    const lk = STORE.lookups[k];
    const w = (window.WORDS[cat] || []).find(x => x.word === word);
    const lb = labelOf(cat, word);
    return { cat, word, count: lk.count, lastAt: lk.lastAt, meaning: w ? w.meaning : '', phonetic: w ? w.phonetic : '', label: lb };
  }).sort((a, b) => b.count - a.count);

  const total = items.length;

  // 列表只显示查词次数最多的前 10 名
  const rows = items.slice(0, 10).map(it => {
    const catName = CATS[it.cat] ? CATS[it.cat].name : it.cat;
    const catColor = CATS[it.cat] ? CATS[it.cat].color : '#999';
    const lbText = it.label ? `<span class="tag" style="background:${LABELS[it.label].color}">${LABELS[it.label].name}</span>` : '<span class="tag" style="background:#bbb">未标记</span>';
    return `
      <div class="lookup-row">
        <div class="lookup-word">
          <b>${it.word}</b>
          ${it.phonetic ? `<small class="lookup-ph">/${it.phonetic}/</small>` : ''}
          <span class="lookup-cat" style="color:${catColor}">${catName}</span>
          ${lbText}
        </div>
        <div class="lookup-meaning">${it.meaning || '—'}</div>
        <div class="lookup-meta">已查 <b>${it.count}</b> 次</div>
      </div>`;
  }).join('');

  return `
  <header class="topbar">
    <button class="back" data-action="go-home">‹ 返回</button>
    <div>🔍 查词本</div><div></div>
  </header>
  <main class="page">
    <div class="stat-block">
      <h3>查词本</h3>
      <div class="stat-grid">
        <span class="l">总词数</span><span class="v">${total}</span>
      </div>
      <p class="hint">按查词次数从多到少排列，所有词都可练习/改标签（列表仅显示前 10 名）</p>
    </div>

    <div class="section-title">选择数量开始练习</div>
    <div class="num-row">
      ${[10, 20, 50].map(n => `<button class="num-btn" data-action="lookup-study" data-n="${n}">${n}</button>`).join('')}
      <button class="num-btn-pro" data-action="lookup-study" data-n="100">100</button>
      <button class="num-btn-max" data-action="lookup-study" data-n="9999">全部</button>
    </div>

    <div class="section-title">单词列表（前 10 名 · 按查词次数降序）</div>
    <div class="lookup-list">
      ${rows || '<p class="empty">查词本为空，去首页搜几个单词吧～</p>'}
    </div>
  </main>`;
}

/** 短语本详情页：统计 + 数量按钮 + 按 level 筛选 */
function renderPhraseBook() {
  const total = phraseTotal();
  const studied = phraseStudiedCount();
  const lb = phraseCountLabels();
  const pct = phraseMastery();
  const color = masteryColor(pct);
  // 各 level 统计
  const levels = {};
  (window.PHRASES || []).forEach(p => { levels[p.level] = (levels[p.level] || 0) + 1; });

  return `
  <header class="topbar">
    <button class="back" data-action="go-home">‹ 返回</button>
    <div>📚 短语本</div><div></div>
  </header>
  <main class="page">
    <div class="stat-block">
      <h3>短语本</h3>
      <div class="stat-grid">
        <span class="l">总短语</span><span class="v">${total}</span>
        <span class="l">已学</span><span class="v">${studied}</span>
        <span class="l">过关</span><span class="v">${lb.graduate}</span>
        <span class="l">掌握度</span><span class="v" style="color:${color}">${pct}%</span>
      </div>
      <div class="level-tags">
        ${Object.entries(levels).map(([lv, cnt]) =>
          `<span class="level-tag">${lv} ${cnt}</span>`
        ).join('')}
      </div>
    </div>

    <div class="section-title">选择数量开始练习</div>
    <div class="num-row">
      ${[10, 20, 50].map(n => `<button class="num-btn" data-action="phrase-study" data-n="${n}">${n}</button>`).join('')}
      <button class="num-btn-pro" data-action="phrase-study" data-n="100">100</button>
      <button class="num-btn-max" data-action="phrase-study" data-n="9999">全部</button>
    </div>
    <p class="hint">每条短语 12 秒，比单词节奏更宽</p>
  </main>`;
}

/** 分类页：选数量 + 复习入口 + 该分类统计 */
function renderCat(cat) {
  if (!CATS[cat]) { location.hash = '#/'; return ''; }
  const total = catCount(cat);
  const lb = countLabels(cat);
  const studied = studiedCount(cat);
  return `
  <header class="topbar">
    <button class="back" data-action="go-home">‹ 返回</button>
    <div>${CATS[cat].icon} ${CATS[cat].name}</div><div></div>
  </header>
  <main class="page">
    <div class="stat-block">
      <h3>${CATS[cat].name} 单词</h3>
      <div class="stat-grid">
        <span class="l">总词数</span><span class="v">${total}</span>
        <span class="l">已学</span><span class="v">${studied}</span>
        <span class="l">完成轮数</span><span class="v">${STORE.sessions[cat] || 0}</span>
      </div>
      <div class="tag-row">
        ${LABEL_ORDER.map(l => `<span class="tag" style="background:${LABELS[l].color}">${LABELS[l].name} ${lb[l]}</span>`).join('')}
      </div>
    </div>

    <div class="section-title">选择数量开始学习</div>
    <div class="num-row">
      ${[10, 20, 50].map(n => `<button class="num-btn" data-action="study" data-cat="${cat}" data-n="${n}">${n}</button>`).join('')}
      <button class="num-btn-pro" data-action="study" data-cat="${cat}" data-n="100">100</button>
      <button class="num-btn-max" data-action="study" data-cat="${cat}" data-n="200">200</button>
    </div>

    <button class="btn-ghost" data-action="go-review" data-cat="${cat}">按标签复习（强化记忆）</button>
    <button class="btn-ghost" data-action="review-graduate" data-cat="${cat}">复习过关词（${lb.graduate}）</button>
    <button class="btn-ghost" data-action="reset-graduate" data-cat="${cat}">重置过关（${lb.graduate}）</button>
  </main>`;
}

/** 学习卡片页 */
function renderStudy(cat, n) {
  const isLookup = cat === 'lookup';
  const isPhrase = cat === 'phrase';
  if (!isLookup && !isPhrase && !CATS[cat]) { location.hash = '#/'; return ''; }
  // 无会话或分类不符时重新抽词
  if (!session || session.cat !== cat || session.words.length === 0) {
    const words = isLookup ? pickFromLookups(n) : isPhrase ? pickPhrases(n) : pickWords(cat, n);
    startSession(cat, words);
  }
  // 已完成则跳结果页
  if (session.idx >= session.words.length) {
    location.hash = '#/result/' + cat;
    return '';
  }
  const s = session;
  const w = s.words[s.idx];
  // 短语模式用 w.phrase，单词模式用 w.word
  const displayText = isPhrase ? w.phrase : w.word;
  const ph = (!isPhrase && w.phonetic) ? `<div class="phonetic">/${w.phonetic}/</div>` : '';
  const ex = w.example ? `<div class="example">${w.example}</div>` : '';
  // 🔊 发音按钮：点击调有道真人发音
  const speakBtn = `<button class="speak-btn" data-action="speak" data-word="${displayText}" title="朗读">🔊</button>`;
  // 查词本模式：显示所属分类 + 当前标签 + 查词次数
  let lookupInfo = '';
  if (isLookup && w._cat) {
    const catName = CATS[w._cat] ? CATS[w._cat].name : w._cat;
    const catColor = CATS[w._cat] ? CATS[w._cat].color : '#999';
    const lb = labelOf(w._cat, w.word);
    const lbText = lb ? `<span class="tag" style="background:${LABELS[lb].color}">${LABELS[lb].name}</span>` : '<span class="tag" style="background:#bbb">未标记</span>';
    lookupInfo = `<div class="lookup-info"><span style="color:${catColor}">📚 ${catName}</span> ${lbText} <small>已查 ${w._lookupCount || 0} 次</small></div>`;
  }
  // 短语模式：显示 level + 当前标签
  let phraseInfo = '';
  if (isPhrase) {
    const lb = phraseLabelOf(w.phrase);
    const lbText = lb ? `<span class="tag" style="background:${LABELS[lb].color}">${LABELS[lb].name}</span>` : '<span class="tag" style="background:#bbb">未标记</span>';
    const lvColor = w.level === '初中' ? '#4f8cff' : w.level === '高中' ? '#7c5cff' : '#00b894';
    phraseInfo = `<div class="lookup-info"><span style="color:${lvColor}">📖 ${w.level}</span> ${lbText}</div>`;
  }
  const front = `
    <div class="card-word">${displayText}</div>
    ${ph}
    ${speakBtn}
    ${lookupInfo}
    ${phraseInfo}
    <button class="btn-main" data-action="flip" style="max-width:200px">看答案</button>`;
  const back = `
    <div class="card-word small">${displayText}</div>
    ${ph}
    ${speakBtn}
    ${lookupInfo}
    ${phraseInfo}
    <div class="meaning">${w.meaning}</div>
    ${ex}
    <div class="label-row">
      ${LABEL_ORDER.slice(0, 4).map(l => `<button class="label-btn" style="--c:${LABELS[l].color}" data-action="label" data-label="${l}">${LABELS[l].name}</button>`).join('')}
    </div>
    <button class="label-btn grad-btn" style="--c:${LABELS.graduate.color}" data-action="label" data-label="graduate">${LABELS.graduate.name} · 不再出现</button>`;
  const backAction = isLookup ? 'go-lookup' : isPhrase ? 'go-phrase' : 'go-cat';
  const backData = (isLookup || isPhrase) ? '' : `data-cat="${cat}"`;
  return `
  <header class="topbar">
    <button class="back" data-action="${backAction}" ${backData}>‹ 退出</button>
    <div class="progress-text">${s.idx + 1} / ${s.words.length}</div>
    <div class="timer-wrap">
      <div class="timer-circle" id="timer-circle"></div>
      <button class="timer-pause-btn" id="timer-pause-btn" data-action="timer-pause" title="暂停/继续">⏸</button>
    </div>
  </header>
  <div class="progress"><div class="progress-bar" style="width:${s.idx / s.words.length * 100}%"></div></div>
  <main class="page study">
    <div class="card">${s.flipped ? back : front}</div>
  </main>`;
}

/** 复习设置页：选标签 + 数量 */
function renderReview(cat) {
  if (!CATS[cat]) { location.hash = '#/'; return ''; }
  const lb = countLabels(cat);
  reviewSel = { labels: new Set(), n: 20 };
  return `
  <header class="topbar">
    <button class="back" data-action="go-cat" data-cat="${cat}">‹ 返回</button>
    <div>${CATS[cat].name} · 复习</div><div></div>
  </header>
  <main class="page">
    <div class="section-title">勾选要复习的标签</div>
    <div class="checks">
      ${LABEL_ORDER.map(l => `
        <label class="check">
          <input type="checkbox" value="${l}" ${lb[l] === 0 ? 'disabled' : ''}>
          <span style="color:${LABELS[l].color}">●</span> ${LABELS[l].name}
          <small>${lb[l]} 词</small>
        </label>`).join('')}
    </div>
    <div class="section-title">数量</div>
    <div class="num-row">
      ${[10, 20, 50].map(n => `<button class="num-btn review-n ${n===20?'active':''}" data-action="review-num" data-n="${n}">${n}</button>`).join('')}
      <button class="num-btn-pro review-n" data-action="review-num" data-n="100">100</button>
      <button class="num-btn-max review-n" data-action="review-num" data-n="200">200</button>
    </div>
    <button class="btn-main" data-action="review-start" data-cat="${cat}">开始复习</button>
  </main>`;
}

/** 结果页：本次标签分布 */
function renderResult(cat) {
  if (!session) {
    location.hash = cat === 'lookup' ? '#/lookup' : cat === 'phrase' ? '#/phrase' : '#/cat/' + (cat || 'junior');
    return '';
  }
  const isLookup = session.cat === 'lookup';
  const isPhrase = session.cat === 'phrase';
  const total = session.words.length;
  const dist = LABEL_ORDER.map(l =>
    `<div class="dist-row"><span style="color:${LABELS[l].color}">●</span> ${LABELS[l].name} <b>${session.labels[l] || 0}</b></div>`
  ).join('');
  const skipped = total - LABEL_ORDER.reduce((s, l) => s + (session.labels[l] || 0), 0);
  // ===== 用时统计 =====
  const secPer = isPhrase ? SEC_PER_PHRASE : SEC_PER_WORD;
  const targetMs = total * secPer * 1000;
  let elapsedMs = timer.totalElapsed;
  if (elapsedMs <= 0) {
    elapsedMs = timer.totalMs > 0 ? (timer.totalMs - timer.remainMs) : 0;
  }
  const perWordMs = total > 0 ? elapsedMs / total : 0;
  const unit = isPhrase ? '条' : '词';
  const elapsedRow = elapsedMs > 0 ? `
    <div class="dist-row">
      <span>⏱</span>
      <b>实际 ${fmtTime(elapsedMs)} / 目标 ${fmtTime(targetMs)}</b>
      <small style="color:var(--ink-soft);margin-left:auto">平均每${unit} ${(perWordMs/1000).toFixed(2)} 秒</small>
    </div>` : '';
  const againAction = isLookup ? 'lookup-study' : isPhrase ? 'phrase-study' : 'study';
  const againData = (isLookup || isPhrase) ? '' : `data-cat="${session.cat}"`;
  const backAction = isLookup ? 'go-lookup' : isPhrase ? 'go-phrase' : 'go-cat';
  const backData = (isLookup || isPhrase) ? '' : `data-cat="${session.cat}"`;
  return `
  <main class="page result">
    <div class="result-ico">🎉</div>
    <h2>完成 ${total} 个${unit}</h2>
    <div class="dist">
      ${elapsedRow}
      ${dist}
      <div class="dist-row"><span style="color:#bbb">●</span> 跳过 <b>${skipped}</b></div>
    </div>
    <div class="btns">
      <button class="btn-main" data-action="${againAction}" ${againData} data-n="20">再背 20 个</button>
      <button class="btn-ghost" data-action="${againAction}" ${againData} data-n="50">再背 50 个</button>
      <button class="num-btn-pro" data-action="${againAction}" ${againData} data-n="100">再背 100 个</button>
      ${isPhrase ? '' : `<button class="num-btn-max" data-action="${againAction}" ${againData} data-n="200">再背 200 个</button>`}
      <button class="btn-ghost" data-action="${backAction}" ${backData}>返回</button>
    </div>
  </main>`;
}

/** 统计页：整体概览 */
function renderStats() {
  const ci = STORE.checkin;
  let totalWords = 0, totalStudied = 0;
  const blocks = Object.keys(CATS).map(cat => {
    const total = catCount(cat);
    totalWords += total;
    const studied = studiedCount(cat);
    totalStudied += studied;
    const lb = countLabels(cat);
    const pct = masteryOf(cat);
    const color = masteryColor(pct);
    const target = TARGETS[cat] || 90;
    const mastered = lb.graduate + lb.know;                 // 已掌握词数（过关+认识）
    const targetCount = Math.round(total * target / 100);  // 达目标需掌握词数
    const diff = Math.max(0, targetCount - mastered);        // 距目标还差多少词
    return `
    <div class="stat-block">
      <h3>${CATS[cat].icon} ${CATS[cat].name}</h3>
      <div class="mastery" style="margin-bottom:12px">
        <div class="mastery-info">
          <span>掌握度 <small style="color:${color}">${masteryLabel(pct)} · 目标 ${target}%</small></span>
          <b style="color:${color}">${pct}%</b>
        </div>
        <div class="mastery-bar">
          <div class="mastery-fill" style="width:${pct}%;background:${color}"></div>
          <div class="mastery-target" style="left:${target}%"></div>
        </div>
        <div class="mastery-sub">已掌握 ${mastered}/${total} · 距目标还差 ${diff} 词</div>
      </div>
      <div class="stat-grid">
        <span class="l">总词数</span><span class="v">${total}</span>
        <span class="l">已学</span><span class="v">${studied}</span>
        <span class="l">完成轮数</span><span class="v">${STORE.sessions[cat] || 0}</span>
        <span class="l">累计练习词次</span><span class="v">${STORE.totals[cat] || 0}</span>
        <span class="l">已过关</span><span class="v">${lb.graduate}</span>
      </div>
      <div class="tag-row">
        ${LABEL_ORDER.map(l => `<span class="tag" style="background:${LABELS[l].color}">${LABELS[l].name} ${lb[l]}</span>`).join('')}
      </div>
    </div>`;
  }).join('');
  return `
  <header class="topbar">
    <button class="back" data-action="go-home">‹ 返回</button>
    <div>学习统计</div><div></div>
  </header>
  <main class="page">
    <div class="stat-block">
      <h3>🔥 连续打卡 ${ci.streak} 天</h3>
      <div class="stat-grid">
        <span class="l">总词数</span><span class="v">${totalWords}</span>
        <span class="l">已学词数</span><span class="v">${totalStudied}</span>
        <span class="l">累计打卡</span><span class="v">${ci.dates.length}</span>
      </div>
    </div>
    ${blocks}
    <div class="stat-block">
      <h3>💾 备份与恢复</h3>
      <div class="stat-grid">
        <span class="l">自动备份</span><span class="v">${STORE.autoBackup.handleReady ? '已设置' : '未设置'}</span>
        <span class="l">上次自动备份</span><span class="v">${STORE.autoBackup.lastAuto ? new Date(STORE.autoBackup.lastAuto).toLocaleString('zh-CN') : '—'}</span>
        <span class="l">自动备份次数</span><span class="v">${STORE.autoBackup.count || 0}</span>
      </div>
      <div class="btns" style="margin-top:12px">
        <button class="btn-main" data-action="manual-export">手动导出</button>
        <button class="btn-main" data-action="setup-autobackup">${STORE.autoBackup.handleReady ? '重新设置自动备份' : '设置自动备份'}</button>
        <button class="btn-ghost" data-action="import-backup">导入备份</button>
        <button class="btn-main" data-action="backup-now" ${STORE.autoBackup.handleReady ? '' : 'disabled'}>立即备份一次</button>
      </div>
      <input type="file" id="import-file" accept=".json" style="display:none">
    </div>
    <button class="btn-ghost" data-action="go-home">返回首页</button>
  </main>`;
}

/** 开发计划页：fetch 读取 开发计划.md 渲染显示（marked 渲染，fallback 纯文本） */
async function renderDevPlan(app) {
  app.innerHTML = `
  <header class="topbar">
    <button class="back" data-action="go-home">‹ 返回</button>
    <div>开发计划</div><div></div>
  </header>
  <main class="page">
    <div class="devplan-body">加载中...</div>
  </main>`;
  try {
    // fetch 本地 开发计划.md 文本内容（需通过 http server 访问，不能用 file://）
    const res = await fetch('开发计划.md');
    const text = await res.text();
    const body = app.querySelector('.devplan-body');
    // 用 marked 渲染 markdown（支持标题/表格/粗体/HTML 标签如红色 span），失败则纯文本
    if (window.marked) {
      body.innerHTML = marked.parse(text);
    } else {
      body.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;text-align:left;font-size:14px;line-height:1.7">${text.replace(/</g, '&lt;')}</pre>`;
    }
  } catch (e) {
    app.querySelector('.devplan-body').textContent = '加载失败：需通过 http server（localhost:8765）访问，不能直接双击打开。';
  }
}

/** 更新日志页：fetch 读取 更新日志.md 渲染显示（marked 渲染，fallback 纯文本） */
async function renderChangelog(app) {
  app.innerHTML = `
  <header class="topbar">
    <button class="back" data-action="go-home">‹ 返回</button>
    <div>更新日志</div><div></div>
  </header>
  <main class="page">
    <div class="devplan-body">加载中...</div>
  </main>`;
  try {
    const res = await fetch('更新日志.md');
    const text = await res.text();
    const body = app.querySelector('.devplan-body');
    if (window.marked) {
      body.innerHTML = marked.parse(text);
    } else {
      body.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;text-align:left;font-size:14px;line-height:1.7">${text.replace(/</g, '&lt;')}</pre>`;
    }
  } catch (e) {
    app.querySelector('.devplan-body').textContent = '加载失败：需通过 http server（localhost:8765）访问，不能直接双击打开。';
  }
}

// ===== 学习交互 =====

/**
 * 朗读英文单词
 * 主方案：有道词典真人发音接口（dict.youdao.com/dictvoice），需联网，返回真人 MP3
 * 兜底：Web Speech API（speechSynthesis），离线可用，Chrome 部分版本可能静默
 * @param {string} word - 要朗读的英文单词
 */
function speakWord(word) {
  if (!word) return;
  try {
    // 取消正在播放的音频（如果有），避免叠加
    if (speakWord._audio) {
      speakWord._audio.pause();
      speakWord._audio.src = '';
      speakWord._audio.onended = null;
      speakWord._audio.onerror = null;
      speakWord._audio = null;
    }
    // 取消 Web Speech（如果之前有残留），避免与有道叠加
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // 有网：优先有道真人发音（type=2 美式，只有一个女声）
    if (navigator.onLine) {
      const url = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
      const audio = new Audio(url);
      audio.playbackRate = 0.9;
      let fallbackFired = false;
      // 只有真正的网络/资源加载失败才回退 Web Speech
      audio.onerror = () => {
        if (fallbackFired) return;
        fallbackFired = true;
        console.warn('[speak] 有道加载失败，退回 Web Speech →', word);
        speakBySpeech(word);
      };
      // play() 的 catch 仅处理自动播放策略拦截等浏览器侧拒绝，不重复回退
      audio.play().catch(err => {
        // 如果是 NotAllowedError（没用户手势/静音了），但 onerror 未触发说明资源本身 OK，就不回退
        // 只在明确是资源错误类时，兜底一次（fallbackFired 防止重复）
        if (!fallbackFired && err && err.name === 'NotSupportedError') {
          fallbackFired = true;
          speakBySpeech(word);
        }
      });
      speakWord._audio = audio;
      console.log('[speak] 有道发音 →', word);
    } else {
      // 离线：直接用 Web Speech
      speakBySpeech(word);
    }
  } catch (e) {
    console.error('[speak] 异常:', e);
  }
}

/**
 * Web Speech API 兜底发音（离线可用）
 * Chrome 在 macOS 上可能静默，作为次选
 */
function speakBySpeech(word) {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    console.log('[speak] Web Speech 兜底 →', word);
  } catch (e) { /* 静默失败 */ }
}

/** 翻面显示中文，同时将当前词标记为"已学"（防中途退出导致反复出现在未学池） */
function flipCard() {
  if (!session) return;
  session.flipped = true;
  const w = session.words[session.idx];
  if (session.cat === 'phrase') {
    // 短语模式：用短语存储
    const pk = phraseKey(w.phrase);
    if (!STORE.pStudied[pk]) { STORE.pStudied[pk] = 1; persist(); }
  } else {
    // 单词/查词本模式
    const realCat = w._cat || session.cat;
    const k = wordKey(realCat, w.word);
    if (!STORE.studied[k]) { STORE.studied[k] = 1; persist(); }
  }
  route();
}

/** 给当前词打标签并进入下一个 */
function markLabel(label) {
  if (!session) return;
  const w = session.words[session.idx];
  if (session.cat === 'phrase') {
    // 短语模式：用短语存储
    const pk = phraseKey(w.phrase);
    STORE.pLabels[pk] = label;
    STORE.pStudied[pk] = (STORE.pStudied[pk] || 0) + 1;
    STORE.pTotals = (STORE.pTotals || 0) + 1;
  } else {
    // 单词/查词本模式
    const realCat = w._cat || session.cat;
    const k = wordKey(realCat, w.word);
    STORE.labels[k] = label;
    STORE.studied[k] = (STORE.studied[k] || 0) + 1;
    STORE.totals[realCat] = (STORE.totals[realCat] || 0) + 1;
  }
  session.labels[label] = (session.labels[label] || 0) + 1;
  advance();
}

/** 跳过当前词（不打标签）*/
function skipCard() { if (session) advance(); }

/** 推进到下一张卡，若用完则完成打卡并跳结果页 */
function advance() {
  session.idx++;
  session.flipped = false;
  if (session.idx >= session.words.length) {
    // 全部背完：累计实际用时、停止计时
    timer.totalElapsed += (timer.totalMs - timer.remainMs);
    timerStop();
    if (session.cat === 'phrase') {
      STORE.pSessions = (STORE.pSessions || 0) + 1;
    } else {
      STORE.sessions[session.cat] = (STORE.sessions[session.cat] || 0) + 1;
    }
    checkin();
    persist();
    checkAutoBackup();
    location.hash = '#/result/' + session.cat;
  } else {
    persist();
    route();
  }
}

// ===== 事件委托 =====
document.getElementById('app').addEventListener('click', onAction);

/** 统一点击处理 */
function onAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const cat = el.dataset.cat;
  switch (a) {
    case 'go-home': location.hash = '#/'; break;
    case 'go-cat':  location.hash = '#/cat/' + cat; break;
    case 'go-stats':location.hash = '#/stats'; break;
    case 'go-devplan': location.hash = '#/dev-plan'; break;
    case 'go-changelog': location.hash = '#/changelog'; break;
    case 'go-review':location.hash = '#/review/' + cat; break;
    case 'go-lookup':location.hash = '#/lookup'; break;
    case 'go-phrase':location.hash = '#/phrase'; break;
    case 'go-profile':location.hash = '#/profile'; break;
    case 'refresh-app': refreshApp(); break;
    case 'search':  doSearch(); break;
    case 'lookup-study': {
      const n = parseInt(el.dataset.n || '20', 10);
      const words = pickFromLookups(n);
      if (words.length === 0) { alert('查词本为空，先去首页搜几个单词吧'); return; }
      startSession('lookup', words);
      location.hash = `#/study/lookup/${n}`;
      break;
    }
    case 'lookup-label': {
      // 查询结果里直接打标签：存到真实分类
      const c = el.dataset.cat;
      const w = el.dataset.word;
      const lb = el.dataset.label;
      if (!c || !w || !lb) return;
      STORE.labels[wordKey(c, w)] = lb;
      persist();
      doSearch(); // 刷新结果卡片的标签显示
      break;
    }
    case 'phrase-study': {
      const n = parseInt(el.dataset.n || '20', 10);
      const words = pickPhrases(n);
      if (words.length === 0) { alert('短语本为空或已全部过关'); return; }
      startSession('phrase', words);
      location.hash = `#/study/phrase/${n}`;
      break;
    }
    case 'study': {
      const n = parseInt(el.dataset.n || '20', 10);
      startSession(cat, pickWords(cat, n));
      location.hash = `#/study/${cat}/${n}`;
      break;
    }
    case 'review-num':
      reviewSel.n = parseInt(el.dataset.n, 10);
      document.querySelectorAll('.review-n').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      break;
    case 'review-start': {
      const labels = [...document.querySelectorAll('.checks input:checked')].map(i => i.value);
      if (labels.length === 0) { alert('请至少勾选一个标签'); return; }
      const words = pickByLabels(cat, labels, reviewSel.n);
      if (words.length === 0) { alert('该标签下暂无单词'); return; }
      startSession(cat, words);
      location.hash = `#/study/${cat}/${reviewSel.n}`;
      break;
    }
    case 'review-graduate': {
      // 从过关词（标"过关"）里抽 20 个复习；复习时打其他标签会自动回炉训练池
      const words = pickByLabels(cat, ['graduate'], 20);
      if (words.length === 0) { alert('暂无过关词，先背几轮标"过关"吧'); return; }
      startSession(cat, words);
      location.hash = `#/study/${cat}/20`;
      break;
    }
    case 'reset-graduate': {
      // 一键清空该分类所有"过关"标签，过关词全部放回训练池（学习记录保留）
      const cnt = Object.keys(STORE.labels).filter(k => k.startsWith(cat + ':') && STORE.labels[k] === 'graduate').length;
      if (cnt === 0) { alert('暂无过关词可重置'); return; }
      if (!confirm(`确定把 ${cnt} 个过关词全部放回训练池吗？（只清空"过关"标签，学习记录保留）`)) return;
      Object.keys(STORE.labels).forEach(k => {
        if (k.startsWith(cat + ':') && STORE.labels[k] === 'graduate') delete STORE.labels[k];
      });
      persist();
      route();
      break;
    }
    case 'flip':  flipCard(); break;
    case 'label': markLabel(el.dataset.label); break;
    case 'skip':  skipCard(); break;
    case 'speak': speakWord(el.dataset.word); break;
    case 'timer-pause': timerTogglePause(); break;
    case 'manual-export': manualExport(); break;
    case 'setup-autobackup': setupAutoBackup(); break;
        case 'profile-create': {
      const name = prompt('新用户名称：', '用户' + (getProfiles().length + 1));
      if (name && name.trim()) {
        const id = createProfile(name.trim());
        setActiveProfile(id);
        route();
      }
      break;
    }
    case 'profile-switch': {
      const id = el.dataset.id;
      const ps = getProfiles();
      const p = ps.find(x => x.id === id);
      if (!p || p.id === getActiveProfileId()) break;
      if (confirm(`切换到「${p.name}」？当前用户「${getActiveProfileName()}」的修改会自动保存。`)) {
        persist();
        setActiveProfile(id);
        route();
      }
      break;
    }
    case 'profile-rename': {
      const id = el.dataset.id;
      const ps = getProfiles();
      const p = ps.find(x => x.id === id);
      if (!p) break;
      const nn = prompt('新名称：', p.name);
      if (nn && nn.trim()) { renameProfile(id, nn.trim()); route(); }
      break;
    }
    case 'profile-delete': {
      const id = el.dataset.id;
      const ps = getProfiles();
      if (ps.length <= 1) { alert('至少要保留一个用户'); break; }
      const p = ps.find(x => x.id === id);
      if (!p) break;
      if (!confirm(`确定要删除用户「${p.name}」吗？\n该用户的所有学习记录将永久丢失！`)) break;
      deleteProfile(id);
      reloadStore();
      route();
      break;
    }
    case 'backup-now': (async () => { const h = await getHandle(); if (h) { await doAutoBackup(h); route(); } })(); break;
    case 'import-backup': document.getElementById('import-file').click(); break;
  }
}

// 备份文件导入：监听 file input change
document.getElementById('import-file')?.addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) importBackup(f);
  e.target.value = '';
});

// 搜索框回车触发搜索
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = document.getElementById('search-input');
    if (input && document.activeElement === input) {
      e.preventDefault();
      doSearch();
    }
  }
});

/**
 * 执行搜索：读取输入框 → 跨分类匹配 → 记录查词 → 渲染结果卡片
 * 结果卡片可直接打标签（同步到原分类）
 */
function doSearch() {
  const input = document.getElementById('search-input');
  const box = document.getElementById('search-result');
  if (!input || !box) return;
  const q = input.value.trim();
  if (!q) { box.innerHTML = ''; return; }

  const results = searchWord(q);
  if (results.length === 0) {
    box.innerHTML = `<div class="search-empty">❌ 词库未收录「${q}」（初中/高中/四级/六级/专业均无此词）</div>`;
    return;
  }

  // 每个匹配结果 count+1，收入查词本
  results.forEach(r => recordLookup(r.cat, r.word));

  // 渲染结果卡片（可直接打标签）
  box.innerHTML = results.map(r => {
    const catName = CATS[r.cat] ? CATS[r.cat].name : r.cat;
    const catColor = CATS[r.cat] ? CATS[r.cat].color : '#999';
    const lb = labelOf(r.cat, r.word);
    const lbText = lb
      ? `<span class="tag" style="background:${LABELS[lb].color}">${LABELS[lb].name}</span>`
      : '<span class="tag" style="background:#bbb">未标记</span>';
    const cnt = lookupCount(r.cat, r.word);
    const ph = r.phonetic ? `<small class="lookup-ph">/${r.phonetic}/</small>` : '';
    const labelBtns = LABEL_ORDER.map(l =>
      `<button class="label-btn" style="--c:${LABELS[l].color}" data-action="lookup-label" data-cat="${r.cat}" data-word="${r.word}" data-label="${l}">${LABELS[l].name}</button>`
    ).join('');
    return `
      <div class="search-card">
        <div class="search-head">
          <b>${r.word}</b> ${ph}
          <button class="speak-btn" data-action="speak" data-word="${r.word}" title="朗读">🔊</button>
          <span class="lookup-cat" style="color:${catColor}">📚 ${catName}</span>
          ${lbText}
          <small class="lookup-cnt">已查 ${cnt} 次</small>
        </div>
        <div class="search-meaning">${r.meaning || '—'}</div>
        ${r.example ? `<div class="example">${r.example}</div>` : ''}
        <div class="search-label-row">${labelBtns}</div>
      </div>`;
  }).join('');
}

// ===== 备份与恢复 =====
const BACKUP_DB = 'wordapp';                       // IndexedDB 库名
const BACKUP_STORE = 'handles';                    // 存 fileHandle 的 store
const AUTO_BACKUP_INTERVAL = 1 * 24 * 60 * 60 * 1000; // 1 天触发一次自动备份（保留最近 7 份）

/** 打开 IndexedDB（用于持久化 fileHandle，File System Access API 要求） */
function openBackupDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(BACKUP_STORE)) db.createObjectStore(BACKUP_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 把授权后的 fileHandle 存入 IndexedDB（页面刷新后仍能恢复） */
async function saveHandle(handle) {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    tx.objectStore(BACKUP_STORE).put(handle, 'autobackup');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 取出之前授权的 fileHandle（若存在） */
async function getHandle() {
  const db = await openBackupDB();
  return new Promise(resolve => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const req = tx.objectStore(BACKUP_STORE).get('autobackup');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

/** 收集当前全部学习数据，用于导出/备份 */
function collectData() {
  return {
    version: 1,
    exportTime: new Date().toISOString(),
    labels: STORE.labels,
    studied: STORE.studied,
    sessions: STORE.sessions,
    totals: STORE.totals,
    checkin: STORE.checkin,
    autoBackup: STORE.autoBackup,
    cursor: STORE.cursor,
    lookups: STORE.lookups,
    pLabels: STORE.pLabels,
    pStudied: STORE.pStudied,
    pSessions: STORE.pSessions,
    pTotals: STORE.pTotals,
    pCursor: STORE.pCursor
  };
}

/** 日期戳 YYYYMMDD，用于生成文件名 */
function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 手动导出：触发浏览器下载，文件名带 manual 标识与日期 */
function manualExport() {
  const blob = new Blob([JSON.stringify(collectData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wordapp-manual-${dateStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 首次设置自动备份：让用户选一个备份目录并授权（Chrome 的 File System Access API 目录模式） */
async function setupAutoBackup() {
  if (!window.showDirectoryPicker) {
    alert('当前浏览器不支持目录自动备份，请用 Chrome 浏览器，或使用"手动导出"。');
    return;
  }
  try {
    // 弹目录选择框，用户导航到"背单词备份"目录并选中授权
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await saveHandle(dirHandle);
    STORE.autoBackup.handleReady = true;
    await doAutoBackup(dirHandle);
    alert(`自动备份已设置到目录："${dirHandle.name}"\n将每天自动备份一次，保留最近 7 份。`);
    persist();
    route();
  } catch (e) {
    if (e.name !== 'AbortError') console.error('设置自动备份失败:', e);
  }
}

/** 执行自动备份：在已授权目录里新建带时间戳的备份文件，并滚动删除最旧的（保留最近 7 份） */
async function doAutoBackup(dirHandle) {
  if (!dirHandle) return;
  try {
    // 校验目录读写权限（页面刷新后 Chrome 可能要求重新确认）
    const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') return;
    }
    // 先更新 autoBackup.count/lastAuto（在 collectData 之前），确保备份文件内的数据自洽（count 含本次、lastAuto=本次）
    STORE.autoBackup.lastAuto = new Date().toISOString();
    STORE.autoBackup.count = (STORE.autoBackup.count || 0) + 1;
    // 生成带时分时间戳的文件名，避免同一天多次备份重名
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    const fileName = `wordapp-autobackup-${stamp}.json`;
    // 在目录里创建新文件并写入
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(collectData(), null, 2));
    await writable.close();
    // 滚动删除：收集所有备份文件名，按时间戳排序，保留最近 7 份，删最旧的
    const backups = [];
    for await (const [name] of dirHandle.entries()) {
      if (name.startsWith('wordapp-autobackup-') && name.endsWith('.json')) backups.push(name);
    }
    backups.sort();
    while (backups.length > 7) {
      const oldest = backups.shift();
      try { await dirHandle.removeEntry(oldest); } catch (e) { console.warn('删除旧备份失败:', oldest, e); }
    }
    persist();
  } catch (e) {
    console.error('自动备份写入失败:', e);
  }
}

/** 启动时检查：距上次自动备份超过 1 天则触发一次 */
async function checkAutoBackup() {
  const handle = await getHandle();
  if (!handle) return;
  STORE.autoBackup.handleReady = true;
  const last = STORE.autoBackup.lastAuto ? new Date(STORE.autoBackup.lastAuto) : null;
  const now = new Date();
  if (!last || (now - last) >= AUTO_BACKUP_INTERVAL) {
    await doAutoBackup(handle);
  }
}

/** 导入备份文件：覆盖当前所有学习记录 */
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.labels || !data.studied) throw new Error('文件格式不对');
      if (!confirm('导入将覆盖当前所有学习记录，确定吗？')) return;
      STORE.labels = data.labels;
      STORE.studied = data.studied;
      STORE.sessions = data.sessions || STORE.sessions;
      STORE.totals = data.totals || STORE.totals;
      STORE.checkin = data.checkin || STORE.checkin;
      if (data.autoBackup) STORE.autoBackup = data.autoBackup;
      if (data.cursor) STORE.cursor = data.cursor;
      if (data.lookups) STORE.lookups = data.lookups;
      if (data.pLabels) STORE.pLabels = data.pLabels;
      if (data.pStudied) STORE.pStudied = data.pStudied;
      if (data.pSessions !== undefined) STORE.pSessions = data.pSessions;
      if (data.pTotals !== undefined) STORE.pTotals = data.pTotals;
      if (data.pCursor !== undefined) STORE.pCursor = data.pCursor;
      persist();
      alert('导入成功，学习记录已恢复。');
      route();
    } catch (e) {
      alert('文件格式错误：' + e.message);
    }
  };
  reader.readAsText(file);
}

// ===== 启动 =====
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', timerOnVisibility);
route();
checkAutoBackup(); // 启动时检查是否到了自动备份周期


// ===== 用户档案管理页面 =====
function renderProfile() {
  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  const items = profiles.map(p => {
    const isActive = p.id === activeId;
    const date = new Date(p.createdAt);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return `
      <div class="profile-item ${isActive ? 'active' : ''}">
        <div class="profile-item-main">
          <span class="profile-item-name">${escapeHtml(p.name)}</span>
          ${isActive ? '<span class="profile-badge">当前</span>' : ''}
          <small class="profile-item-date">创建于 ${dateStr}</small>
        </div>
        <div class="profile-item-actions">
          ${!isActive ? `<button class="btn-sm primary" data-action="profile-switch" data-id="${p.id}">切换</button>` : ''}
          <button class="btn-sm" data-action="profile-rename" data-id="${p.id}">改名</button>
          ${profiles.length > 1 ? `<button class="btn-sm danger" data-action="profile-delete" data-id="${p.id}">删除</button>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
    <header class="topbar">
      <button class="back-btn" data-action="go-home">← 返回</button>
      <div class="brand">用户管理</div>
    </header>
    <main class="page">
      <div class="profile-intro">
        <p>每个用户的学习记录（标签、打卡、查词本…）独立保存，互不干扰。</p>
      </div>
      <div class="profile-list">${items}</div>
      <button class="btn-primary" data-action="profile-create">+ 新建用户</button>
    </main>`;
}

// ===== 刷新整个 app（清缓存 + unregister SW + cache-busting 重载）=====
async function refreshApp() {
  const btn = document.getElementById('refresh-app-btn');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = '⏳';
  btn.disabled = true;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('vocab-pwa-')).map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    const url = new URL(location.href);
    url.searchParams.set('_t', String(Date.now()));
    location.replace(url);
  } catch (e) {
    alert('刷新失败: ' + e.message);
    btn.textContent = original;
    btn.disabled = false;
  }
}


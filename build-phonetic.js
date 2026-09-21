// build-phonetic.js
// 用 ECDICT 词库（ecdict.csv）给 data.js 里 phonetic 为空的词补全音标
// 匹配规则：精确匹配 → 小写匹配 → 去词形变化（复数/过去式等）匹配
// 用法：node build-phonetic.js
// 输入：data.js（当前词条）+ 单词资料/ecdict.csv（音标源）
// 输出：原地覆盖 data.js（只改 phonetic 字段，不动其他字段）

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data.js');
const ECDICT_PATH = path.join(ROOT, '单词资料', 'ecdict.csv');

// ====== 1. 解析 ECDICT，建 word → phonetic 映射 ======
console.log('1. 加载 ECDICT 词库 ...');
const text = fs.readFileSync(ECDICT_PATH, 'utf8');
const lines = text.split('\n');
console.log('   总行数:', lines.length);

// CSV 表头：word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio
// 简单按行解析（ECDICT 字段里基本不含逗号内嵌的特殊情况，translation 可能含逗号但只用前两列）
const phMap = new Map();       // 原词 → 音标
const phMapLower = new Map();  // 小写 → 音标（兜底用）

let lineIdx = 0;
for (const line of lines) {
  lineIdx++;
  if (lineIdx === 1) continue; // 跳过表头
  if (!line) continue;
  // 找第一个逗号（word 结束）和第二个逗号（phonetic 结束）
  const firstComma = line.indexOf(',');
  if (firstComma < 0) continue;
  const word = line.slice(0, firstComma);
  // 找第二个逗号
  const secondComma = line.indexOf(',', firstComma + 1);
  let phonetic = '';
  if (secondComma > 0) {
    phonetic = line.slice(firstComma + 1, secondComma).trim();
  }
  if (word && phonetic) {
    phMap.set(word, phonetic);
    if (!phMapLower.has(word.toLowerCase())) {
      phMapLower.set(word.toLowerCase(), phonetic);
    }
  }
}
console.log('   建立映射：原词', phMap.size, '条 / 小写', phMapLower.size, '条');

// ====== 2. 加载 data.js 当前结构 ======
console.log('2. 加载 data.js ...');
const dataCode = fs.readFileSync(DATA_PATH, 'utf8');
// data.js 用 window.WORDS = {...} 形式，用沙箱求值
const sandbox = { window: {} };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(dataCode, sandbox);
const WORDS = sandbox.window.WORDS;
console.log('   5 分类词数:', Object.keys(WORDS).map(k => k + '=' + WORDS[k].length).join(' / '));

// ====== 3. 给 phonetic 为空的词补全 ======
console.log('3. 匹配补全音标 ...');
const stats = {};
for (const cat of Object.keys(WORDS)) {
  let filled = 0, kept = 0, missing = 0;
  for (const w of WORDS[cat]) {
    if (w.phonetic) { kept++; continue; } // 已有音标保留
    // 精确匹配
    if (phMap.has(w.word)) {
      w.phonetic = phMap.get(w.word);
      filled++;
      continue;
    }
    // 小写匹配
    const lw = w.word.toLowerCase();
    if (phMapLower.has(lw)) {
      w.phonetic = phMapLower.get(lw);
      filled++;
      continue;
    }
    // 去词形变化：尝试常见后缀还原（复数 -s / 过去式 -ed / 进行 -ing 等）
    // 简单做法：去掉末尾 s/es/ed/ing 再匹配
    const stems = [
      lw.replace(/ies$/, 'y'),
      lw.replace(/es$/, ''),
      lw.replace(/s$/, ''),
      lw.replace(/ied$/, 'y'),
      lw.replace(/ed$/, ''),
      lw.replace(/ing$/, ''),
      lw.replace(/ing$/, 'e'),
    ];
    let found = false;
    for (const stem of stems) {
      if (stem !== lw && phMapLower.has(stem)) {
        w.phonetic = phMapLower.get(stem);
        filled++;
        found = true;
        break;
      }
    }
    if (!found) missing++;
  }
  stats[cat] = { filled, kept, missing, total: WORDS[cat].length };
}

console.log('   匹配结果：');
for (const cat of Object.keys(stats)) {
  const s = stats[cat];
  const pct = ((s.filled + s.kept) / s.total * 100).toFixed(1);
  console.log(`   ${cat}: 总 ${s.total} / 已有 ${s.kept} / 补充 ${s.filled} / 缺失 ${s.missing} → 有音标 ${pct}%`);
}

// ====== 4. 写回 data.js ======
console.log('4. 写回 data.js ...');
const header = `// 背单词数据（由 build-data.js + build-phonetic.js 自动生成，请勿手动编辑）
// 分类：junior 初中 / senior 高中 / cet4 四级 / cet6 六级 / major 专业
// 四级已与初高中/专业去重；六级已与初高中/专业/四级去重
// 音标：CET4/CET6 自带 + ECDICT 匹配补全；例句暂留空
window.WORDS = ${JSON.stringify(WORDS)};

if (typeof module !== 'undefined') module.exports = WORDS;
`;
fs.writeFileSync(DATA_PATH, header, 'utf8');
console.log('   完成，data.js 已更新');

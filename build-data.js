/**
 * build-data.js
 * 解析单词资料，生成 data.js 数据文件（五分类：初中/高中/四级/六级/专业）
 * 音标 phonetic：CET4/CET6 自带，初中/高中/专业暂留空，后续补充
 * 例句 example 暂留空，后续补充
 * 去重：四级排除初高中/专业；六级排除初高中/专业/四级
 * 运行：node build-data.js
 */
const fs = require('fs');
const path = require('path');

const JUNIOR_SENIOR_FILE = path.join('/Users/zoujiean/Downloads', '必掌握单词清单_初中高中.md');
const MAJOR_FILE = path.join('/Users/zoujiean/Downloads', '领域技术词_补充牌组.md');
const CET4_FILE = path.join('/Users/zoujiean/Downloads', 'CET4_edited.txt');
const CET6_FILE = path.join('/Users/zoujiean/Downloads', 'CET6_edited.txt');
const OUT_FILE = path.join(__dirname, 'data.js');

/**
 * 清洗单词列：去掉 markdown 加粗符号 ** 和首尾空白
 */
function cleanWord(raw) {
  return raw.replace(/\*\*/g, '').trim();
}

/**
 * 规范化单词作为去重 key：小写、去词性标注、去非字母字符
 * 例： "A" -> "a", "work(s)" -> "work"
 */
function wordKey(word) {
  return word.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z'-]/g, '').trim().replace(/-+$/,'');
}

/**
 * 判断某行是否为表格数据行（以 | 开头，且第2列是数字序号）
 */
function isDataRow(line) {
  if (!line.startsWith('|')) return false;
  const parts = line.split('|');
  if (parts.length < 4) return false;
  const idx = (parts[1] || '').trim();
  return /^\d+$/.test(idx);
}

/**
 * 解析单行 md 表格，返回 { word, meaning, phonetic, example, hit }
 */
function parseRow(line) {
  const parts = line.split('|');
  const word = cleanWord(parts[2] || '');
  let meaning = (parts[3] || '').trim();
  const hitInfo = (parts[4] || '').trim();
  if (!word || !meaning) return null;
  const hit = hitInfo.includes('未命中') ? false : hitInfo.includes('命中');
  return { word, meaning, phonetic: '', example: '', hit };
}

/**
 * 从必掌握清单解析指定分类段（## T1/T2/T3）
 */
function parseSection(filePath, sectionTitle, stopTitles) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const result = [];
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (line.includes(sectionTitle)) { inSection = true; continue; }
      if (inSection && stopTitles && stopTitles.some(t => line.includes(t))) break;
      if (inSection) break;
      continue;
    }
    if (!inSection) continue;
    if (isDataRow(line)) {
      const row = parseRow(line);
      if (row) result.push(row);
    }
  }
  return result;
}

/**
 * 解析专业词文件（整张表都是专业词，5 列格式）
 */
function parseMajorFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    if (!isDataRow(line)) continue;
    const parts = line.split('|');
    const word = cleanWord(parts[2] || '');
    const meaning = (parts[3] || '').trim();
    if (!word || !meaning) continue;
    result.push({ word, meaning, phonetic: '', example: '', hit: true });
  }
  return result;
}

/**
 * 解析 CET4 词表 txt
 * 格式例： "a art.一(个)；每一(个)" 或 "abandon [əˈbændən] vt.丢弃；放弃"
 * 提取：单词、音标（若有）、词性+释义
 */
function parseCET4(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const result = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // 跳过标题行、字母分隔行（如单独的 "A" "B"）
    if (/^大学/.test(line) || /^共\s*\d+/.test(line) || /^[A-Z]$/i.test(line)) continue;
    // 匹配：单词 [音标] 词性释义  或  单词 词性释义
    const m1 = line.match(/^([a-zA-Z][\w'-]*)\s+\[([^\]]+)\]\s+(.+)$/);
    const m2 = line.match(/^([a-zA-Z][\w'-]*)\s+(.+)$/);
    let word, phonetic, meaning;
    if (m1) { word = m1[1]; phonetic = m1[2]; meaning = m1[3]; }
    else if (m2) { word = m2[1]; phonetic = ''; meaning = m2[2]; }
    else continue;
    result.push({ word, meaning, phonetic, example: '', hit: true });
  }
  return result;
}

/**
 * 解析 CET6 词表 txt
 * 格式例： "abandon [əˈbændən] v. 1. 抛弃，放弃 2. 离弃..."
 * 释义含多义编号，整体保留；音标提取
 */
function parseCET6(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const result = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // 六级文件每行都是词条，格式统一带音标
    const m = line.match(/^([a-zA-Z][\w'-]*)\s+\[([^\]]+)\]\s+(.+)$/);
    if (!m) continue;
    result.push({ word: m[1], phonetic: m[2], meaning: m[3], example: '', hit: true });
  }
  return result;
}

/**
 * 主流程：解析五类词，去重后输出 data.js
 * 去重策略（完全去重，分层）：
 *   - 四级：排除初中/高中/专业已有词
 *   - 六级：排除初中/高中/专业/四级已有词
 */
function main() {
  const junior = parseSection(JUNIOR_SENIOR_FILE, 'T1 初中', ['T2 高中']);
  const senior = parseSection(JUNIOR_SENIOR_FILE, 'T2 高中', ['T3 专业']);
  const major = parseMajorFile(MAJOR_FILE);

  // 第一层去重 key：初中+高中+专业
  const baseKeys = new Set();
  [...junior, ...senior, ...major].forEach(w => {
    const k = wordKey(w.word);
    if (k) baseKeys.add(k);
  });

  // 四级：排除已在初高中/专业的词
  const cet4Raw = parseCET4(CET4_FILE);
  const cet4Keys = new Set();
  const cet4 = [];
  let c4DupBase = 0, c4DupSelf = 0;
  for (const w of cet4Raw) {
    const k = wordKey(w.word);
    if (!k) continue;
    if (baseKeys.has(k)) { c4DupBase++; continue; }
    if (cet4Keys.has(k)) { c4DupSelf++; continue; }
    cet4Keys.add(k);
    cet4.push(w);
  }

  // 六级：排除已在初高中/专业/四级的词
  const cet6Raw = parseCET6(CET6_FILE);
  const allKeys = new Set([...baseKeys, ...cet4Keys]);
  const cet6 = [];
  let c6DupBase = 0, c6DupSelf = 0;
  for (const w of cet6Raw) {
    const k = wordKey(w.word);
    if (!k) continue;
    if (allKeys.has(k)) { c6DupBase++; continue; }
    if (cet6.some(x => wordKey(x.word) === k)) { c6DupSelf++; continue; }
    cet6.push(w);
  }

  const data = { junior, senior, cet4, cet6, major };

  const header = `// 背单词数据（由 build-data.js 自动生成，请勿手动编辑）
// 分类：junior 初中 / senior 高中 / cet4 四级 / cet6 六级 / major 专业
// 四级已与初高中/专业去重；六级已与初高中/专业/四级去重
// 音标：CET4/CET6 自带，其余暂留空待补；例句暂留空
window.WORDS = `;
  const body = JSON.stringify(data, null, 0);
  fs.writeFileSync(OUT_FILE, header + body + ';\n', 'utf8');

  console.log('生成完成 ->', OUT_FILE);
  console.log('初中:', junior.length, '高中:', senior.length,
    '四级净增:', cet4.length, '(排除已在初高中/专业:', c4DupBase, '四级内部重复:', c4DupSelf, ')');
  console.log('六级净增:', cet6.length, '(排除已在前面分类:', c6DupBase, '六级内部重复:', c6DupSelf, ')');
  console.log('专业:', major.length);
}

main();

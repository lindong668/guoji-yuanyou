/* blkscan.mjs —— 块注释提前闭合扫描（防止注释里的星号斜杠加数字把注释提前关掉）*/
import fs from 'fs';
let bad = 0, blocks = 0;
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, 'utf8');
  let i = 0; const n = s.length;
  const lineOf = idx => s.slice(0, idx).split('\n').length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const stl = lineOf(i); i += 2; let closed = -1;
      while (i < n) { if (s[i] === '*' && s[i + 1] === '/') { closed = i; i += 2; break; } i++; }
      blocks++;
      if (closed === -1) { console.log(`✗ ${f}:${stl} 块注释未闭合`); bad++; continue; }
      let j = closed + 2, tail = '';
      while (j < n && s[j] !== '\n') { tail += s[j]; j++; }
      if (/[\u4e00-\u9fa5]/.test(tail)) {
        console.log(`✗ ${f}:${lineOf(closed)} 提前闭合：${JSON.stringify(tail.slice(0, 40))}`); bad++;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === q) { i++; break; }
        if (s[i] === '\n' && q !== '`') break;
        i++;
      }
    }
    i++;
  }
}
console.log(bad === 0 ? `✓ 扫描 ${blocks} 个块注释，无提前闭合` : `✗ ${bad} 处`);
process.exit(bad ? 1 : 0);

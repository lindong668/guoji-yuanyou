import { build } from '/usr/local/lib/node_modules/esbuild/lib/main.js';
const r = await build({
  entryPoints: ['src/index.js'], bundle: true, write: false,
  format: 'esm', target: 'es2022', logLevel: 'warning', platform: 'browser',
});
const out = r.outputFiles && r.outputFiles[0] ? r.outputFiles[0].text : '';
console.log('✓ 构建通过，产物 ' + Math.round(out.length/1024) + ' KB');

#!/usr/bin/env node
/* Concatenates src/*.js into a single self-contained index.html */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src');
const files = fs.readdirSync(dir).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
let out = '';
for (const f of files) {
  out += fs.readFileSync(path.join(dir, f), 'utf8');
  out += '\n';
}
const tpl = fs.readFileSync(path.join(dir, 'index.template.html'), 'utf8');
const html = tpl.replace('/*__GAME__*/', () => out);
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('built index.html  (' + files.length + ' modules, ' + (html.length / 1024).toFixed(1) + ' KB)');

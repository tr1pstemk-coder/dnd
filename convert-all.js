const fs = require('fs');
const path = require('path');

const SOURCE = '../pf2e-source/packs';
const OUTPUT = './src/data/pf2e';

// Только нужные нам файлы
const FILES = [
  'ancestries',
  'classes', 
  'backgrounds',
  'weapons',
  'armor',
  'spells',
  'feats',
  'equipment',
  'heritages',
  'class-features',
  'ancestryfeatures',
];

fs.mkdirSync(OUTPUT, { recursive: true });

for (const name of FILES) {
  const inputPath = path.join(SOURCE, `${name}.db`);
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Пропущен: ${name}.db (не найден)`);
    continue;
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const data = lines.map(l => JSON.parse(l));
  const outPath = path.join(OUTPUT, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ ${name}: ${data.length} записей → ${outPath}`);
}
const sharp = require('./node_modules/sharp');

async function removeBg(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const ch = 4;

  const isNearWhite = (idx) => {
    const r = data[idx * ch], g = data[idx * ch + 1], b = data[idx * ch + 2];
    return r > 220 && g > 220 && b > 220;
  };

  // Prolaz 1: flood fill od svih ivica (uklanja spoljnu pozadinu)
  const visited = new Uint8Array(width * height);
  const queue = [];
  const seed = (idx) => {
    if (idx >= 0 && idx < width * height && !visited[idx] && isNearWhite(idx)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { seed(y * width); seed(y * width + width - 1); }

  let i = 0;
  while (i < queue.length) {
    const idx = queue[i++];
    data[idx * ch + 3] = 0;
    const x = idx % width, y = Math.floor(idx / width);
    // 8-connectivity — dijagonale omogućavaju prolaz kroz uske pukotine
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) seed(ny * width + nx);
      }
    }
  }

  // Prolaz 2: globalno ukloni sve preostale bele piksele (zatvorena ostrva između nogu i sl.)
  for (let idx = 0; idx < width * height; idx++) {
    if (data[idx * ch + 3] > 0 && isNearWhite(idx)) {
      data[idx * ch + 3] = 0;
    }
  }

  await sharp(Buffer.from(data), { raw: { width, height, channels: ch } })
    .png()
    .toFile(outputPath);
  console.log('✓', outputPath.split('/').pop());
}

const base = 'c:/Users/Lenovo/eko-grupa-pancevo/assets/images/';
const files = [
  ['БУБАШВАБА БЕЛА.png', 'bubashvaba.png'],
  ['БУВА БЕЛА.png',      'buva.png'],
  ['ГОЛУБ БЕЛА.png',     'golub.png'],
  ['МИШ БЕЛА.png',       'mis.png'],
  ['МРАВ БЕЛА.png',      'mrav.png'],
  ['ОСА БЕЛА.png',       'osa.png'],
  ['СТЕНИЦА БЕЛА.png',   'stenica.png'],
  ['СТРШЉЕН БЕЛА.png',   'strsljen.png'],
];

Promise.all(files.map(([src, dst]) => removeBg(base + src, base + dst)))
  .then(() => console.log('\nSve gotovo!'))
  .catch(console.error);

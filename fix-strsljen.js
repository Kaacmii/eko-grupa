const sharp = require('./node_modules/sharp');

const base = 'c:/Users/Lenovo/eko-grupa-pancevo/assets/images/';
const input  = base + 'СТРШЉЕН БЕЛА.png';
const output = base + 'strsljen.png';

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

  // Prolaz 1: flood fill od ivica
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
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) seed(ny * width + nx);
      }
    }
  }

  // Prolaz 2: globalno ukloni sve svetle piksele — prag 180 (strožije za krila)
  for (let idx = 0; idx < width * height; idx++) {
    if (data[idx * ch + 3] > 0) {
      const r = data[idx * ch], g = data[idx * ch + 1], b = data[idx * ch + 2];
      if (r > 180 && g > 180 && b > 180) {
        data[idx * ch + 3] = 0;
      }
    }
  }

  await sharp(Buffer.from(data), { raw: { width, height, channels: ch } })
    .png()
    .toFile(outputPath);
  console.log('✓ strsljen.png');
}

removeBg(input, output).catch(console.error);

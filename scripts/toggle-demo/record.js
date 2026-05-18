const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const PNG = require('pngjs').PNG;

(async () => {
  const demoPath = path.resolve(__dirname, 'index.html');
  const url = 'file://' + demoPath;

  const outPath = path.resolve(__dirname, 'toggle.gif');
  const width = 220;
  const height = 120;

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  console.log('Opening demo page...');
  await page.goto(url);
  await page.waitForTimeout(300);

  // Ensure toggle is in initial state
  await page.evaluate(() => {
    const t = document.getElementById('toggle');
    if (t.classList.contains('checked')) t.classList.remove('checked');
  });

  const encoder = new GIFEncoder(width, height);
  const stream = encoder.createWriteStream({ repeat: 0, delay: 40, quality: 10 });
  stream.pipe(fs.createWriteStream(outPath));
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(40);
  encoder.setQuality(10);

  const totalFrames = 40;
  const clickAt = 8; // frame to click to trigger animation

  for (let i = 0; i < totalFrames; i++) {
    if (i === clickAt) {
      console.log('Triggering click on toggle...');
      await page.click('#toggle');
    }
    // wait a bit for animation
    await page.waitForTimeout(30);
    const pngBuffer = await page.screenshot({ type: 'png' });
    const png = PNG.sync.read(pngBuffer);
    // png.data is RGBA buffer
    encoder.addFrame(png.data);
  }

  encoder.finish();
  await browser.close();
  console.log('GIF saved to', outPath);
})();

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';
import { testPhoneTouch } from './phone-touch.js';

const session = `portfolio-test-${process.pid}`;
function browser(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('agent-browser', ['--session', session, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output.trim()) : reject(Error(`${args.join(' ')}: ${output || `agent-browser exited ${code}`}`)));
    child.stdin.end(input);
  });
}

const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
try {
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const [width, height] of [[1440, 900], [844, 320], [701, 600], [700, 600], [390, 844], [568, 320], [320, 568], [320, 320], [375, 667], [402, 690], [320, 601], [360, 720], [360, 721], [390, 760], [390, 761], [390, 520], [390, 521], [320, 650], [320, 651], [390, 700]]) {
    await browser(['set', 'viewport', String(width), String(height)]);
    for (const path of ['/', '/en/']) {
      await browser(['open', url + path]);
      console.log(path, await browser(['eval', '--stdin'], await readFile('tests/layout.browser.js', 'utf8')));
      if (width === 390 && [700, 844].includes(height)) {
        await browser(['open', url + path]);
        console.log(await testPhoneTouch(browser));
      }
      if (width === 390 && height === 844) {
        await browser(['open', url + path + '#progetti']);
        for (const [rotatedWidth, rotatedHeight] of [[844, 390], [390, 844]]) {
          await browser(['set', 'viewport', String(rotatedWidth), String(rotatedHeight)]);
          console.log(await browser(['eval', `(() => {
            if (document.querySelector('[data-active]')?.id !== 'progetti' || location.hash !== '#progetti') throw Error('Rotation must preserve the open section and its URL');
            if (matchMedia('(max-width: 700px)').matches && !document.querySelector('[data-phone]').hasAttribute('data-reading')) throw Error('Portrait mode must keep the section open');
            return 'PASS: rotation preserves the open section';
          })()`]));
        }
      }
      if (width === 1440 || (width === 390 && height > 600)) {
        await browser(['open', url + path]);
        console.log(await browser(['eval', '--stdin'], await readFile(`tests/${width === 1440 ? 'desktop' : 'phone'}.browser.js`, 'utf8')));
        console.log(await browser(['eval', '--stdin'], await readFile('tests/theme.browser.js', 'utf8')));
        await browser(['set', 'media', 'dark', 'reduced-motion']);
        console.log(await browser(['eval', '--stdin'], await readFile('tests/theme.browser.js', 'utf8')));
        await browser(['set', 'media', 'light']);
        for (const theme of ['light', 'dark']) {
          await browser(['eval', `document.documentElement.dataset.theme = '${theme}'`]);
          await browser(['eval', 'Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})))']);
          console.log(await browser(['eval', '--stdin'], await readFile('tests/palette.browser.js', 'utf8')));
        }
      }
    }
  }
} finally {
  await browser(['close']).catch((error) => console.error(error.message));
  await new Promise((resolve) => server.httpServer.close(resolve));
}

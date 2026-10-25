import assert from 'node:assert/strict';

export async function testPhoneTouch(browser) {
  const url = await browser(['get', 'url']);
  const socket = new WebSocket(await browser(['get', 'cdp-url']));
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(Error(message.error.message));
    else request.resolve(message.result);
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  try {
    const { targetInfos } = await send('Target.getTargets');
    const { sessionId } = await send('Target.attachToTarget', {
      targetId: targetInfos.find((target) => target.type === 'page' && target.url === url).targetId,
      flatten: true,
    });
    const cdp = (method, params) => send(method, params, sessionId);
    async function evaluate(expression) {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception.description);
      return result.result.value;
    }
    const selected = () => evaluate("[...document.querySelectorAll('.desktop-icons [data-open]')].findIndex(icon => icon.hasAttribute('data-phone-selected'))");
    async function tap(selector, dx = 0, dy = 0) {
      const { x, y } = await evaluate(`(() => {
        const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`);
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + dx, y: y + dy }] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await evaluate("document.querySelector('.desktop-icons [data-open]').focus()");
    for (const [direction, dx, dy, expected] of [
      ['right', 0, 18, 1], ['left', 0, -18, 0],
      ['down', 18, 0, 1], ['up', -18, 0, 0],
    ]) {
      await tap(`[data-phone-direction="${direction}"]`, dx, dy);
      assert.equal(await selected(), expected, `${direction}: an off-center touch must select the expected app`);
    }
    for (const [direction, step] of [['right', 1], ['left', -1], ['down', 1], ['up', -1]]) {
      for (let press = 1; press <= 15; press++) {
        await tap(`[data-phone-direction="${direction}"]`);
        assert.equal(await selected(), (press * step + 15) % 5, `${direction}: touch ${press} must advance exactly one app and wrap`);
      }
    }
    for (let index = 0; index < 5; index++) {
      const id = await evaluate(`document.querySelectorAll('.desktop-icons [data-open]')[${index}].dataset.open`);
      await tap('.phone-dpad [data-phone-confirm]', 18);
      assert.equal(await evaluate('location.hash'), `#${id}`, 'The center key must open exactly the selected app');
      await tap('.phone-softkey');
      assert.equal(await selected(), index, 'Menu must preserve the selected app');
      await tap('[data-phone-direction="right"]');
    }
    assert.equal(await selected(), 0, 'Each touch must trigger exactly one step');
    return 'PASS: touch sequences right/down 1→2→3→4→5→1, left/up 1→5→4→3→2→1, and center-key activation';
  } finally {
    socket.close();
  }
}

// Run in each theme at desktop and phone widths with agent-browser eval --stdin.
(() => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  const phone = matchMedia('(max-width: 700px)').matches;
  const theme = document.documentElement.dataset.theme;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const color = (role) => {
    probe.style.color = `var(--${role})`;
    return getComputedStyle(probe).color;
  };
  const check = (selector, property, role) => {
    const element = document.querySelector(selector);
    assert(element && getComputedStyle(element)[property] === color(role), `${theme}/${phone ? 'phone' : 'desktop'}: ${selector} ${property} differs from --${role}`);
  };
  const luminance = (value) => {
    const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => v / 255);
    return rgb.reduce((sum, v, index) => sum + [0.2126, 0.7152, 0.0722][index] * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4), 0);
  };
  try {
    const iconColours = ['icon-metal', 'icon-screen', 'icon-accent', 'icon-folder', 'icon-folder-back'].map(color);
    for (const background of ['desktop', 'chrome', 'surface', 'title', 'accent']) {
      assert(!iconColours.includes(color(background)), `${theme}: icon colours blend into --${background}`);
    }
    const folderBack = getComputedStyle(document.querySelector('#icon-folder path:nth-child(2)')).fill;
    assert(folderBack === color('icon-folder-back') && folderBack !== color('icon-paper'), 'Folder back must be golden, not paper-coloured');
    const rear = document.querySelector('#icon-folder path').getBBox();
    const front = document.querySelector('#icon-folder polygon');
    assert(front && front.points.numberOfItems === 4, 'Folder front must be a four-vertex parallelogram');
    const [a, b, c, d] = [0, 1, 2, 3].map(index => front.points.getItem(index));
    assert(a.y === b.y && c.y === d.y && b.x - a.x === c.x - d.x && a.x - d.x === b.x - c.x, 'Folder front sides must be parallel');
    assert(b.x - a.x === rear.width, 'Folder front and rear must have equal widths');
    assert(d.x === rear.x && d.y === rear.y + rear.height, 'Folder lower-left vertices must coincide');
    check('body', 'backgroundColor', 'desktop');
    check('#benvenuto .window-content', 'backgroundColor', 'surface');
    check('.welcome-art', 'backgroundColor', 'title');
    check('.primary', 'backgroundColor', 'accent');
    if (phone) {
      check('.phone-shell', 'backgroundColor', 'chrome');
      check('.phone-status', 'backgroundColor', 'chrome');
      check('.phone-softkeys', 'backgroundColor', 'chrome');
      check('.phone-screen .desktop', 'backgroundColor', 'surface');
      check('.phone-number-keys button', 'backgroundColor', 'chrome');
      check('.phone-dpad [data-phone-confirm]', 'backgroundColor', 'accent');
      check('.desktop-icon[data-phone-selected]', 'backgroundColor', 'selection');
      document.querySelector('.desktop-icons [data-open="benvenuto"]').click();
      check('#benvenuto .titlebar', 'backgroundColor', 'title');
      document.querySelector('.phone-softkeys [data-phone-confirm]').click();
    } else {
      check('.window', 'backgroundColor', 'chrome');
      check('.taskbar', 'backgroundColor', 'chrome');
      check('#benvenuto .titlebar', 'backgroundColor', 'title');
    }
    let minimum = Infinity;
    for (const [foreground, background] of [['ink', 'surface'], ['ink', 'chrome'], ['muted', 'surface'], ['muted', 'chrome'], ['title-ink', 'title'], ['title-ink', 'inactive-title'], ['title-ink', 'selection'], ['link', 'surface'], ['accent-ink', 'accent'], ['desktop-ink', 'desktop']]) {
      const [a, b] = [luminance(color(foreground)), luminance(color(background))].sort((a, b) => a - b);
      const ratio = (b + 0.05) / (a + 0.05);
      assert(ratio >= 4.5, `${theme}: --${foreground} on --${background} has insufficient contrast (${ratio.toFixed(2)})`);
      minimum = Math.min(minimum, ratio);
    }
    const [low, high] = [luminance(color('wallpaper')), luminance(color('desktop'))].sort((a, b) => a - b);
    assert((high + 0.05) / (low + 0.05) >= 3, `${theme}: large wallpaper text has insufficient contrast`);
    if (theme === 'light') {
      for (const role of ['desktop', 'chrome', 'surface', 'title', 'selection']) {
        const [r, g, b] = color(role).match(/\d+/g).slice(0, 3).map(Number);
        assert(!(b > r + 12 && b > g + 8), `Light theme unexpectedly retains blue in --${role}`);
      }
    }
    return `PASS: ${theme}/${phone ? 'phone' : 'desktop'} shared colours and text contrast (minimum ${minimum.toFixed(2)}:1)`;
  } finally {
    probe.remove();
  }
})();

// Run on a fresh page at each supported viewport.
(async () => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    assert(rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight + 1 && rect.right <= innerWidth + 1, 'Control leaves viewport');
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    assert(hit && element.contains(hit), 'Control is clipped or covered');
  };
  const settle = () => new Promise(requestAnimationFrame);
  const desktop = document.querySelector('.desktop');
  visible(document.querySelector('[data-theme-select]'));
  if (matchMedia('(max-width: 700px)').matches) {
    if (innerHeight > 650) {
      for (const key of document.querySelectorAll('.phone-number-keys button')) visible(key);
    }
    for (const arrow of document.querySelectorAll('[data-phone-direction]')) {
      assert(arrow.querySelector('svg[aria-hidden="true"]'), 'Directional arrows must not depend on emoji fonts');
    }
    if (innerHeight > 520) {
      for (const button of document.querySelectorAll('.phone-dpad button')) {
        visible(button);
        const rect = button.getBoundingClientRect();
        assert(rect.width >= 44 && rect.height >= 44, 'D-pad touch targets must remain at least 44×44 pixels');
      }
    }
    assert(desktop.clientHeight >= 140, 'Phone display is too short to use');
    assert(desktop.scrollHeight <= desktop.clientHeight + 1, 'Phone app menu must fit without scrolling');
    for (const icon of document.querySelectorAll('.desktop-icons [data-open]')) {
      await settle();
      const rect = icon.getBoundingClientRect();
      const display = desktop.getBoundingClientRect();
      assert(rect.top >= display.top && rect.bottom <= display.bottom + 1, 'Every app must be fully visible without scrolling');
      visible(icon);
      icon.click();
      visible(document.querySelector('[data-theme-select]'));
      const menu = document.querySelector('.phone-softkeys [data-phone-confirm]');
      visible(menu);
      menu.click();
    }
  } else {
    const frame = document.querySelector('#benvenuto');
    assert(frame.getBoundingClientRect().bottom <= desktop.getBoundingClientRect().bottom + 1, 'Window exceeds desktop work area');
    visible(frame.querySelector('[data-resize]'));
    document.querySelector('[data-start]').click();
    const menu = document.querySelector('#start-menu');
    assert(menu.getBoundingClientRect().top >= 0, 'Start menu leaves viewport');
    for (const link of menu.querySelectorAll('[data-open]')) {
      link.focus();
      await settle();
      visible(link);
    }
    document.querySelector('[data-start]').click();
  }
  assert(document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight, 'Page overflows viewport');
  return `PASS: visible controls and layout at ${innerWidth}×${innerHeight}`;
})();

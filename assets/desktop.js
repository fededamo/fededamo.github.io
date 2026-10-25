import { mountPhone } from './phone.js';

const desktop = document.querySelector('.desktop');
const start = document.querySelector('[data-start]');
const menu = document.querySelector('#start-menu');
const mobile = matchMedia('(max-width: 700px)');
const apps = new Map([...desktop.querySelectorAll('[data-window]')].map((element) => [element.id, {
  element,
  task: document.querySelector(`[data-task="${element.id}"]`),
  state: 'closed',
  frame: null,
  maximized: false,
  order: 0,
}]));
let active = null;
let order = 0;
let gesture = null;

function fit(frame) {
  const width = Math.max(Math.min(340, desktop.clientWidth), Math.min(frame.width, desktop.clientWidth));
  const height = Math.max(Math.min(290, desktop.clientHeight), Math.min(frame.height, desktop.clientHeight));
  return {
    width, height,
    x: Math.max(0, Math.min(frame.x, desktop.clientWidth - width)),
    y: Math.max(0, Math.min(frame.y, desktop.clientHeight - height)),
  };
}

function position(app) {
  if (!app.frame) {
    const index = [...apps.values()].indexOf(app);
    const width = Math.min(820, Math.max(340, desktop.clientWidth - 230));
    const height = Math.min(530, desktop.clientHeight - 65);
    app.frame = fit({ width, height, x: (desktop.clientWidth - width) / 2 + 35 + index * 18, y: 55 + index * 22 });
  }
  if (!mobile.matches) app.frame = fit(app.frame);
  const frame = app.maximized
    ? { x: 0, y: 0, width: desktop.clientWidth, height: desktop.clientHeight }
    : app.frame;
  Object.assign(app.element.style, { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px`, zIndex: app.order });
  app.element.toggleAttribute('data-maximized', app.maximized);
}

function sync() {
  desktop.querySelector('.desktop-icons').inert = mobile.matches && active !== null;
  for (const [id, app] of apps) {
    app.element.hidden = app.state !== 'open';
    app.element.toggleAttribute('data-active', active === id);
    // Hidden background windows on mobile must also leave keyboard navigation.
    app.element.inert = app.state !== 'open' || (mobile.matches && active !== id);
    if (app.task) {
      app.task.hidden = app.state === 'closed';
      app.task.setAttribute('aria-pressed', String(active === id));
    }
    position(app);
  }
  phone.sync(active);
}

function activate(id, focus = true) {
  const app = apps.get(id);
  if (!app) return;
  app.state = 'open';
  app.order = ++order;
  active = id;
  sync();
  if (focus) app.element.focus({ preventScroll: true });
}

function dismiss(id, state) {
  const app = apps.get(id);
  app.state = state;
  if (active === id) {
    const next = [...apps.entries()].filter(([, item]) => item.state === 'open').sort((a, b) => b[1].order - a[1].order)[0];
    active = next?.[0] ?? null;
  }
  sync();
  if (active) apps.get(active).element.focus({ preventScroll: true });
  else desktop.querySelector(`[data-open="${id}"]`).focus({ preventScroll: true });
}

function toggleMaximize(id) {
  if (mobile.matches) return;
  const app = apps.get(id);
  app.maximized = !app.maximized;
  position(app);
}

function closeMenu(restoreFocus = false) {
  menu.hidden = true;
  start.setAttribute('aria-expanded', 'false');
  if (restoreFocus) start.focus();
}

function navigate(id) {
  activate(id);
  if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
}

function showDesktopView(focus = true) {
  for (const app of apps.values()) if (app.state === 'open') app.state = 'minimized';
  active = null;
  closeMenu();
  sync();
  if (focus) desktop.querySelector('[data-open]').focus();
}

document.addEventListener('click', (event) => {
  const launcher = event.target.closest('[data-open]');
  if (launcher) {
    event.preventDefault();
    closeMenu();
    navigate(launcher.dataset.open);
    return;
  }
  const task = event.target.closest('[data-task]');
  if (task) {
    closeMenu();
    const id = task.dataset.task;
    if (active === id) dismiss(id, 'minimized');
    else activate(id);
    return;
  }
  const action = event.target.closest('[data-action]');
  if (action) {
    const id = action.closest('[data-window]').id;
    if (action.dataset.action === 'maximize') toggleMaximize(id);
    else dismiss(id, action.dataset.action === 'close' ? 'closed' : 'minimized');
    return;
  }
  if (!event.target.closest('#start-menu, [data-start]')) closeMenu();
});

start.addEventListener('click', () => {
  menu.hidden = !menu.hidden;
  start.setAttribute('aria-expanded', String(!menu.hidden));
  if (!menu.hidden) menu.querySelector('a').focus();
});

desktop.addEventListener('focusin', (event) => {
  const element = event.target.closest('[data-window]');
  if (element && active !== element.id) activate(element.id, false);
});
desktop.addEventListener('pointerdown', (event) => {
  const element = event.target.closest('[data-window]');
  if (!element) return;
  if (active !== element.id) activate(element.id, false);
  const handle = event.target.closest('[data-drag], [data-resize]');
  if (!handle || event.button !== 0 || mobile.matches || apps.get(element.id).maximized) return;
  if (event.target.closest('button') && !handle.hasAttribute('data-resize')) return;
  event.preventDefault();
  handle.focus({ preventScroll: true });
  handle.setPointerCapture(event.pointerId);
  gesture = { id: element.id, handle, pointer: event.pointerId, x: event.clientX, y: event.clientY, frame: { ...apps.get(element.id).frame }, resize: handle.hasAttribute('data-resize') };
});
desktop.addEventListener('pointermove', (event) => {
  if (!gesture || event.pointerId !== gesture.pointer) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  const app = apps.get(gesture.id);
  const frame = gesture.frame;
  app.frame = fit(gesture.resize
    ? { ...frame, width: Math.min(frame.width + dx, desktop.clientWidth - frame.x), height: Math.min(frame.height + dy, desktop.clientHeight - frame.y) }
    : { ...frame, x: frame.x + dx, y: frame.y + dy });
  position(app);
});
function endGesture(event) {
  if (gesture && event.pointerId === gesture.pointer) gesture = null;
}
desktop.addEventListener('pointerup', endGesture);
desktop.addEventListener('pointercancel', endGesture);
desktop.addEventListener('lostpointercapture', endGesture);
desktop.addEventListener('dblclick', (event) => {
  if (event.target.closest('[data-drag]') && !event.target.closest('button')) toggleMaximize(event.target.closest('[data-window]').id);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!menu.hidden) closeMenu(true);
    else if (active && event.target.closest('[data-window]')) dismiss(active, 'closed');
    return;
  }
  if (!menu.hidden && menu.contains(event.target)) {
    const links = [...menu.querySelectorAll('a')];
    const index = links.indexOf(document.activeElement);
    const next = { ArrowDown: (index + 1) % links.length, ArrowUp: (index - 1 + links.length) % links.length, Home: 0, End: links.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); links[next].focus(); }
    return;
  }
  const handle = event.target.closest('[data-drag], [data-resize]');
  if (!handle || event.target.closest('[data-action]') || mobile.matches) return;
  const id = handle.closest('[data-window]').id;
  if (event.key === 'Enter' && handle.hasAttribute('data-drag')) {
    event.preventDefault();
    toggleMaximize(id);
    return;
  }
  const resizing = handle.hasAttribute('data-resize');
  if (!resizing && !event.altKey) return;
  const direction = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
  if (!direction) return;
  event.preventDefault();
  const app = apps.get(id);
  if (app.maximized) return;
  const [dx, dy] = direction;
  const frame = app.frame;
  app.frame = fit(resizing
    ? { ...frame, width: Math.min(frame.width + dx, desktop.clientWidth - frame.x), height: Math.min(frame.height + dy, desktop.clientHeight - frame.y) }
    : { ...frame, x: frame.x + dx, y: frame.y + dy });
  position(app);
});

function followHash(event) {
  const requested = location.hash.slice(1);
  if (!requested && mobile.matches) {
    showDesktopView(false);
    if (event) desktop.querySelector('[data-phone-selected]').focus({ preventScroll: true });
    return;
  }
  const target = document.getElementById(requested);
  const id = target?.closest('[data-window]')?.id ?? 'benvenuto';
  activate(id, Boolean(event));
  if (target && target.id !== id) target.scrollIntoView({ block: 'start' });
}
const phone = mountPhone({
  desktop, mobile,
  open: navigate,
  home: () => {
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    showDesktopView(false);
  },
});
window.addEventListener('popstate', followHash);
window.addEventListener('hashchange', followHash);
window.addEventListener('resize', () => { gesture = null; sync(); });
mobile.addEventListener('change', () => {
  if (mobile.matches) showDesktopView(false);
  else sync();
});

for (const app of apps.values()) app.element.setAttribute('role', 'dialog');
start.hidden = false;
document.documentElement.setAttribute('data-desktop-ready', '');
followHash();
const clock = document.querySelector('[data-clock]');
function tick() {
  const now = new Date();
  clock.dateTime = now.toISOString();
  clock.textContent = new Intl.DateTimeFormat(document.documentElement.lang, { hour: '2-digit', minute: '2-digit' }).format(now);
}
tick();
setInterval(tick, 30000);

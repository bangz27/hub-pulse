'use strict';

const CFG_KEY = 'hubpulse.cfg';
const CACHE_KEY = 'hubpulse.last';
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

let current = null; // last payload shown
let loading = false;

// ---------- helpers ----------
const DASH = '—';
const show = (v) => (v === null || v === undefined || String(v).trim() === '' ? DASH : String(v));
const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const n = parseFloat(String(v).replace(/[,%\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
function setBar(id, pct, cls) {
  const el = $(id);
  const ok = Number.isFinite(pct);
  const w = ok ? Math.max(0, Math.min(100, pct)) : 0;
  el.firstElementChild.style.width = w + '%';
  el.className = 'bar' + (ok && cls ? ' ' + cls : '');
  if (ok) el.setAttribute('aria-valuenow', String(Math.round(w))); else el.removeAttribute('aria-valuenow');
}
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function banner(msg, isErr) {
  const b = $('banner');
  if (!msg) { b.hidden = true; return; }
  b.textContent = msg;
  b.className = 'banner' + (isErr ? ' err' : '');
  b.hidden = false;
}
const fmtTime = (iso) => {
  if (!iso) return DASH;
  const d = new Date(iso);
  return isNaN(d) ? DASH : d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// ---------- render ----------
function render(payload) {
  const d = (payload && payload.data) || {};
  const text = {
    hub: d.hub, reportTime: d.reportTime,
    delivered: d.delivered, inHubHero: d.inHub, completePct: d.completePct,
    inHub: d.inHub, assign: d.assign, noAssign: d.noAssign,
    hcActive: d.hcActive, hc2W: d.hc2W, hc4W: d.hc4W,
    pdtyAssign: d.pdtyAssign, pdtyTarget: d.pdtyTarget,
    wl2W: d.wl2W, wl4W: d.wl4W, pct2WAssign: d.pct2WAssign, pct4WAssign: d.pct4WAssign,
    sla: d.sla, issue: d.issue, action: d.action,
  };
  for (const [id, v] of Object.entries(text)) $(id).textContent = show(v);

  const r2 = toNum(d.ratio2W), r4 = toNum(d.ratio4W);
  $('ratio').textContent = Number.isFinite(r2) && Number.isFinite(r4) ? `${r2}:${r4}` : DASH;

  setBar('completeBar', toNum(d.completePct), 'good');
  const pa = toNum(d.pdtyAssign), pt = toNum(d.pdtyTarget);
  const pdtyPct = Number.isFinite(pa) && pt > 0 ? (pa / pt) * 100 : NaN;
  setBar('pdtyBar', pdtyPct, pdtyPct >= 100 ? 'good' : 'warn');

  $('noAssignCard').classList.toggle('alert', toNum(d.noAssign) > 0);
  $('fetchedAt').textContent = fmtTime(payload && payload.fetchedAt);
  $('btnCopy').disabled = !d.message;
}

// ---------- data ----------
async function refresh({ quiet } = {}) {
  const cfg = store.get(CFG_KEY);
  if (!cfg || !cfg.url || !cfg.key) {
    banner('ยังไม่ได้ตั้งค่าแหล่งข้อมูล กดปุ่มฟันเฟืองมุมขวาบนเพื่อใส่ Web App URL และ Key');
    return;
  }
  if (loading) return;
  loading = true;
  $('btnRefresh').classList.add('spin');
  try {
    const payload = await fetchPayload(cfg);
    current = payload;
    store.set(CACHE_KEY, payload);
    render(payload);
    if (payload.missing && payload.missing.length) {
      banner('ไม่พบค่าในชีต: ' + payload.missing.join(', ') + ' (แสดงเป็น —)');
    } else {
      banner('');
    }
    if (!quiet) toast('อัปเดตแล้ว');
  } catch (err) {
    const when = current ? fmtTime(current.fetchedAt) : null;
    const offline = !navigator.onLine;
    banner(
      (offline ? 'ออฟไลน์อยู่' : 'ดึงข้อมูลไม่สำเร็จ: ' + err.message) +
      (when ? ` · กำลังแสดงข้อมูลเมื่อ ${when}` : ''),
      true
    );
  } finally {
    loading = false;
    $('btnRefresh').classList.remove('spin');
  }
}

async function fetchPayload(cfg) {
  const u = new URL(cfg.url);
  u.searchParams.set('key', cfg.key);
  u.searchParams.set('_', Date.now().toString());
  const res = await fetch(u.toString(), { cache: 'no-store', redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  let payload;
  try { payload = await res.json(); } catch { throw new Error('ไม่ได้รับ JSON (ตรวจสิทธิ์ Web App ว่าเป็น Anyone)'); }
  if (!payload.ok) throw new Error(payload.error === 'unauthorized' ? 'Key ไม่ถูกต้อง' : (payload.error || 'ข้อมูลผิดรูปแบบ'));
  return payload;
}

// ---------- copy ----------
async function copyReport() {
  const msg = current && current.data && current.data.message;
  if (!msg) return;
  try {
    await navigator.clipboard.writeText(msg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) { toast('คัดลอกไม่สำเร็จ'); return; }
  }
  toast('คัดลอกแล้ว วางใน SeaTalk ได้เลย');
}

// ---------- settings ----------
function openSettings() {
  const cfg = store.get(CFG_KEY) || {};
  $('inUrl').value = cfg.url || '';
  $('inKey').value = cfg.key || '';
  $('settingsMsg').textContent = '';
  $('settingsMsg').className = 'small';
  $('settings').showModal();
}
async function saveSettings(ev) {
  ev.preventDefault();
  const cfg = { url: $('inUrl').value.trim(), key: $('inKey').value.trim() };
  const msg = $('settingsMsg');
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(cfg.url)) {
    msg.textContent = 'URL ต้องเป็น Web App ของ Apps Script (https://script.google.com/…/exec)';
    msg.className = 'small err';
    return;
  }
  msg.textContent = 'กำลังทดสอบ…';
  msg.className = 'small';
  $('btnSave').disabled = true;
  try {
    const payload = await fetchPayload(cfg);
    store.set(CFG_KEY, cfg);
    current = payload;
    store.set(CACHE_KEY, payload);
    render(payload);
    banner('');
    $('settings').close();
    toast('เชื่อมต่อสำเร็จ');
  } catch (err) {
    msg.textContent = 'ทดสอบไม่ผ่าน: ' + err.message;
    msg.className = 'small err';
  } finally {
    $('btnSave').disabled = false;
  }
}

// ---------- boot ----------
$('btnRefresh').addEventListener('click', () => refresh());
$('btnSettings').addEventListener('click', openSettings);
$('btnCancel').addEventListener('click', () => $('settings').close());
$('settingsForm').addEventListener('submit', saveSettings);
$('btnCopy').addEventListener('click', copyReport);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && current && Date.now() - new Date(current.fetchedAt) > 60_000) refresh({ quiet: true });
});
window.addEventListener('online', () => refresh({ quiet: true }));
setInterval(() => { if (document.visibilityState === 'visible') refresh({ quiet: true }); }, AUTO_REFRESH_MS);

current = store.get(CACHE_KEY);
render(current);
refresh({ quiet: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

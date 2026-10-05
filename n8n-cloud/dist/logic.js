// Generated from the goFactori repo (n8n-cloud/src). Shop settings: CONFIG right below.
// ===== SHOP SETTINGS: edit here, then run `node n8n-cloud/build.js` =====
// Same numbers as quote-service/config/shop.yaml. One copy of this file per client shop.
// ownerWhatsapp: the owner's personal WhatsApp (receives drafts, approves with 1).
// twilioAccountSid: from the Twilio console (not secret; the auth token lives in the n8n credential).
const CONFIG = {
  ownerWhatsapp: 'whatsapp:+1787XXXXXXX',
  businessWhatsapp: 'whatsapp:+14155238886',
  twilioAccountSid: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  pdfBaseUrl: 'https://diegobatista-ai.app.n8n.cloud/webhook/wa-quote-pdf',
  shop: {
    name: 'Precision Machining PR', legal_name: 'Precision Machining PR, LLC',
    address: 'Carr. 2 Km 45.3, Bo. Ingenio, Toa Baja, PR 00949',
    phone: '+1 (787) 555-0142', email: 'quotes@precisionmachiningpr.example',
    timezone: 'America/Puerto_Rico', quote_prefix: 'Q', quote_valid_days: 30,
    same_day_cutoff_hour: 15, same_day_ready_by: '5:00 PM', next_day_ready_by: '12:00 PM',
    payment_terms: '50% deposit to start production, balance due on delivery. ATH Movil, check or ACH.',
  },
  pricing: {
    margin: 0.25, quantity_breaks: [10, 50, 200], max_tiers: 4, minimum_order: 150, ivu_rate: 0.115,
    stock_allowance_in: 0.125, scrap_factor: 0.10, programming_hours: 1.0,
    minutes_per_feature: 1.5, handling_minutes_per_part: 2.0,
    tolerance_bands: [
      { max_in: 0.0005, label: 'ultra-precision', multiplier: 2.0 },
      { max_in: 0.001, label: 'precision', multiplier: 1.6 },
      { max_in: 0.003, label: 'tight', multiplier: 1.25 },
      { max_in: 1.0, label: 'standard', multiplier: 1.0 },
    ],
    processes: {
      mill_3axis: { label: 'CNC Milling (3-axis)', rate: 75, setup_hours: 1.0 },
      mill_5axis: { label: 'CNC Milling (5-axis)', rate: 95, setup_hours: 1.5 },
      turning: { label: 'CNC Turning', rate: 65, setup_hours: 0.75 },
    },
    // density lb/in^3, $/lb of stock, removal rate in^3/min
    materials: {
      aluminum_6061: { label: 'Aluminum 6061-T6', density: 0.0975, price_per_lb: 4.50, removal_rate: 2.5 },
      aluminum_7075: { label: 'Aluminum 7075-T6', density: 0.1010, price_per_lb: 7.50, removal_rate: 2.0 },
      steel_1018: { label: 'Steel 1018 CRS', density: 0.2840, price_per_lb: 1.80, removal_rate: 0.8 },
      steel_4140: { label: 'Steel 4140 HT', density: 0.2840, price_per_lb: 2.60, removal_rate: 0.5 },
      stainless_304: { label: 'Stainless 304', density: 0.2890, price_per_lb: 4.80, removal_rate: 0.4 },
      stainless_316: { label: 'Stainless 316', density: 0.2890, price_per_lb: 5.50, removal_rate: 0.35 },
      brass_360: { label: 'Brass C360', density: 0.3070, price_per_lb: 6.50, removal_rate: 2.5 },
      delrin: { label: 'Acetal (Delrin)', density: 0.0510, price_per_lb: 9.00, removal_rate: 4.0 },
    },
    // per_part adds to unit cost; lot_charge is the vendor minimum per order
    finishes: {
      none: { label: 'As machined', per_part: 0, lot_charge: 0, extra_days: 0 },
      anodize_clear: { label: 'Clear anodize, Type II', per_part: 2.50, lot_charge: 150, extra_days: 3 },
      anodize_black: { label: 'Black anodize, Type II', per_part: 3.00, lot_charge: 150, extra_days: 3 },
      hard_anodize: { label: 'Hard anodize, Type III', per_part: 5.00, lot_charge: 200, extra_days: 4 },
      black_oxide: { label: 'Black oxide', per_part: 1.50, lot_charge: 95, extra_days: 2 },
      zinc_plate: { label: 'Zinc plate, clear', per_part: 1.75, lot_charge: 120, extra_days: 3 },
      passivate: { label: 'Passivate per ASTM A967', per_part: 1.25, lot_charge: 85, extra_days: 2 },
      powder_coat: { label: 'Powder coat', per_part: 6.00, lot_charge: 150, extra_days: 4 },
    },
    lead_time: { base_days: 5, days_per_100_parts: 2 },
  },
};

// Helvetica / Helvetica-Bold glyph widths (WinAnsi 32..255), from the standard AFM metrics.
const HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 350, 556, 350, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350, 350, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 350, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500];
const HELV_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 350, 556, 350, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350, 350, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 350, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556];

// ===== Quote agent logic (port of quote-service/app/*.py) =====
// Pure functions: no network, no n8n globals. Each n8n Code node calls one entry point at the bottom.

const ACTIVE = ['needs_drawing', 'needs_quantity', 'processing', 'pending_approval', 'manual_review', 'sent'];
const INTAKE = ['needs_drawing', 'needs_quantity'];
const DRAWING_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPT_WORDS = ['acepto', 'aceptado', 'aceptamos', 'aprobado', 'apruebo', 'aprobamos', 'confirmo',
  'dale', 'accept', 'accepted', 'approved'];
const HOUR = 3600e3;

// ---------- small helpers ----------
const money = (x) => '$' + Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const norm = (t) => String(t || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const phone = (q) => String(q.customer_phone || '').replace('whatsapp:', '');
const firstName = (n) => (n ? String(n).trim().split(/\s+/)[0] : '');
const greeting = (n) => (firstName(n) ? `¡Hola ${firstName(n)}!` : '¡Hola!');
const parseJson = (s, dflt) => { try { return s ? (typeof s === 'string' ? JSON.parse(s) : s) : dflt; } catch (e) { return dflt; } };
const token = () => Array.from({ length: 22 }, () => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 56)]).join('');

function classify(contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (DRAWING_TYPES.includes(ct)) return 'drawing';
  if (ct.includes('step') || ct.includes('octet-stream') || ct.includes('iges') || ct.includes('dxf')) return 'cad';
  return 'other';
}

function parseQuantity(text) {
  const m = String(text || '').match(/\b(\d{1,3}(?:,\d{3})+|\d+)\b/);
  if (!m) return null;
  const q = parseInt(m[1].replace(/,/g, ''), 10);
  return q > 0 && q <= 1e6 ? q : null;
}

function isAcceptance(text) {
  const t = norm(text);
  const words = t.match(/[a-z]+/g) || [];
  return words.some((w) => ACCEPT_WORDS.includes(w)) || t.includes('de acuerdo');
}

// '1' approve, '0' discard, any other amount = new total; optional quote number on either side.
function parseOwnerCommand(text) {
  let t = norm(text).replace(/\$/g, '');
  let ref = null;
  const m = t.match(/q-?\d+/);
  if (m) {
    ref = m[0].toUpperCase();
    if (!ref.includes('-')) ref = 'Q-' + ref.slice(1);
    t = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim();
  }
  if (['si', 'ok', 'aprobar', 'aprobado', 'approve'].includes(t)) return { action: 'approve', value: null, ref };
  if (!/^(\d{1,3}(,\d{3})*(\.\d{1,2})?|\d+(\.\d{1,2})?)$/.test(t)) return null;
  const value = parseFloat(t.replace(/,/g, ''));
  if (value === 1) return { action: 'approve', value: null, ref };
  if (value === 0) return { action: 'discard', value: null, ref };
  return { action: 'price', value, ref };
}

// ---------- pricing ----------
function quantityTiers(requested, p) {
  const breaks = p.quantity_breaks.filter((q) => q !== requested)
    .sort((a, b) => Math.abs(Math.log(a / requested)) - Math.abs(Math.log(b / requested)));
  return [...new Set([requested, ...breaks.slice(0, (p.max_tiers || 4) - 1)])].sort((a, b) => a - b);
}

function pricePart(spec, qtyOverride) {
  const p = CONFIG.pricing;
  const qty = qtyOverride || spec.quantity;
  if (!qty || qty < 1) throw new Error('quantity is required to price a part');
  const flags = [];
  let material = p.materials[spec.material_key];
  if (!material) { material = p.materials.steel_1018; flags.push(`Material '${spec.material_text}' not in price list; priced as ${material.label}.`); }
  let finish = p.finishes[spec.finish_key];
  if (!finish) { finish = p.finishes.none; flags.push(`Finish '${spec.finish_text}' not in price list; priced as machined.`); }
  const proc = p.processes[spec.process] || p.processes.mill_3axis;
  if (spec.confidence === 'low') flags.push('Low extraction confidence; check dimensions on the drawing.');

  const a = p.stock_allowance_in;
  let dims, vol;
  if (spec.shape === 'cylindrical') {
    const dia = Math.max(spec.width_in, spec.height_in) + a;
    dims = [r3(spec.length_in + 2 * a), r3(dia), r3(dia)];
    vol = Math.PI * (dims[1] / 2) ** 2 * dims[0];
  } else {
    dims = [spec.length_in + a, spec.width_in + a, spec.height_in + a].map(r3);
    vol = dims[0] * dims[1] * dims[2];
  }
  const weight = vol * material.density;
  const materialCost = weight * material.price_per_lb * (1 + p.scrap_factor);
  const removal = Math.min(Math.max(spec.material_removal_fraction || 0.3, 0.05), 0.95);
  const tol = spec.tightest_tolerance_in || 0.005;
  const band = [...p.tolerance_bands].sort((x, y) => x.max_in - y.max_in).find((b) => tol <= b.max_in) || p.tolerance_bands[p.tolerance_bands.length - 1];
  const cycle = ((vol * removal) / material.removal_rate + (spec.feature_count || 0) * p.minutes_per_feature) * band.multiplier
    + p.handling_minutes_per_part;
  const machining = cycle / 60 * proc.rate;
  const setupCost = proc.setup_hours * Math.max(spec.setups || 1, 1) * proc.rate;
  const progCost = p.programming_hours * proc.rate;

  const tiers = quantityTiers(qty, p).map((q) => {
    const fixed = setupCost + progCost + finish.lot_charge;
    let unit = r2(((fixed / q) + materialCost + machining + finish.per_part) * (1 + p.margin));
    let ext = r2(unit * q);
    if (ext < p.minimum_order) { ext = p.minimum_order; unit = r2(ext / q); }
    const days = p.lead_time.base_days + Math.ceil(q / 100) * p.lead_time.days_per_100_parts + finish.extra_days;
    return { quantity: q, unit_price: unit, extended_price: ext, lead_time_days: days };
  });
  return {
    requested_quantity: qty, tiers, flags,
    breakdown: {
      stock_dims_in: dims, stock_weight_lb: r3(weight), material_cost_per_part: r2(materialCost),
      setup_cost: r2(setupCost), programming_cost: r2(progCost), cycle_minutes_per_part: Math.round(cycle * 10) / 10,
      machining_cost_per_part: r2(machining), finish_cost_per_part: finish.per_part, finish_lot_charge: finish.lot_charge,
      tolerance_band: band.label, margin: p.margin,
    },
  };
}

const tierFor = (pricing, q) => pricing.tiers.find((t) => t.quantity === q);
const requestedTier = (pricing) => tierFor(pricing, pricing.requested_quantity);

function applyOwnerTotal(pricing, total) {
  const factor = total / requestedTier(pricing).extended_price;
  const tiers = pricing.tiers.map((t) => (t.quantity === pricing.requested_quantity
    ? { ...t, extended_price: r2(total), unit_price: r2(total / t.quantity) }
    : { ...t, unit_price: r2(t.unit_price * factor), extended_price: r2(r2(t.unit_price * factor) * t.quantity) }));
  return { ...pricing, tiers };
}

// ---------- WhatsApp copy (Spanish) ----------
function localParts(at) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: CONFIG.shop.timezone, hour: 'numeric', hourCycle: 'h23', weekday: 'short' });
  const parts = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return { hour: parseInt(parts.hour, 10), weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday) };
}

function readyBy(at) {
  const s = CONFIG.shop;
  const { hour, weekday } = localParts(at);
  if (weekday >= 1 && weekday <= 5 && hour < s.same_day_cutoff_hour) return `hoy antes de las ${s.same_day_ready_by}`;
  const day = weekday === 5 || weekday === 6 ? 'el lunes' : 'mañana';
  return `${day} antes de las ${s.next_day_ready_by}`;
}

const MSG = {
  ackDrawing: (name, at) => `${greeting(name)} Gracias por contactar a *${CONFIG.shop.name}*. 🛠️\n\n`
    + `Recibimos su plano y ya lo estamos revisando. Tendrá su cotización formal *${readyBy(at)}*.\n\n`
    + 'Si tiene fecha de entrega requerida o algún detalle adicional, puede enviarlo por aquí.',
  askForDrawing: (name) => `${greeting(name)} Gracias por contactar a *${CONFIG.shop.name}*. 🛠️\n\n`
    + 'Para prepararle la cotización, envíenos por aquí:\n1. El *plano en PDF* (o una foto clara del plano)\n'
    + '2. La *cantidad* de piezas\n3. Fecha de entrega requerida (si aplica)',
  stillNeedDrawing: () => 'Recibido. Quedamos pendientes del plano (PDF o foto) para preparar su cotización. 📎',
  stepReceived: (name) => `${greeting(name)} Recibimos su archivo 3D. Nuestro equipo lo revisará personalmente. `
    + 'Si tiene el plano en PDF con tolerancias y material, envíelo para agilizar la cotización.',
  askQuantity: (spec) => `Ya revisamos el plano de *${spec.part_name}*. ¿Cuántas piezas necesita? (por ejemplo: 50)`,
  quantityReceived: (qty, at) => `Perfecto, *${qty} piezas*. Tendrá su cotización ${readyBy(at)}. ✅`,
  gotExtraInfo: () => 'Recibido, lo incluimos en su cotización. 👍',
  forwarded: () => 'Recibido. Le respondemos en breve. 👍',
  quoteReady: (q) => {
    const t = requestedTier(q.pricing);
    return `${greeting(q.customer_name)} Su cotización *${q.number}* está lista. 📄\n\n`
      + `*${q.spec.part_name}* — ${t.quantity} pzas\n${money(t.unit_price)} c/u · Total ${money(t.extended_price)}\n`
      + `Entrega: ${t.lead_time_days} días laborables\n\n`
      + `El PDF incluye precios para otras cantidades. Válida por ${CONFIG.shop.quote_valid_days} días.\n\n`
      + 'Para aprobar, responda *ACEPTO*. ¿Preguntas? Escríbanos por aquí.';
  },
  accepted: (q) => `¡Gracias! Recibimos su aprobación de la cotización *${q.number}*. `
    + 'Le contactaremos en breve para coordinar el depósito y la orden de compra. 🙌',
  followup: (q) => `${greeting(q.customer_name)} ¿Pudo revisar la cotización *${q.number}*? `
    + 'Si desea ajustar cantidades o fechas, con gusto la actualizamos. Para aprobar, responda *ACEPTO*.',
  ownerDraft: (q, pendingCount) => {
    const s = q.spec, p = q.pricing, b = p.breakdown, t = requestedTier(p);
    const mat = (CONFIG.pricing.materials[s.material_key] || {}).label || s.material_text;
    const proc = (CONFIG.pricing.processes[s.process] || {}).label || s.process;
    const tiers = p.tiers.map((x) => `  ${String(x.quantity).padStart(5)} pzas → ${money(x.unit_price)} c/u = ${money(x.extended_price)}`).join('\n');
    const notes = [...(p.flags || []), ...(s.assumptions || [])];
    const ref = pendingCount > 1 ? ` ${q.number}` : '';
    return `📋 *Borrador ${q.number}* — ${q.customer_name || 'Cliente'} (${phone(q)})\n\n`
      + `*${s.part_name}* ${s.part_number || ''}\n${mat} · ${s.length_in} × ${s.width_in} × ${s.height_in} in · ${proc}\n`
      + `Tolerancia: ${b.tolerance_band} · Ciclo: ${b.cycle_minutes_per_part} min/pza\n`
      + `Setup+prog: ${money(b.setup_cost + b.programming_cost)} · Material: ${money(b.material_cost_per_part)}/pza\n\n`
      + `*Pedido: ${t.quantity} pzas = ${money(t.extended_price)}*\n${tiers}`
      + (notes.length ? '\n⚠️ Revisar:\n' + notes.map((n) => `• ${n}`).join('\n') : '')
      + `\n\nResponda *1${ref}* para aprobar y enviar, un *total nuevo* (ej. ${Math.round(t.extended_price / 10) * 10}${ref}) `
      + `para cambiar el precio, o *0${ref}* para descartar.`
      + (pendingCount > 1 ? `\n\n(${pendingCount} cotizaciones pendientes; incluya el número.)` : '');
  },
  ownerSent: (q, adjusted) => `✅ ${q.number} enviada al cliente ${adjusted ? 'con su precio ajustado' : 'aprobada'}: ${money(requestedTier(q.pricing).extended_price)}.`,
  ownerDiscarded: (q) => `🗑️ ${q.number} descartada. El cliente no recibió nada.`,
  ownerManual: (q, reason) => `⚠️ ${q.number} de ${q.customer_name || 'cliente'} (${phone(q)}) necesita revisión manual: ${reason}`,
  ownerAccepted: (q) => {
    const t = requestedTier(q.pricing);
    return `🎉 ${q.customer_name || 'El cliente'} (${phone(q)}) ACEPTÓ ${q.number}: ${t.quantity} pzas, ${money(t.extended_price)}. Coordine depósito y PO.`;
  },
  ownerCustomerMsg: (q, text) => `💬 ${q.customer_name || 'Cliente'} (${phone(q)}) sobre ${q.number}:\n"${text}"`,
  ownerHelp: (pending) => (pending.length
    ? 'Pendientes:\n' + pending.map((q) => `• ${q.number} — ${q.customer_name || q.customer_phone}`).join('\n')
      + '\n\nResponda *1 Q-XXXX* para aprobar, *total Q-XXXX* para cambiar precio, o *0 Q-XXXX* para descartar.'
    : 'No hay cotizaciones pendientes de aprobación.'),
};

// ---------- quote rows (n8n Data Table "wa_quotes"; JSON fields stored as strings) ----------
// All columns are type string (totals and timestamps too) to keep the n8n mapping simple.
const COLUMNS = ['number', 'status', 'customer_phone', 'customer_name', 'messages', 'media_url', 'media_type',
  'spec', 'pricing', 'original_total', 'final_total', 'pdf_token', 'last_customer_msg_at', 'sent_at',
  'followup_sent_at', 'accepted_at'];

function fromRow(r) {
  return { ...r, messages: parseJson(r.messages, []), spec: parseJson(r.spec, null), pricing: parseJson(r.pricing, null) };
}

function toRow(q) {
  const row = {};
  for (const c of COLUMNS) {
    const v = q[c];
    if (['messages', 'spec', 'pricing'].includes(c)) row[c] = v ? JSON.stringify(v) : '';
    else row[c] = v == null ? '' : String(v);  // every column is a string column
  }
  return row;
}

const quoteNo = (q) => parseInt(String(q.number).replace(/\D/g, ''), 10) || 0;

function newQuote(quotes, phoneNo, name) {
  const next = Math.max(1000, ...quotes.map(quoteNo)) + 1;
  return { number: `${CONFIG.shop.quote_prefix}-${next}`, status: 'needs_drawing', customer_phone: phoneNo,
    customer_name: name || '', messages: [], pdf_token: token(), spec: null, pricing: null };
}

const pdfUrl = (q, kind) => `${CONFIG.pdfBaseUrl}?t=${q.pdf_token}&kind=${kind}`;
const reply = (to, body, mediaUrl) => (mediaUrl ? { to, body, media_url: mediaUrl } : { to, body });

// ---------- inbound message → plan ----------
// Returns { quote (to upsert) | null, replies, process }.
function decide(rows, msg, now) {
  const quotes = rows.filter((r) => r && r.number).map(fromRow);
  const at = now || new Date();
  if (msg.from === CONFIG.ownerWhatsapp) return handleOwner(quotes, msg, at);
  return handleCustomer(quotes, msg, at);
}

function latestFor(quotes, phoneNo) {
  return quotes.filter((q) => q.customer_phone === phoneNo && ACTIVE.includes(q.status))
    .sort((a, b) => quoteNo(b) - quoteNo(a))[0] || null;
}

function handleCustomer(quotes, msg, at) {
  const p = msg.from, name = msg.profile_name, text = String(msg.body || '').trim();
  const media = (msg.media || []).map((m) => ({ ...m, kind: classify(m.content_type) }));
  let q = latestFor(quotes, p);
  const touch = (x) => ({ ...x, messages: text ? [...x.messages, { at: at.toISOString(), text }] : x.messages,
    last_customer_msg_at: at.toISOString() });
  const drawing = media.find((m) => m.kind === 'drawing');
  const cad = media.find((m) => m.kind === 'cad');

  if (drawing || cad) {
    if (!q || !INTAKE.includes(q.status)) q = newQuote(quotes, p, name);
    q = touch({ ...q, media_url: (drawing || cad).url, media_type: (drawing || cad).content_type });
    if (drawing) {
      q = { ...q, status: 'processing', spec: null, pricing: null };
      return { quote: q, replies: [reply(p, MSG.ackDrawing(name, at))], process: true };
    }
    q = { ...q, status: 'manual_review' };
    return { quote: q, replies: [reply(p, MSG.stepReceived(name)),
      reply(CONFIG.ownerWhatsapp, MSG.ownerManual(q, 'envió un archivo CAD/STEP sin plano PDF.'))], process: false };
  }
  if (!q) {
    q = touch(newQuote(quotes, p, name));
    return { quote: q, replies: [reply(p, MSG.askForDrawing(name))], process: false };
  }
  q = touch(q);
  if (q.status === 'needs_drawing') return { quote: q, replies: [reply(p, MSG.stillNeedDrawing())], process: false };
  if (q.status === 'needs_quantity') {
    const qty = parseQuantity(text);
    if (!qty) return { quote: q, replies: [reply(p, MSG.askQuantity(q.spec))], process: false };
    q = { ...q, spec: { ...q.spec, quantity: qty }, status: 'processing' };
    return { quote: q, replies: [reply(p, MSG.quantityReceived(qty, at))], process: true };
  }
  if (q.status === 'sent' && isAcceptance(text)) {
    q = { ...q, status: 'accepted', accepted_at: at.toISOString() };
    return { quote: q, replies: [reply(p, MSG.accepted(q)), reply(CONFIG.ownerWhatsapp, MSG.ownerAccepted(q))], process: false };
  }
  const ack = q.status === 'sent' ? MSG.forwarded() : MSG.gotExtraInfo();
  return { quote: q, replies: [reply(p, ack), reply(CONFIG.ownerWhatsapp, MSG.ownerCustomerMsg(q, text))], process: false };
}

function handleOwner(quotes, msg, at) {
  if ((msg.media || []).length) return handleCustomer(quotes, msg, at);
  const text = msg.body || '';
  const pending = quotes.filter((q) => q.status === 'pending_approval').sort((a, b) => quoteNo(a) - quoteNo(b));
  const own = latestFor(quotes, msg.from);
  if (own && ((own.status === 'needs_quantity' && !pending.length) || (own.status === 'sent' && isAcceptance(text)))) {
    return handleCustomer(quotes, msg, at);
  }
  const owner = (body, mediaUrl) => reply(CONFIG.ownerWhatsapp, body, mediaUrl);
  const cmd = parseOwnerCommand(text);
  if (!cmd) return { quote: null, replies: [owner(MSG.ownerHelp(pending))], process: false };
  let q;
  if (cmd.ref) {
    q = quotes.find((x) => x.number.toUpperCase() === cmd.ref);
    if (!q || q.status !== 'pending_approval') {
      return { quote: null, replies: [owner(`${cmd.ref} no está pendiente de aprobación.\n\n${MSG.ownerHelp(pending)}`)], process: false };
    }
  } else if (pending.length) {
    q = pending[0];
  } else {
    return { quote: null, replies: [owner(MSG.ownerHelp(pending))], process: false };
  }
  if (cmd.action === 'discard') {
    q = { ...q, status: 'discarded' };
    return { quote: q, replies: [owner(MSG.ownerDiscarded(q))], process: false };
  }
  const adjusted = cmd.action === 'price';
  if (adjusted) q = { ...q, pricing: applyOwnerTotal(q.pricing, cmd.value) };
  q = { ...q, status: 'sent', sent_at: at.toISOString(), final_total: requestedTier(q.pricing).extended_price };
  return { quote: q, replies: [reply(q.customer_phone, MSG.quoteReady(q), pdfUrl(q, 'quote')), owner(MSG.ownerSent(q, adjusted))], process: false };
}

// ---------- Claude extraction ----------
function extractionPrompt(q) {
  const p = CONFIG.pricing;
  const mats = Object.entries(p.materials).map(([k, v]) => `- ${k}: ${v.label}`).join('\n');
  const fins = Object.entries(p.finishes).map(([k, v]) => `- ${k}: ${v.label}`).join('\n');
  const texts = (q.messages || []).map((m) => m.text).join('\n') || '(no text, only the drawing)';
  return 'You read mechanical engineering drawings for a CNC machine shop in Puerto Rico and extract what the shop '
    + 'needs to estimate a price. Customers write in Spanish, English or a mix.\n\n'
    + 'Report dimensions in inches; convert if the drawing is metric and say so in assumptions. Use the overall '
    + "envelope of the finished part. If the customer's message gives a quantity it overrides the drawing. Never "
    + 'invent a quantity: use null if neither states one. When something is unclear, make the most reasonable '
    + "machinist's assumption and add a short English note to assumptions.\n\n"
    + `Shop materials (material_key, or "other"):\n${mats}\n\nShop finishes (finish_key, "none" if as machined):\n${fins}\n\n`
    + `Customer's WhatsApp message(s):\n${texts}\n\n`
    + 'Reply with ONLY a JSON object, no markdown, with exactly these keys:\n'
    + '{"part_name": str, "part_number": str|null, "revision": str|null, "material_text": str, "material_key": str, '
    + '"process": "mill_3axis"|"mill_5axis"|"turning", "shape": "prismatic"|"cylindrical", "length_in": num, '
    + '"width_in": num (max diameter if cylindrical), "height_in": num (max diameter if cylindrical), '
    + '"feature_count": int (each hole, pocket, slot, thread, keyway, step, groove; 4X = 4), "setups": int, '
    + '"material_removal_fraction": num 0.05-0.95, "tightest_tolerance_in": num|null, "finish_text": str|null, '
    + '"finish_key": str, "quantity": int|null, "due_date_text": str|null, "assumptions": [str], '
    + '"confidence": "low"|"medium"|"high"}';
}

function parseClaudeSpec(raw) {
  // The Anthropic node's output shape varies by version/options: find the string that holds the JSON.
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(raw);
  if (raw && raw.error) throw new Error(String(raw.error.message || raw.error).slice(0, 120));
  const text = strings.find((x) => x.includes('part_name')) || '';
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON in Claude response');
  const s = JSON.parse(text.slice(start, end + 1));
  for (const k of ['length_in', 'width_in', 'height_in']) {
    if (!(Number(s[k]) > 0)) throw new Error(`missing ${k}`);
    s[k] = Number(s[k]);
  }
  s.quantity = s.quantity ? parseInt(s.quantity, 10) : null;
  s.assumptions = Array.isArray(s.assumptions) ? s.assumptions : [];
  return s;
}

// After Claude (or a quantity answer): price it and draft for the owner, or ask for the quantity.
function afterExtraction(rows, q, claudeRaw) {
  const quotes = rows.filter((r) => r && r.number).map(fromRow);
  let spec = q.spec && q.spec.quantity ? q.spec : null;
  if (!spec) {
    try {
      spec = parseClaudeSpec(claudeRaw);
    } catch (e) {
      q = { ...q, status: 'manual_review' };
      return { quote: q, replies: [reply(CONFIG.ownerWhatsapp, MSG.ownerManual(q, `no pude leer el plano (${e.message}).`))] };
    }
  }
  if (!spec.quantity) {
    q = { ...q, spec, status: 'needs_quantity' };
    return { quote: q, replies: [reply(q.customer_phone, MSG.askQuantity(spec))] };
  }
  const pricing = pricePart(spec);
  q = { ...q, spec, pricing, status: 'pending_approval', original_total: requestedTier(pricing).extended_price };
  const pending = quotes.filter((x) => x.status === 'pending_approval' && x.number !== q.number).length + 1;
  return { quote: q, replies: [reply(CONFIG.ownerWhatsapp, MSG.ownerDraft(q, pending), pdfUrl(q, 'draft'))] };
}

// ---------- follow-ups: ~20h after the quote, always inside WhatsApp's 24h window ----------
function dueFollowups(rows, now) {
  const at = now || new Date();
  const out = [];
  for (const q of rows.filter((r) => r && r.status === 'sent' && !r.followup_sent_at).map(fromRow)) {
    const sent = new Date(q.sent_at), lastIn = new Date(q.last_customer_msg_at);
    if (!q.last_customer_msg_at || lastIn > sent) continue;
    const closes = lastIn.getTime() + 24 * HOUR;
    const due = Math.min(sent.getTime() + 20 * HOUR, closes - HOUR);
    if (due < sent.getTime() + 2 * HOUR) { out.push({ quote: { ...q, followup_sent_at: 'skipped:window' }, replies: [] }); continue; }
    if (at.getTime() >= due && at.getTime() < closes) {
      out.push({ quote: { ...q, followup_sent_at: at.toISOString() }, replies: [reply(q.customer_phone, MSG.followup(q))] });
    }
  }
  return out;
}

// ---------- Twilio ----------
function twilioForm(r) {
  const f = { From: CONFIG.businessWhatsapp, To: r.to, Body: String(r.body).slice(0, 1600) };
  if (r.media_url) f.MediaUrl = r.media_url;
  return Object.entries(f).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

function normalizeTwilio(body) {
  const b = body || {};
  const media = [];
  for (let i = 0; i < parseInt(b.NumMedia || '0', 10); i += 1) media.push({ url: b[`MediaUrl${i}`], content_type: b[`MediaContentType${i}`] || '' });
  return { from: b.From, profile_name: b.ProfileName || '', body: b.Body || '', media };
}

// ---------- quote PDF (English), hand-written PDF 1.4, Helvetica ----------
function renderQuotePdf(q, draft) {
  const s = CONFIG.shop, P = CONFIG.pricing, spec = q.spec, pricing = q.pricing;
  const W = 612, H = 792, M = 54;
  const ops = [];
  const ansi = (t) => String(t).replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\n\x20-\xFF]/g, '?');
  const esc = (t) => ansi(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const width = (t, size, bold) => [...ansi(t)].reduce((w, ch) => w + ((bold ? HELV_BOLD : HELV)[ch.charCodeAt(0) - 32] || 556), 0) * size / 1000;
  const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const text = (x, y, t, o = {}) => {
    const size = o.size || 10, bold = !!o.bold;
    const tx = o.align === 'right' ? x - width(t, size, bold) : o.align === 'center' ? x - width(t, size, bold) / 2 : x;
    ops.push(`BT ${rgb(o.color || '#1F2933')} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${tx.toFixed(2)} ${y.toFixed(2)} Td (${esc(t)}) Tj ET`);
  };
  const rect = (x, y, w, h, color) => ops.push(`${rgb(color)} rg ${x} ${y} ${w} ${h} re f`);
  const line = (x1, y1, x2, y2, color = '#CBD2D9', lw = 0.75) => ops.push(`${rgb(color)} RG ${lw} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const ACC = '#0B5394', MUTED = '#616E7C', HI = '#E3EEF9';
  const fmtDate = (d) => d.toLocaleDateString('en-US', { timeZone: s.timezone, month: 'short', day: '2-digit', year: 'numeric' });
  const issued = new Date(q.sent_at || Date.now());
  const valid = new Date(issued.getTime() + s.quote_valid_days * 24 * HOUR);

  if (draft) {
    ops.push('q 0.980 0.870 0.870 rg BT /F2 60 Tf 0.819 0.574 -0.574 0.819 150 260 Tm (DRAFT - NOT SENT) Tj ET Q');
  }
  rect(0, H - 13, W, 13, ACC);
  text(M, H - 60, s.name, { size: 18, bold: true });
  text(M, H - 76, s.address, { size: 9, color: MUTED });
  text(M, H - 88, `${s.phone}  ·  ${s.email}`, { size: 9, color: MUTED });
  text(W - M, H - 60, 'QUOTATION', { size: 22, bold: true, color: ACC, align: 'right' });
  [['Quote #', q.number], ['Date', fmtDate(issued)], ['Valid until', fmtDate(valid)]].forEach(([k, v], i) => {
    text(W - M - 90, H - 78 - i * 13, k, { size: 9.5, color: MUTED, align: 'right' });
    text(W - M, H - 78 - i * 13, v, { size: 9.5, align: 'right' });
  });
  line(M, H - 122, W - M, H - 122);

  let y = H - 145;
  text(M, y, 'PREPARED FOR', { size: 9, bold: true, color: MUTED });
  text(W / 2, y, 'PART', { size: 9, bold: true, color: MUTED });
  text(M, y - 15, q.customer_name || 'Customer', { size: 10 });
  text(M, y - 28, 'WhatsApp ' + phone(q), { size: 10 });
  if (spec.due_date_text) text(M, y - 41, `Requested delivery: ${spec.due_date_text}`, { size: 10 });
  const mat = (P.materials[spec.material_key] || {}).label || spec.material_text;
  const fin = (P.finishes[spec.finish_key] || {}).label || spec.finish_text || 'As machined';
  const proc = (P.processes[spec.process] || {}).label || spec.process;
  [['Description', spec.part_name], ['Part number / Rev', `${spec.part_number || '-'} / ${spec.revision || '-'}`],
    ['Material', mat], ['Finish', fin], ['Process', proc],
    ['Envelope', `${spec.length_in} x ${spec.width_in} x ${spec.height_in} in`]].forEach(([k, v], i) => {
    text(W / 2, y - 15 - i * 13, k, { size: 9.5, color: MUTED });
    text(W / 2 + 100, y - 15 - i * 13, String(v).slice(0, 44), { size: 9.5 });
  });

  y = H - 268;
  text(M, y + 8, 'PRICING  (requested quantity highlighted)', { size: 9, bold: true, color: MUTED });
  rect(M, y - 20, W - 2 * M, 22, ACC);
  const cx = [M + 90, M + 210, M + 340, M + 360];
  [['Quantity', cx[0], 'right'], ['Unit price', cx[1], 'right'], ['Extended', cx[2], 'right'], ['Lead time', cx[3], 'left']]
    .forEach(([t, x, a]) => text(x, y - 13, t, { size: 9.5, bold: true, color: '#FFFFFF', align: a }));
  y -= 20;
  pricing.tiers.forEach((t) => {
    const hi = t.quantity === pricing.requested_quantity;
    if (hi) rect(M, y - 22, W - 2 * M, 22, HI);
    const o = { size: 10, bold: hi };
    text(cx[0], y - 15, t.quantity.toLocaleString('en-US'), { ...o, align: 'right' });
    text(cx[1], y - 15, money(t.unit_price), { ...o, align: 'right' });
    text(cx[2], y - 15, money(t.extended_price), { ...o, align: 'right' });
    text(cx[3], y - 15, `${t.lead_time_days} business days`, o);
    line(M, y - 22, W - M, y - 22);
    y -= 22;
  });

  y -= 30;
  text(M, y, 'TERMS', { size: 9, bold: true, color: MUTED });
  ['Prices in USD, per the drawing received via WhatsApp. Changes to drawing, material or quantity may change the price.',
    `IVU (${Math.round(P.ivu_rate * 1000) / 10}%) not included; applied at invoicing unless a valid exemption certificate is on file.`,
    'Lead time starts on receipt of purchase order and deposit. FOB our facility; local delivery available on request.',
    s.payment_terms,
    'Inspection: first article dimensional check included. Material certifications available on request.',
  ].forEach((t, i) => text(M, y - 14 - i * 12, `${i + 1}. ${t}`, { size: 8.3 }));

  const ay = 115;
  ops.push(`${rgb('#CBD2D9')} RG 0.75 w ${M} ${ay - 25} ${W - 2 * M} 68 re S`);
  text(M + 12, ay + 26, 'To accept: reply ACEPTO on WhatsApp, or sign and return this page.', { size: 10, bold: true, color: ACC });
  line(M + 12, ay - 4, M + 230, ay - 4, '#1F2933', 0.5);
  line(M + 260, ay - 4, W - M - 12, ay - 4, '#1F2933', 0.5);
  text(M + 12, ay - 15, 'Authorized signature / PO number', { size: 9, color: MUTED });
  text(M + 260, ay - 15, 'Date', { size: 9, color: MUTED });
  text(W / 2, 36, `${s.legal_name}  ·  ${q.number}  ·  Thank you for your business.`, { size: 8, color: MUTED, align: 'center' });

  const content = ansi(ops.join('\n'));
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Title (${esc('Quotation ' + q.number)}) /Author (${esc(s.name)}) >>`,
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return typeof Buffer !== 'undefined' ? Buffer.from(pdf, 'latin1').toString('base64') : btoa(pdf);
}

// Outbound replies carry everything the Twilio HTTP node needs.
const outbound = (replies) => (replies || []).map((r) => ({ ...r, account_sid: CONFIG.twilioAccountSid, twilio_form: twilioForm(r) }));

// ---------- entry point ----------
// Sub-workflow "Quote logic": one entry point for everything the main workflow asks.
// Input item: { op: 'decide' | 'price' | 'pdf' | 'followups', ... }.
const req = $input.first().json;
const rowsOf = (rows) => (rows || []).filter((r) => r && r.number);

if (req.op === 'decide') {
  const plan = decide(rowsOf(req.rows), normalizeTwilio(req.body), new Date());
  const q = plan.quote;
  return [{ json: {
    has_quote: !!q,
    row: q ? toRow(q) : {},
    replies: outbound(plan.replies),
    process: !!plan.process,
    needs_extraction: !!plan.process && !(q.spec && q.spec.quantity),
    media_type: q ? q.media_type || '' : '',
    media_url: q ? q.media_url || '' : '',
    claude_prompt: q ? extractionPrompt(q) : '',
  } }];
}

if (req.op === 'price') {
  const res = afterExtraction(rowsOf(req.rows), fromRow(req.plan.row), req.claude);
  return [{ json: { row: toRow(res.quote), replies: outbound(res.replies) } }];
}

if (req.op === 'pdf') {
  const query = req.query || {};
  const row = rowsOf(req.rows).find((r) => r.pdf_token && r.pdf_token === query.t);
  if (!row || !row.pricing) return [{ json: { found: false } }];
  const q = fromRow(row);
  const draft = query.kind === 'draft';
  const fileName = `${q.number}${draft ? '-draft' : ''}.pdf`;
  return [{ json: { found: true, fileName },
    binary: { data: { data: renderQuotePdf(q, draft), mimeType: 'application/pdf', fileName, fileExtension: 'pdf' } } }];
}

if (req.op === 'followups') {
  return dueFollowups(rowsOf(req.rows), new Date()).map((f) => ({ json: {
    row: toRow(f.quote), has_reply: f.replies.length > 0, ...(outbound(f.replies)[0] || {}),
  } }));
}

throw new Error(`unknown op '${req.op}'`);

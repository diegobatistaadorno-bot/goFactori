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

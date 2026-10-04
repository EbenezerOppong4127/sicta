// État applicatif unique, persisté dans localStorage (le Pass reste lisible hors ligne).
import { todayISO } from './util.js';

const KEY = 'sicta:v1';

const defaults = () => ({
  booking: {
    category: 'vl',
    op: 'periodique',
    plate: '',
    model: '',
    vin: '',
    km: '',
    owner: '',
    contact: '',
    docs: {},
    centerId: 'vridi',
    date: null,
    time: null,
    method: 'wave',
    phone: '',
    ref: null,
    paid: false,
  },
  fleet: {
    selected: ['v1', 'v2', 'v3', 'v4'],
    extra: [], // véhicules importés par CSV
    mode: 'groupe', // groupe | etale
    centerId: 'vridi',
    date: null,
    dates: {},
    method: 'account',
    phone: '',
    balance: 450000, // solde du compte conventionné (démo)
    ref: null,
    paid: false,
    sent: {},
    snapshot: null, // planning figé au paiement (sert au Pass & Dispatch)
  },
  reminders: {},
  vehicles: [{ plate: '1580 EF 01' }, { plate: '6021 KB 01' }, { plate: '4589 HJ 01' }], // « Mes véhicules » (espace particulier)
  leads: [], // demandes de convention flotte (page SICTA Pro)
  profile: { name: 'Koffi', phone: '' },
  createdAt: todayISO(),
});

let state;
try {
  state = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  state.booking = { ...defaults().booking, ...state.booking };
  state.fleet = { ...defaults().fleet, ...state.fleet };
} catch {
  state = defaults();
}

const subs = new Set();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : l'app reste utilisable en mémoire */
  }
};

export const store = {
  get: () => state,
  /** Fusionne un patch dans une branche : store.patch('booking', {plate: '…'}) */
  patch(branch, patch) {
    state[branch] = { ...state[branch], ...patch };
    persist();
    subs.forEach((f) => f(state));
  },
  /** Remplace une branche entière (utile pour les tableaux). */
  set(branch, value) {
    state[branch] = value;
    persist();
    subs.forEach((f) => f(state));
  },
  reset(branch) {
    const d = defaults();
    if (branch) state[branch] = d[branch];
    else state = d;
    persist();
    subs.forEach((f) => f(state));
  },
  subscribe(f) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

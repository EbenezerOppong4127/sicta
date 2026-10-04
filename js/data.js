// Données de démonstration. Source unique pour tarifs, centres, flotte et textes.
// Écarts des maquettes harmonisés ici :
//  - barème = celui de la page Tarifs (Image_16) ; le simulateur (Image_14) l'utilise aussi ;
//  - contre-visite = multiplicateur du simulateur (OPS.contre.mult), la FAQ en est déduite.

export const OPS = {
  periodique: { label: 'Visite périodique', mult: 1 },
  contre: { label: 'Contre-visite', mult: 0.4 },
  mutation: { label: 'Mutation carte grise', mult: 1.25 },
};

export const TARIFFS = {
  vl: { label: 'Particulier', sub: 'Berline, SUV, 4x4, break', icon: 'directions_car', presta: 10000, timbre: 2000, months: 12 },
  util: { label: 'Transport & utilitaire', sub: 'Taxi, Wôrô-wôrô, Gbaka, camionnette', icon: 'airport_shuttle', presta: 13000, timbre: 2500, months: 6 },
  pl: { label: 'Poids lourd & autocar', sub: 'Camion, tracteur, car interurbain', icon: 'local_shipping', presta: 20000, timbre: 4000, months: 6 },
  bus: { label: 'Transport en commun', sub: 'Minibus, car de transport', icon: 'airport_shuttle', presta: 18000, timbre: 3000, months: 6, fleetOnly: true },
  moto: { label: 'Moto & tricycle', sub: 'Moto, tricycle de livraison', icon: 'two_wheeler', presta: 5000, timbre: 1500, months: 12 },
};

export const PAYMENTS = {
  orange: { label: 'Orange Money CI', short: 'OM', color: '#FF7900', fg: '#fff', badge: 'Recommandé', desc: 'Validation par prompt USSD #144*82#', field: 'Numéro Orange Money (+225)', ussd: 'Validez avec #144*82# ou la notification Orange Money.' },
  wave: { label: "Wave Côte d'Ivoire", short: 'W', color: '#1DC3EC', fg: '#fff', badge: '0 % frais', desc: 'Paiement direct sans surcoût', field: 'Numéro associé au compte Wave (+225)', ussd: 'Ouvrez Wave et validez avec votre code.' },
  mtn: { label: 'MTN Mobile Money', short: 'MoMo', color: '#FFCC00', fg: '#000', desc: 'Validation via invite push MTN', field: 'Numéro MTN Mobile Money (+225)', ussd: 'Validez la demande MoMo avec votre code PIN.' },
  moov: { label: 'Moov Money Flooz', short: 'Moov', color: '#005B94', fg: '#fff', desc: 'Validation code secret Flooz', field: 'Numéro Moov Flooz (+225)', ussd: 'Validez la demande Moov Money avec votre code secret.' },
  card: { label: 'Carte bancaire Visa / Mastercard', short: 'CB', color: '#0b2545', fg: '#fff', desc: 'Paiement 3D-Secure certifié GIM-UEMOA', field: 'Numéro de contact pour le code OTP 3D-Secure', ussd: 'Saisissez le code OTP 3D-Secure reçu par SMS.' },
  account: { label: 'Compte conventionné', short: 'CC', color: '#0b2545', fg: '#fff', ussd: 'Débit immédiat sur votre compte conventionné entreprise.', b2b: true },
};
export const PUBLIC_PAY = ['orange', 'wave', 'mtn', 'moov', 'card'];

/** Modes de règlement B2B (maquette Facturation groupée). */
export const FLEET_PAY = [
  { k: 'account', label: 'Compte conventionné entreprise', badge: 'Actif', icon: 'account_balance' },
  { k: 'wave', label: "Wave Côte d'Ivoire Pro", badge: '0 % frais', desc: 'Validation par QR / Push Pro', icon: 'contactless', phone: true },
  { k: 'orange', label: 'Orange Money Entreprise', desc: 'Code marchand ou OTP flotte', icon: 'call', phone: true },
  { k: 'mtn', label: 'MTN MoMo Business', desc: 'Portefeuille Corporate MoMo', icon: 'payments', phone: true },
  { k: 'card', label: 'Carte bancaire corporate', desc: 'Visa Corporate & GIM-UEMOA', icon: 'credit_card' },
];
export const FLEET_DISCOUNT = 0.05; // remise « Flotte Grand Compte »
export const TVA = 0.18;

const H = (open, close) => ({ open, close });
export const CENTERS = [
  { id: 'vridi', zone: 'abidjan', city: 'Abidjan', name: 'Vridi Port (Centre pilote)', addr: 'Boulevard de Vridi, Zone Portuaire, face terminal à conteneurs', hours: H('07:30', '17:00'), lanes: '4 VL + 2 PL', wait: 15, flow: 'fluide', fast: true },
  { id: 'angre', zone: 'abidjan', city: 'Abidjan', name: 'Cocody — Angré 8ème Tranche', addr: 'Carrefour Pétro-Ivoire, face Cité BCEAO', hours: H('07:30', '17:00'), lanes: '3 VL', wait: 25, flow: 'modere' },
  { id: 'yopougon', zone: 'abidjan', city: 'Abidjan', name: 'Yopougon — Andokoi Zone Industrielle', addr: 'Avenue Industrielle, proche nouvelle voie Yopougon-Attécoubé', hours: H('07:00', '17:30'), lanes: '4 VL + 1 Moto', wait: 15, flow: 'fluide' },
  { id: 'koumassi', zone: 'abidjan', city: 'Abidjan', name: 'Koumassi — Zone Industrielle', addr: 'Boulevard du Gabon', hours: H('07:30', '17:00'), lanes: '3 VL + 1 PL', wait: 20, flow: 'fluide' },
  { id: 'bouake', zone: 'interieur', city: 'Bouaké', name: 'Bouaké — Délégation Régionale Centre', addr: 'Quartier Commerce, Boulevard Reine Pokou', hours: H('07:30', '16:30'), lanes: '3 VL + PL', wait: 10, flow: 'fluide' },
  { id: 'sanpedro', zone: 'interieur', city: 'San Pedro', name: 'San Pedro — Zone Portuaire Ouest', addr: 'Route de Grand Béréby, Axe Portuaire Autonome', hours: H('07:30', '16:30'), lanes: '2 VL + 2 PL', wait: 15, flow: 'fluide' },
  { id: 'yamoussoukro', zone: 'interieur', city: 'Yamoussoukro', name: 'Yamoussoukro — Route de Toumodi', addr: 'Face au Lycée Scientifique, Quartier Habitat', hours: H('07:30', '16:30'), lanes: '2 VL + PL', wait: 10, flow: 'fluide' },
  ...['Korhogo', 'Daloa', 'Abengourou', 'Man', 'Soubré', 'Agboville'].map((c) => ({
    id: c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
    zone: 'interieur', city: c, name: `${c} — Délégation régionale`, addr: null,
    hours: H('07:30', '16:30'), lanes: '2 VL', wait: 10, flow: 'fluide',
  })),
];

export const CENTER_CODES = {vridi: "VRD", angre: "ANG", yopougon: "YOP", koumassi: "KOU", bouake: "BKE", sanpedro: "SPD", yamoussoukro: "YAM"};
export const LANE_IND = { vl: 'Voie rapide — Piste 2', util: 'Voie rapide — Piste 2', pl: 'Piste 3 (poids lourds)', moto: 'Piste 4 (deux-roues)' };

export const LANES = {
  VP: 'Piste 1 (Véhicules légers)',
  Minibus: 'Piste 2 (Transports en commun)',
  PL: 'Piste 3 (Fosse & freinage PL)',
};
export const LANE_SHORT = { VP: 'Piste 1', Minibus: 'Piste 2 Minibus', PL: 'Piste 3 PL' };

// dueIn = jours restants avant échéance (relatif à aujourd'hui, pour que les "J-12" restent cohérents)
export const FLEET_BASE = [
  { id: 'v1', plate: '7492 KL 01', cg: 'CG24017731', model: 'Toyota Hilux 2.4 D4D (2021)', short: 'Toyota Hilux', role: 'Pick-up léger', type: 'VP Particulier', cat: 'VP', tarif: 'vl', dur: 20, dueIn: 12, driver: 'Mamadou Koné', phone: '0708112233' },
  { id: 'v2', plate: '1234 AB 01', cg: 'CG24008845', model: 'Mercedes-Benz Actros 3340', short: 'Mercedes Actros', role: 'Poids lourd', type: 'PL Poids lourd', cat: 'PL', tarif: 'pl', dur: 30, dueIn: 16, driver: 'Ibrahim Bamba', phone: '0544332211' },
  { id: 'v3', plate: '8492 JJ 01', cg: 'CG24031207', model: 'Toyota Coaster 30 pl.', short: 'Toyota Coaster', role: 'Minibus transport', type: 'Minibus', cat: 'Minibus', tarif: 'bus', dur: 30, dueIn: 19, driver: 'Seydou Traoré', phone: '0199887766' },
  { id: 'v4', plate: '5521 HG 01', cg: 'CG23099412', model: 'Peugeot Boxer 2.2 HDi', short: 'Peugeot Boxer', role: 'Fourgonnette', type: 'VP Utilitaire', cat: 'VP', tarif: 'vl', dur: 25, dueIn: 22, driver: 'Koffi Jean-Luc', phone: '0755667788' },
  { id: 'v5', plate: '3819 FE 01', cg: 'CG24002381', model: 'MAN TGS 41.400 Benne', short: 'MAN TGS', role: 'Benne', type: 'PL Poids lourd', cat: 'PL', tarif: 'pl', dur: 30, dueIn: 68, driver: 'Adama Ouattara', phone: '0102030405' },
  { id: 'v6', plate: '9942 MB 01', cg: 'CG24029576', model: 'Toyota Corolla Cross', short: 'Toyota Corolla Cross', role: 'Berline', type: 'VP Berline', cat: 'VP', tarif: 'vl', dur: 20, dueIn: 118, driver: 'Awa Diallo', phone: '0506070809' },
];

// Véhicule personnel de démonstration (espace particulier)
export const DEMO_OWN = { plate: '6021 KB 01', cg: 'CG24041160', model: 'Toyota RAV4', short: 'Toyota RAV4', dueIn: 310 };

export const COMPANY = { name: 'LOGISTIQUE DU PORT ABIDJAN SA', ref: 'N°CI-ABJ-882', taxId: '2018892 A', addr: 'Zone Portuaire Vridi, Abidjan', units: 24 };

export const HOW = [
  { t: 'Choisissez votre véhicule & centre', d: "Particulier, taxi Gbaka, poids lourd : sélectionnez l'un des 32 centres (Vridi, Angré, Yopougon, Bouaké…)." },
  { t: 'Payez via Mobile Money sécurisé', d: 'Validation instantanée sans frais cachés par Wave, Orange Money, MoMo ou carte bancaire.' },
  { t: 'Passez en voie prioritaire', d: "Présentez le Pass QR sur votre smartphone. Scanné à l'entrée, vous entrez directement sur la piste." },
];

export const DOCS = [
  { t: 'Carte grise originale', d: "Certificat d'immatriculation original ou CPI valide délivré par le Guichet Unique Automobile." },
  { t: "Attestation d'assurance", d: "Attestation d'assurance automobile ivoirienne (CEDEAO / Carte Brune) en cours de validité." },
  { t: "Pièce d'identité", d: "CNI, permis de conduire ivoirien ou passeport biométrique du conducteur présentant le véhicule." },
  { t: 'Pass visite SICTA', d: 'Le QR code reçu par SMS, WhatsApp ou email après votre réservation. Inutile de l’imprimer.' },
];

export const FAQ = [
  { q: "Quelle est la période de tolérance après l'expiration de ma vignette ?", a: "Une période de grâce administrative de <strong>15 jours calendaires</strong> est tolérée après la date d'échéance du macaron. Au-delà, le véhicule est passible d'une contravention forfaitaire et d'une mise en fourrière." },
  { q: 'Que faire en cas de contre-visite technique ?', a: `Si une anomalie critique est détectée, un rapport détaillé vous est remis. Vous avez <strong>15 jours ouvrables</strong> pour réparer puis vous représenter dans le même centre. La contre-visite bénéficie d'un tarif réduit de <strong>${Math.round((1 - OPS.contre.mult) * 100)} %</strong>, sans timbre.` },
  { q: "Puis-je modifier la date ou l'heure de mon créneau en ligne ?", a: 'Oui, sans frais, jusqu’à <strong>2 heures avant</strong> le créneau, depuis le lien de votre SMS ou email de confirmation.' },
  { q: 'Comment récupérer mon reçu fiscal et ma facture DGI ?', a: 'Dès validation du paiement Mobile Money, le justificatif fiscal (mention DGI et timbre dématérialisé) est disponible en PDF et archivé dans votre espace.' },
];

export const TESTIMONIALS = [
  { n: 'Koffi Amani', i: 'KA', r: 'Particulier (Cocody Angré) • Toyota RAV4', q: "Avant je passais une demi-journée à Angré. Là, j'ai pris mon RDV à 08h15, payé par Wave. À 08h35 j'avais déjà mon macaron. Une vraie révolution !" },
  { n: 'Souleymane Touré', i: 'ST', r: 'Gestionnaire flotte • 14 Gbakas Yopougon', q: "Pour notre coopérative, réserver en ligne nous a fait gagner des centaines d'heures. On n'avance plus de cash aux chauffeurs, tout est réglé par Orange Money." },
  { n: 'Edwige Bamba', i: 'EB', r: 'Cadre commerciale • Yamoussoukro', q: "Le rappel SMS 30 jours avant la date m'a sauvée d'une amende sur l'autoroute du Nord. Centre très propre et contrôleurs très professionnels." },
];

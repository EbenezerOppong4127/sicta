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
  { id: 'yopougon', zone: 'abidjan', city: 'Abidjan', name: 'Yopougon — Andokoi Zone Industrielle', addr: 'Avenue Industrielle, proche nouvelle voie Yopougon-Attécoubé', hours: H('07:00', '17:30'), lanes: '4 VL + 1 Moto', wait: 15, flow: 'fluide', tag: 'Taxis & Wôrô-wôrô acceptés' },
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

/** Coordonnées approximatives (niveau quartier/ville) — uniquement pour trier par distance à vol d'oiseau. */
export const CENTER_GEO = {
  vridi: [5.2527, -3.9855], angre: [5.401, -3.984], yopougon: [5.335, -4.09], koumassi: [5.297, -3.95],
  bouake: [7.6906, -5.03], sanpedro: [4.7485, -6.6363], yamoussoukro: [6.8276, -5.2893], korhogo: [9.458, -5.629],
  daloa: [6.8774, -6.4502], abengourou: [6.7297, -3.4964], man: [7.4125, -7.5538], soubre: [5.7855, -6.594], agboville: [5.928, -4.213],
};

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
  { id: 'v6', plate: '9942 MB 01', cg: 'CG24031991', model: 'Toyota Corolla Cross', short: 'Toyota Corolla Cross', role: 'Berline', type: 'VP Berline', cat: 'VP', tarif: 'vl', dur: 20, dueIn: 118, driver: 'Awa Diallo', phone: '0506070809' },
];

// Véhicules personnels de démonstration (espace particulier). Échéances relatives à aujourd'hui.
export const OWN_VEHICLES = [
  { plate: '1580 EF 01', cg: 'CG24029576', model: 'Toyota Corolla XLI', short: 'Toyota Corolla', icon: 'directions_car', usage: 'Usage public', genre: 'Voiture particulière',
    owner: 'BUFALO SARL', rccm: 'R.C.C.M CI-ABJ-01-2005-B78', dueIn: 18, insurer: 'SUNU / CEDEAO', insuranceIn: 95, lastCenter: 'Vridi 1',
    specs: { first: '03-10-2006', issued: '03-10-2019', cv: '7 CV', cc: '796 cc', energy: 'Essence', seats: '5 places', body: 'Cond Int 4 Pts' },
    history: [{ off: -365, kind: 'ok', center: 'SICTA Vridi' }, { off: -734, kind: 'ok', center: 'SICTA Koumassi' }, { off: -748, kind: 'contre', center: 'SICTA Koumassi', note: 'Pneumatiques' }] },
  { plate: '6021 KB 01', cg: 'CG24041160', model: 'Toyota RAV4', short: 'Toyota RAV4', icon: 'airport_shuttle', usage: 'Usage privé', genre: 'Voiture particulière',
    owner: 'KOUAMÉ Jean', rccm: null, dueIn: 310, insurer: 'NSIA / CEDEAO', insuranceIn: 280, lastCenter: 'Vridi 1',
    specs: { first: '12-02-2020', issued: '20-02-2020', cv: '9 CV', cc: '1987 cc', energy: 'Essence', seats: '5 places', body: 'Cond Int 4 Pts' },
    history: [{ off: -365, kind: 'ok', center: 'SICTA Vridi' }] },
  { plate: '4589 HJ 01', cg: 'CG24052208', model: 'Peugeot 301', short: 'Peugeot 301', icon: 'directions_car', usage: 'Usage privé', genre: 'Voiture particulière',
    owner: 'KOUAMÉ Jean', rccm: null, dueIn: 150, insurer: 'SAHAM / CEDEAO', insuranceIn: 140, lastCenter: 'Yopougon 1',
    specs: { first: '05-06-2018', issued: '18-06-2018', cv: '6 CV', cc: '1199 cc', energy: 'Essence', seats: '5 places', body: 'Cond Int 4 Pts' },
    history: [{ off: -365, kind: 'ok', center: 'SICTA Yopougon' }] },
];

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

// Page « SICTA Pro » : curseurs du simulateur de parc (valeur par défaut, max).
export const PRO_FLEET = [
  { k: 'vl', label: 'Véhicules légers & utilitaires (VL)', sub: 'Véhicules commerciaux, berlines de fonction, pick-ups', icon: 'directions_car', tarif: 'vl', def: 25, max: 150 },
  { k: 'pl', label: 'Poids lourds, tracteurs & remorques (PL)', sub: 'Porteurs, citernes carburant, semi-remorques fret portuaire', icon: 'local_shipping', tarif: 'pl', def: 12, max: 80 },
  { k: 'bus', label: 'Engins de transport, cars & minibus', sub: 'Navettes personnel, autocars interurbains, navettes VTC', icon: 'airport_shuttle', tarif: 'bus', def: 8, max: 60 },
  { k: 'moto', label: 'Flotte 2 & 3 roues de livraison', sub: 'Motos coursiers, tricycles livraison express Abidjan', icon: 'two_wheeler', tarif: 'moto', def: 15, max: 100 },
];
export const PRO_MIN_MOBILE = { vl: 15, pl: 8 }; // minimum pour une unité mobile (FAQ de la maquette)
export const PRO_SAVED_H = 5 / 3;                 // ≈ 2 h d'attente spontanée → 20 min en voie prioritaire
export const PRO_ZONES = ['Abidjan & Grand Abidjan', 'San Pedro & Région Sud-Ouest', 'Bouaké & Région Centrale', 'Korhogo & Région Nord', 'Multi-sites réseau national'];
export const PRO_SIZES = ['5 à 20 véhicules', '20 à 50 véhicules', '50 à 150 véhicules', 'Plus de 150 véhicules (grand compte)'];
export const PRO_PILLARS = [
  { icon: 'fast_forward', t: 'Couloir coupe-file dédié', d: 'Fini les files d’attente dès l’aube pour vos chauffeurs : créneau prioritaire réservé sur piste dédiée dans nos stations.', k: 'Prise en charge < 20 minutes' },
  { icon: 'airport_shuttle', t: 'Unités mobiles sur site', d: 'Nos camions-laboratoires certifiés se déplacent sur votre site industriel pour inspecter tout votre parc sans déplacer un véhicule.', k: 'Dès 20 véhicules groupés' },
  { icon: 'dashboard', t: 'Espace numérique SICTA Pro', d: 'Tableau de bord en temps réel : alertes 30 et 15 jours avant expiration, import CSV de vos cartes grises, Pass numériques.', k: 'Accès portail web' },
  { icon: 'account_balance', t: 'Facturation centralisée', d: 'Fini les avances de caisse aux chauffeurs : règlement unique par compte conventionné, virement ou Mobile Money entreprise.', k: 'TVA & timbres déductibles' },
];
export const PRO_STEPS = [
  { icon: 'upload', t: 'Enregistrement de la flotte', d: 'Importez la liste de vos immatriculations par fichier CSV. Notre équipe valide la grille tarifaire applicable.', k: 'Import CSV en 1 clic' },
  { icon: 'event_available', t: 'Planification flexible', d: 'Créneaux prioritaires réservés en station pour vos chauffeurs, ou déploiement d’une unité mobile dans vos cours et entrepôts.', k: 'Passage groupé ou étalé' },
  { icon: 'qr_code_2', t: 'Délivrance & audit', d: 'Pass numériques et certificats émis instantanément, avec un audit complet des freins, pneus et émissions de votre flotte.', k: 'Pass QR traçables' },
];
export const PRO_FAQ = [
  { q: 'Quelles sont les conditions pour déployer une unité mobile sur notre site ?', a: 'Votre site doit disposer d’une surface plane stabilisée ou bétonnée d’au moins 30 mètres de dégagement linéaire et regrouper au minimum <strong>15 véhicules légers ou 8 poids lourds</strong> sur la session.' },
  { q: 'Les procès-verbaux délivrés par unité mobile ont-ils la même valeur légale ?', a: 'Oui, rigoureusement identique : les unités mobiles sont reliées au serveur central SICTA et à la DGTT. Les vignettes sécurisées sont délivrées sur place.' },
  { q: 'Comment fonctionnent le compte conventionné et la facturation mensuelle ?', a: 'Après signature de la convention, un compte client professionnel est ouvert. Vos chauffeurs se présentent sans moyen de paiement ; vous recevez un relevé détaillé par immatriculation, payable à 30 jours.' },
  { q: 'Que se passe-t-il en cas de défaillance constatée lors du contrôle ?', a: 'Un rapport exhaustif est remis immédiatement à votre responsable de maintenance, puis une contre-visite prioritaire est programmée sous 15 jours, sans refaire tout le contrôle.' },
];
export const PRO_TESTI = [
  { n: 'Kouamé Armand K.', i: 'KA', r: 'Directeur logistique & transport — groupe cacao & agro-industrie, Abidjan', q: 'Avec plus de 120 semi-remorques entre le Port d’Abidjan et l’hinterland, l’immobilisation en file d’attente coûtait cher. Une unité mobile SICTA sur notre base de Vridi a résolu la contrainte en deux week-ends.' },
  { n: 'Diallo Tidiane', i: 'DT', r: 'Responsable parc matériel & engins — BTP, San Pedro', q: 'La facturation mensuelle centralisée et les alertes 30 jours avant péremption ont éliminé 100 % des amendes pour défaut de visite technique.' },
];

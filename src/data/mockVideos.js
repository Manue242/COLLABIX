export const CATEGORIES = ['Formations', 'Présentations', 'Démos', 'Communication interne']

export const mockVideos = [
  // Récentes (section d'accueil)
  { id:'1',  title:'Onboarding développeurs 2026',        category:'Formations',            duration:'14:32', addedAt:'28 juin 2026',  progress:60,  gradient:'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)', src:null },
  { id:'2',  title:'Résultats Q2 2026',                   category:'Présentations',         duration:'08:15', addedAt:'25 juin 2026',  progress:0,   gradient:'linear-gradient(135deg,#052e16,#14532d,#15803d)', src:null },
  { id:'3',  title:'Démo produit v3.2',                   category:'Démos',                 duration:'05:48', addedAt:'22 juin 2026',  progress:100, gradient:'linear-gradient(135deg,#431407,#7c2d12,#c2410c)', src:null },
  { id:'4',  title:'Message direction — Juin',            category:'Communication interne', duration:'03:20', addedAt:'20 juin 2026',  progress:30,  gradient:'linear-gradient(135deg,#2e1065,#5b21b6,#7c3aed)', src:null },
  { id:'5',  title:'Revue de sprint #14',                 category:'Présentations',         duration:'09:10', addedAt:'18 juin 2026',  progress:0,   gradient:'linear-gradient(135deg,#052e16,#166534,#16a34a)', src:null },
  { id:'6',  title:'Atelier design system',               category:'Formations',            duration:'47:22', addedAt:'15 juin 2026',  progress:20,  gradient:'linear-gradient(135deg,#1e1b4b,#4338ca,#6366f1)', src:null },

  // Formations (8 vidéos)
  { id:'7',  title:'Sécurité informatique — Niveau 1',    category:'Formations',            duration:'22:10', addedAt:'10 juin 2026',  progress:100, gradient:'linear-gradient(135deg,#1e1b4b,#4338ca)',          src:null },
  { id:'8',  title:'Introduction à React',                category:'Formations',            duration:'31:05', addedAt:'5 juin 2026',   progress:45,  gradient:'linear-gradient(135deg,#1e1b4b,#6366f1)',          src:null },
  { id:'9',  title:'RGPD pour les équipes',               category:'Formations',            duration:'18:44', addedAt:'1 juin 2026',   progress:0,   gradient:'linear-gradient(135deg,#1e1b4b,#312e81)',          src:null },
  { id:'10', title:'TypeScript avancé',                   category:'Formations',            duration:'55:30', addedAt:'28 mai 2026',   progress:75,  gradient:'linear-gradient(135deg,#1e1b4b,#1d4ed8)',          src:null },
  { id:'11', title:'Docker & Kubernetes pour devs',       category:'Formations',            duration:'42:15', addedAt:'20 mai 2026',   progress:10,  gradient:'linear-gradient(135deg,#0c1445,#1e40af)',          src:null },
  { id:'12', title:'Accessibilité web — WCAG 2.2',        category:'Formations',            duration:'28:00', addedAt:'15 mai 2026',   progress:0,   gradient:'linear-gradient(135deg,#1e1b4b,#7c3aed)',          src:null },
  { id:'13', title:'Git avancé : rebase & hooks',         category:'Formations',            duration:'19:55', addedAt:'10 mai 2026',   progress:100, gradient:'linear-gradient(135deg,#14532d,#166534)',          src:null },
  { id:'14', title:'Tests unitaires avec Vitest',         category:'Formations',            duration:'33:40', addedAt:'5 mai 2026',    progress:0,   gradient:'linear-gradient(135deg,#1e1b4b,#4c1d95)',          src:null },

  // Présentations (7 vidéos)
  { id:'15', title:'Roadmap produit S2 2026',             category:'Présentations',         duration:'12:30', addedAt:'15 juin 2026',  progress:80,  gradient:'linear-gradient(135deg,#052e16,#15803d)',          src:null },
  { id:'16', title:'Pitch investisseurs — Série B',       category:'Présentations',         duration:'09:55', addedAt:'8 juin 2026',   progress:0,   gradient:'linear-gradient(135deg,#052e16,#166534)',          src:null },
  { id:'17', title:'Revue de sprint #12',                 category:'Présentations',         duration:'07:18', addedAt:'3 juin 2026',   progress:20,  gradient:'linear-gradient(135deg,#052e16,#14532d)',          src:null },
  { id:'18', title:'Vision stratégique 2027',             category:'Présentations',         duration:'24:00', addedAt:'25 mai 2026',   progress:0,   gradient:'linear-gradient(135deg,#14532d,#15803d)',          src:null },
  { id:'19', title:'Bilan annuel RH 2025',                category:'Présentations',         duration:'15:30', addedAt:'18 mai 2026',   progress:100, gradient:'linear-gradient(135deg,#052e16,#16a34a)',          src:null },
  { id:'20', title:'Lancement offre Enterprise',          category:'Présentations',         duration:'11:10', addedAt:'12 mai 2026',   progress:55,  gradient:'linear-gradient(135deg,#064e3b,#059669)',          src:null },
  { id:'21', title:'Analyse marché EMEA Q1',              category:'Présentations',         duration:'18:45', addedAt:'5 mai 2026',    progress:0,   gradient:'linear-gradient(135deg,#052e16,#065f46)',          src:null },

  // Démos (5 vidéos)
  { id:'22', title:'Démo API v2 — Partenaires',           category:'Démos',                 duration:'11:20', addedAt:'18 juin 2026',  progress:0,   gradient:'linear-gradient(135deg,#431407,#9a3412)',          src:null },
  { id:'23', title:'Démo tableau de bord analytics',      category:'Démos',                 duration:'06:44', addedAt:'12 juin 2026',  progress:100, gradient:'linear-gradient(135deg,#431407,#b45309)',          src:null },
  { id:'24', title:'Démo module de paiement v4',          category:'Démos',                 duration:'08:30', addedAt:'5 juin 2026',   progress:0,   gradient:'linear-gradient(135deg,#7c2d12,#c2410c)',          src:null },
  { id:'25', title:'Démo intégration Slack',              category:'Démos',                 duration:'04:15', addedAt:'28 mai 2026',   progress:40,  gradient:'linear-gradient(135deg,#431407,#ea580c)',          src:null },
  { id:'26', title:'Démo export PDF avancé',              category:'Démos',                 duration:'07:00', addedAt:'20 mai 2026',   progress:0,   gradient:'linear-gradient(135deg,#7c2d12,#dc2626)',          src:null },

  // Communication interne (6 vidéos)
  { id:'27', title:'Annonce restructuration équipes',     category:'Communication interne', duration:'04:10', addedAt:'17 juin 2026',  progress:0,   gradient:'linear-gradient(135deg,#2e1065,#6d28d9)',          src:null },
  { id:'28', title:'Bilan RSE 2025',                      category:'Communication interne', duration:'09:30', addedAt:'2 juin 2026',   progress:55,  gradient:'linear-gradient(135deg,#1e1b4b,#7c3aed)',          src:null },
  { id:'29', title:'Nouveaux avantages salariés',         category:'Communication interne', duration:'06:20', addedAt:'25 mai 2026',   progress:100, gradient:'linear-gradient(135deg,#2e1065,#4c1d95)',          src:null },
  { id:'30', title:'Message CEO — Feuille de route H2',   category:'Communication interne', duration:'05:45', addedAt:'18 mai 2026',   progress:0,   gradient:'linear-gradient(135deg,#3b0764,#7c3aed)',          src:null },
  { id:'31', title:'Retour sur la team offsite 2026',     category:'Communication interne', duration:'03:50', addedAt:'10 mai 2026',   progress:30,  gradient:'linear-gradient(135deg,#2e1065,#5b21b6)',          src:null },
  { id:'32', title:'Politique télétravail mise à jour',   category:'Communication interne', duration:'07:15', addedAt:'2 mai 2026',    progress:0,   gradient:'linear-gradient(135deg,#1e1b4b,#6d28d9)',          src:null },
]

export const BADGE_STYLES = {
  'Formations':            { bg:'#EEF2FF', color:'#4338CA' },
  'Présentations':         { bg:'#F0FDF4', color:'#15803D' },
  'Démos':                 { bg:'#FFF7ED', color:'#C2410C' },
  'Communication interne': { bg:'#FDF4FF', color:'#7E22CE' }
}

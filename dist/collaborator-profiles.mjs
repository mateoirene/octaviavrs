export const collaboratorProfiles=[
 {match:/\bcamats\b/,src:'assets/collaborator-camats-enhanced.webp',label:'Forn i Pastisseria Camats'},
 {match:/\bauto ?wrapping\b/,src:'assets/collaborator-autowrapping-enhanced.webp',label:'Autowrapping'},
 {match:/\bgestion motor\b/,src:'assets/collaborator-gestion-motor-enhanced.webp',label:'Gestión Motor'},
 {match:/\bhey tattoo\b/,src:'assets/collaborator-hey-tattoo-enhanced.webp',label:'Hey Tattoo'},
 {match:/\bfactor lambda\b/,src:'assets/collaborator-factor-lambda-enhanced.webp',label:'Factor Lambda Car Performance'}
];

export function normalizedCollaboratorName(value=''){
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

export function collaboratorProfile(name=''){
 const normalized=normalizedCollaboratorName(name);
 return collaboratorProfiles.find(profile=>profile.match.test(normalized))||null;
}

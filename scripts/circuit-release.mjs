import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Reviewed circuit-only release: preserve infrastructure and do not send club notices.
const allowed=new Set([
 ".github/audits/circuit-models.mjs",
 ".github/workflows/auditar-pilotos-simulador.yml",
 "dist/racing-aerial.mjs",
 "dist/racing-body-shapes.mjs",
 "dist/racing-championship.mjs",
 "dist/racing-finish-replay.mjs",
 "dist/racing-pilot-profiles.mjs",
 "dist/racing-profile-controls.mjs",
 "dist/racing-profile-selection.mjs",
 "dist/racing-profiles.css",
 "dist/racing-results.mjs",
 "dist/racing-roof-numbers.mjs",
 "dist/racing-tesla-photo3d.mjs",
 "dist/racing-vehicles3d.mjs",
 "dist/racing-world3d.mjs",
 "dist/racing.mjs",
 "dist/simulador.html",
 "dist/simulator-bootstrap.mjs",
 "docs/circuito-aereo-pilotos.md",
 "scripts/circuit-aerial-browser-check.mjs",
 "scripts/circuit-car-gallery.html",
 "scripts/racing-roof-geometry.test.mjs",
 "server/racing-pilots.mjs",
 "server/racing.mjs",
 "tests/racing-pilot-profiles.test.mjs",
 "tests/racing-profile-selection.test.mjs",
 ".github/workflows/publicar.yml",
 "scripts/circuit-release.mjs",
 "scripts/check-circuit-profiles-live.mjs",
 "tests/circuit-release.test.mjs",
 "scripts/browser-check.mjs"
]);
export function isCircuitOnlyRelease(files){return Array.isArray(files)&&files.length>0&&files.every(p=>allowed.has(p))&&files.some(p=>p.startsWith('dist/racing')||p==='server/racing.mjs'||p==='server/racing-pilots.mjs'||p==='scripts/browser-check.mjs');}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const [before,head]=process.argv.slice(2);if(![before,head].every(ref=>/^[a-f0-9]{40}$/i.test(ref||'')))throw Error('Referencias de publicación no válidas');const files=execFileSync('git',['diff','--name-only',before,head],{encoding:'utf8'}).trim().split('\n').filter(Boolean);console.log('solo_circuito='+isCircuitOnlyRelease(files));}

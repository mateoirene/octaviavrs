import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('publicación visual consulta Cloudflare sin mutaciones y guarda recuperación',async()=>{
 const root=await mkdtemp(join(tmpdir(),'octavia-deploy-test-'));
 try{
  await mkdir(join(root,'scripts'));await mkdir(join(root,'server'));
  for(const name of ['cloudflare-target.mjs','cloudflare-analytics-native.mjs'])await cp('scripts/'+name,join(root,'scripts',name));
  await writeFile(join(root,'server/analytics-native.mjs'),'export const nativeAnalytics={};');
  const setup=`globalThis.fetch=async(url,options={})=>{if(options.method&&options.method!=='GET')throw Error('MUTATION BLOCKED');if(url.endsWith('/user/tokens/verify'))return Response.json({success:true,result:{status:'active'}});if(url.endsWith('/pages/projects/octaviaap'))return Response.json({success:true,result:{name:'octaviaap',subdomain:'octaviaap.pages.dev',production_branch:'main',build_config:{web_analytics_token:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'},canonical_deployment:{id:'existing-production',url:'https://previous.pages.dev',deployment_trigger:{metadata:{commit_hash:'previous-sha'}}}}});throw Error('Unexpected request');};`;
  await writeFile(join(root,'mock.mjs'),setup);
  const r=spawnSync(process.execPath,['--import','./mock.mjs','scripts/cloudflare-target.mjs'],{cwd:root,env:{...process.env,CLOUDFLARE_API_TOKEN:'fake-test-token',CLOUDFLARE_ACCOUNT_ID:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',PRESERVE_CLOUDFLARE_CONFIG:'true',GITHUB_OUTPUT:join(root,'step-output'),GITHUB_STEP_SUMMARY:''},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.match(await readFile(join(root,'step-output'),'utf8'),/branch=main\nready=true/);assert.equal(JSON.parse(await readFile(join(root,'artifacts/produccion-previa.json'))).deploymentId,'existing-production');assert.match(await readFile(join(root,'server/analytics-native.mjs'),'utf8'),/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/);
 }finally{await rm(root,{recursive:true,force:true});}
});

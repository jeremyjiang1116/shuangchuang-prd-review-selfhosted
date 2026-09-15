import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,readdirSync,rmSync} from 'node:fs';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
if(result.status!==0)process.exit(result.status??1);
const output='.next/standalone';
for(const name of readdirSync(output))if(name==='.env'||name.startsWith('.env.'))rmSync(output+'/'+name);
if(existsSync('public'))cpSync('public',output+'/public',{recursive:true});
cpSync('.next/static',output+'/.next/static',{recursive:true});
console.log('独立运行产物已就绪，环境密钥未随产物打包。');

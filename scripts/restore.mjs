import {DatabaseSync} from 'node:sqlite';
import {copyFileSync,existsSync,renameSync,rmSync,chmodSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {loadConfig} from './config.mjs';
import {backupDatabase} from './database.mjs';
if(!process.argv[2]||!process.argv.includes('--confirm-stopped'))throw new Error('先停止应用，再运行 node scripts/restore.mjs 备份路径 --confirm-stopped');
const source=resolve(process.argv[2]),target=loadConfig();
if(source===target||!existsSync(source))throw new Error('备份路径无效。');
const check=new DatabaseSync(source,{readOnly:true});
try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||check.prepare('PRAGMA user_version').get().user_version!==1)throw new Error('备份完整性或结构版本不匹配。');for(const table of ['people','comments','edits','reviews','revisions','import_metadata'])check.prepare('SELECT count(*) FROM '+table).get();}finally{check.close();}
if(existsSync(target))await backupDatabase(target,target+'.before-restore-'+Date.now()+'.sqlite');
mkdirSync(dirname(target),{recursive:true,mode:0o700});
const temp=target+'.restore-'+process.pid;copyFileSync(source,temp);chmodSync(temp,0o600);
for(const suffix of ['-wal','-shm'])rmSync(target+suffix,{force:true});
renameSync(temp,target);console.log('数据库已恢复，可以重新启动应用。');

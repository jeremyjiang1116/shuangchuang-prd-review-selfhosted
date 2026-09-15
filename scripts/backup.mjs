import {resolve} from 'node:path';
import {loadConfig} from './config.mjs';
import {backupDatabase} from './database.mjs';
const target=resolve(process.argv[2]||'backups/review-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
await backupDatabase(loadConfig(),target);console.log('已创建一致性备份：'+target);

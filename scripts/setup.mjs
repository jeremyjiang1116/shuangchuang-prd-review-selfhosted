import {writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env')){console.log('.env 已存在，保留当前配置。');process.exit(0);}
const pass='SC-'+randomBytes(10).toString('hex');
writeFileSync('.env','TEAM_PASSCODE='+pass+'\nREVIEW_SECRET='+randomBytes(32).toString('hex')+'\nAPP_ORIGIN=http://localhost:3000\nDATABASE_PATH=data/review.sqlite\nTRUST_PROXY=0\nPORT=3000\n',{mode:0o600,flag:'wx'});
console.log('配置已写入 .env。团队口令：'+pass+'\n部署前请将 APP_ORIGIN 改为实际访问地址；请妥善保存 .env。');

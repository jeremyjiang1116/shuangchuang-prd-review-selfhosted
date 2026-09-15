import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
export function loadConfig(){if(existsSync('.env'))process.loadEnvFile('.env');return resolve(process.env.DATABASE_PATH||'data/review.sqlite');}
export function checkConfig(){
 if(!process.env.TEAM_PASSCODE||process.env.TEAM_PASSCODE.length<12||process.env.TEAM_PASSCODE.startsWith('replace-'))throw new Error('请先运行 npm run setup，或设置至少 12 字符的 TEAM_PASSCODE。');
 if(!process.env.REVIEW_SECRET||process.env.REVIEW_SECRET.length<32||process.env.REVIEW_SECRET.startsWith('replace-'))throw new Error('REVIEW_SECRET 至少需要 32 字符且不能使用示例值。');
 if(!process.env.APP_ORIGIN)throw new Error('请设置 APP_ORIGIN 为团队访问地址。');
 const u=new URL(process.env.APP_ORIGIN);if(!['http:','https:'].includes(u.protocol)||u.origin!==process.env.APP_ORIGIN)throw new Error('APP_ORIGIN 必须是完整域名或 IP 地址与端口，不带路径及末尾斜杠。');
}

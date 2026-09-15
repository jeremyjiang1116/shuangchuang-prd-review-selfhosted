const env=process.env;
import {cookies} from 'next/headers';
import {database} from './review-store';
import type {Person} from './types';
const COOKIE='prd_review_session';const encoder=new TextEncoder();
export class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
function secret():string{const s=env.REVIEW_SECRET;if(!s||s.length<32)throw new ApiError(503,'评审空间尚未配置完成，请稍后再试。');return s;}
async function mac(value:string){const key=await crypto.subtle.importKey('raw',encoder.encode(secret()),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export async function currentPerson():Promise<Person|null>{const value=(await cookies()).get(COOKIE)?.value;if(!value)return null;const [id,expiry,signature]=value.split('.');if(!id||!expiry||!signature||Number(expiry)<Date.now()||!equal(await mac(id+'.'+expiry),signature))return null;return await database().prepare('SELECT id,name FROM people WHERE id=?').bind(id).first<Person>();}
export async function requirePerson(){const p=await currentPerson();if(!p)throw new ApiError(401,'请先输入团队口令和姓名。');return p;}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==(process.env.APP_ORIGIN||new URL(request.url).origin))throw new ApiError(403,'请求来源不匹配，请刷新网页后重试。');}
export async function login(request:Request,body:{name?:unknown;passcode?:unknown}){
 sameOrigin(request);if(!body||typeof body!=='object')throw new ApiError(400,'提交内容格式有误。');const pass=env.TEAM_PASSCODE;if(!pass)throw new ApiError(503,'团队口令尚未配置，请稍后再试。');
 const ip=(process.env.TRUST_PROXY==='1'?request.headers.get('x-forwarded-for')?.split(',')[0]?.trim():null)||'local';const bucket=String(Math.floor(Date.now()/600000));const k=await mac('rate:'+ip+':'+bucket);const db=database();
 const row=await db.prepare('SELECT count FROM access_attempts WHERE key=?').bind(k).first<{count:number}>();if((row?.count??0)>=12)throw new ApiError(429,'尝试次数较多，请十分钟后再试。');
 if(typeof body.passcode!=='string'||!equal(await mac(body.passcode),await mac(pass))){await db.batch([db.prepare('INSERT INTO access_attempts(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(k,Date.now()+600000),db.prepare('DELETE FROM access_attempts WHERE expires_at<?').bind(Date.now())]);throw new ApiError(403,'团队口令不正确，请重新输入。');}
 const name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):'';if(name.length<2||name.length>30)throw new ApiError(400,'请填写 2—30 字的姓名或唯一昵称。');
 const nameKey=name.normalize('NFKC').toLowerCase();await db.prepare('INSERT INTO people(id,name,name_key,created_at) VALUES(?,?,?,?) ON CONFLICT(name_key) DO NOTHING').bind(crypto.randomUUID(),name,nameKey,new Date().toISOString()).run();
 const person=await db.prepare('SELECT id,name FROM people WHERE name_key=?').bind(nameKey).first<Person>();if(!person)throw new ApiError(503,'署名保存失败，请重试。');
 const token=person.id+'.'+(Date.now()+30*86400000);const secure=new URL(process.env.APP_ORIGIN||request.url).protocol==='https:';
 return {person,cookie:`${COOKIE}=${token}.${await mac(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure?'; Secure':''}`};
}
export const logoutCookie=()=>`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
export function apiFailure(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});console.error('review request failed',e instanceof Error?e.message:'unknown');return Response.json({error:'共享数据暂时无法读写，你的输入仍保留，请稍后重试。'},{status:503,headers:{'Cache-Control':'no-store'}});}
export async function requestBody(request:Request){const text=await request.text();if(text.length>32000)throw new ApiError(413,'本次内容较长，请分段提交。');try{return JSON.parse(text);}catch{throw new ApiError(400,'提交内容格式有误。');}}

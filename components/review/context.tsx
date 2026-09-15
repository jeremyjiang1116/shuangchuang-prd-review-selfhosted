'use client';
import type {Edition} from '@/lib/editions';
import type {Release} from '@/lib/release-types';
import {createContext,useContext} from 'react';
import type {Anchor,Feature,Person,ReviewDocument,ReviewState} from '@/lib/types';
export type Panel={kind:'feature';id:string}|{kind:'selection';anchors:Anchor[]}|{kind:'thread';id:string}|{kind:'all'}|null;
export type ReviewContextValue={edition:Edition;release:Release|null;doc:ReviewDocument;state:ReviewState;person:Person;busy:boolean;text:(id:string)=>string;version:(id:string)=>number;personName:(id:string|null)=>string;mutate:(input:Record<string,unknown>)=>Promise<void>;setPanel:(p:Panel)=>void;startEdit:(id:string)=>void;review:(f:Feature,status:string,note?:string)=>Promise<void>};
export const ReviewContext=createContext<ReviewContextValue|null>(null);
export function useReview(){const v=useContext(ReviewContext);if(!v)throw new Error('Review context missing');return v;}
export function timeLabel(value:string){return new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
export const statusLabels:Record<string,string>={pending:'未审阅',approved:'已确认',issue:'有问题',stale:'待复核'};
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export async function request<T>(path:string,body?:unknown,method?:string):Promise<T>{const res=await fetch(path,{method:method??(body?'POST':'GET'),headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});let data:T&{error?:string};try{data=await res.json() as T&{error?:string};}catch{throw new HttpError(res.status,'共享服务暂时无法响应，请稍后重试。');}if(!res.ok)throw new HttpError(res.status,data.error||'请求失败，请重试。');return data;}

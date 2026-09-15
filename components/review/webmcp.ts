'use client';
import {useEffect,useRef} from 'react';
import {useReview} from './context';
import {effectiveStatus,featureHash} from '@/lib/review-rules';
type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
type ModelContext={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function useReviewTools(navigation:{selectDomain:(id:string)=>void;setView:(view:string)=>void}){
 const review=useReview(),latest=useRef({review,navigation});useEffect(()=>{latest.current={review,navigation};},[review,navigation]);
 useEffect(()=>{const context=(document as Document&{modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();
 const tools:Tool[]=[{name:'read_prd_review_summary',title:'读取产品评审进度',description:'读取当前署名的逐项审阅状态及团队未解决讨论数量。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){const {doc,state,person}=latest.current.review;return {reviewer:person.name,features:doc.features.map(f=>({id:f.id,status:effectiveStatus(state.reviews.find(r=>r.featureId===f.id&&r.userId===person.id),featureHash(f,doc,state.edits))})),openDiscussions:state.comments.filter(c=>!c.parentId&&!c.resolved).length};}},{name:'open_feature_review',title:'打开功能审阅',description:'打开指定功能的审阅侧栏供用户填写意见，不提交审阅记录。',inputSchema:{type:'object',properties:{featureId:{type:'string'}},required:['featureId'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){const id=(input as {featureId?:unknown})?.featureId;const {review,navigation}=latest.current;const f=review.doc.features.find(f=>f.id===id);if(!f)throw new Error('功能编号不存在。');navigation.selectDomain(f.domain);review.setPanel({kind:'feature',id:f.id});return {openedFeature:f.id};}}];
 for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>console.warn('Review tools registration unavailable'));}catch{console.warn('Review tools registration unavailable');}}
 return ()=>lifecycle.abort();},[]);
}

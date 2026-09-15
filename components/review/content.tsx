'use client';
import {Pencil,MessageSquare,CheckCheck,RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table';
import {effectiveStatus,featureHash,highlightSegments,locateAnchor} from '@/lib/review-rules';
import type {ChapterItem,Feature} from '@/lib/types';
import {useReview,statusLabels} from './context';
import {toast} from 'sonner';

export function TextBlock({id,inline=false}:{id:string;inline?:boolean}){
 const {text,state,startEdit,setPanel}=useReview();const value=text(id);
 const ranges=state.comments.filter(c=>!c.parentId&&!c.resolved).flatMap(c=>c.anchors.filter(a=>a.blockId===id).flatMap(a=>{const p=locateAnchor(value,a);return p?[{...p,id:c.id}]:[];}));
 return <span className={`editable-block ${inline?'inline-block-text':''}`}><span data-block-id={id}>{highlightSegments(value,ranges).map((s,i)=>s.ids.length?<mark key={i} className="comment-highlight" tabIndex={0} role="button" aria-label={`查看 ${s.ids.length} 条划线讨论`} onKeyDown={e=>{if(e.key==='Enter')setPanel({kind:'thread',id:s.ids[0]});}} onClick={()=>{if(window.getSelection()?.isCollapsed)setPanel({kind:'thread',id:s.ids[0]});}}>{s.text}</mark>:<span key={i}>{s.text}</span>)}</span><button className="edit-trigger" title="修订这段内容" aria-label="修订这段内容" onClick={()=>startEdit(id)}><Pencil size={13}/></button></span>;
}

export function FeatureTable({features}:{features:Feature[]}){
 const {doc,state,person,busy,review,setPanel}=useReview();
 return <Table className="feature-table"><TableHeader><TableRow><TableHead className="w-[190px]">产品功能</TableHead><TableHead>功能细节</TableHead><TableHead className="w-[27%]">规则与待确认</TableHead><TableHead className="w-[144px]">我的审阅</TableHead></TableRow></TableHeader><TableBody>{features.map(f=>{
  const hash=featureHash(f,doc,state.edits),mine=state.reviews.find(r=>r.featureId===f.id&&r.userId===person.id),status=effectiveStatus(mine,hash);
  const others=state.reviews.filter(r=>r.featureId===f.id&&r.userId!==person.id),approved=others.filter(r=>effectiveStatus(r,hash)==='approved').length,issues=others.filter(r=>effectiveStatus(r,hash)==='issue').length;
  const discussions=state.comments.filter(c=>!c.parentId&&!c.resolved&&(c.featureId===f.id||c.anchors.some(a=>[f.name,f.detail,f.rule].includes(a.blockId)))).length;
  return <TableRow key={f.id} id={`feature-${f.id}`} className={status==='issue'?'row-issue':''}><TableCell className="feature-name"><span className="feature-id">{f.id}</span><TextBlock id={f.name}/>{f.scope&&f.scope!=='本期范围'&&<span className="scope-label">{f.scope}</span>}</TableCell><TableCell><TextBlock id={f.detail}/></TableCell><TableCell className="rule-cell"><TextBlock id={f.rule}/></TableCell><TableCell className="review-cell"><label className={`review-check status-${status}`}><Checkbox disabled={busy} checked={status==='approved'} aria-label={`${f.id} 没有问题，确认通过`} onCheckedChange={checked=>{void review(f,checked?'approved':'pending',mine?.note).catch(e=>toast.error(e.message));}}/><span>{statusLabels[status]}</span></label>{status==='stale'&&<span className="review-hint"><RotateCcw size={11}/>内容已更新</span>}<Button variant="ghost" size="sm" className="row-discuss" onClick={()=>setPanel({kind:'feature',id:f.id})}><MessageSquare size={14}/>{mine?.note?'查看补充':'问题 / 补充'}{discussions>0&&<b>{discussions}</b>}</Button>{(approved>0||issues>0)&&<button className="team-row-status" onClick={()=>setPanel({kind:'feature',id:f.id})}>{approved>0&&<span><CheckCheck size={12}/>{approved} 人确认</span>}{issues>0&&<span className="text-amber-700">{issues} 人有问题</span>}</button>}</TableCell></TableRow>;
 })}</TableBody></Table>;
}

export function DocumentItem({item}:{item:ChapterItem}){
 const {doc}=useReview();
 if(item.type==='features')return <div className="feature-table-wrap"><FeatureTable features={(item.ids??[]).map(id=>doc.features.find(f=>f.id===id)!).filter(Boolean)}/></div>;
 if(item.type==='table')return <div className="doc-table"><Table><TableBody>{item.rows?.map((row,i)=><TableRow key={i}>{row.map((id,j)=>i===0?<TableHead key={j}><TextBlock id={id}/></TableHead>:<TableCell key={j}><TextBlock id={id}/></TableCell>)}</TableRow>)}</TableBody></Table></div>;
 if(!item.blockId)return null;
 if(item.type==='heading')return item.level===3?<h3 className="doc-h3"><TextBlock id={item.blockId}/></h3>:<h4 className="doc-h4"><TextBlock id={item.blockId}/></h4>;
 return <p className={`doc-paragraph ${item.bullet?'doc-bullet':''}`}><TextBlock id={item.blockId}/></p>;
}

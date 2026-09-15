import type {ReviewDocument,ReviewState} from './types';
export type Edition='original'|'v2';
const PREFIX='v2::';
export function storageId(id:string,edition:Edition){return edition==='v2'?PREFIX+id:id;}
export function isEditionId(id:string,edition:Edition){return edition==='v2'?id.startsWith(PREFIX):!id.startsWith(PREFIX);}
export function publicId(id:string,edition:Edition){return edition==='v2'?id.slice(PREFIX.length):id;}
export function scopedDocument(doc:ReviewDocument,edition:Edition):ReviewDocument{
 if(edition==='original')return doc;
 return {...doc,blocks:Object.fromEntries(Object.entries(doc.blocks).map(([id,b])=>[storageId(id,edition),{...b,id:storageId(id,edition)}])),features:doc.features.map(f=>({...f,id:storageId(f.id,edition),name:storageId(f.name,edition),detail:storageId(f.detail,edition),rule:storageId(f.rule,edition)}))};
}
export function editionState(state:ReviewState,edition:Edition):ReviewState{
 const roots=state.comments.filter(c=>!c.parentId&&isEditionId(c.featureId??c.anchors[0]?.blockId??'',edition)),ids=new Set(roots.map(c=>c.id));
 return {...state,edits:state.edits.filter(e=>isEditionId(e.blockId,edition)).map(e=>({...e,blockId:publicId(e.blockId,edition)})),reviews:state.reviews.filter(r=>isEditionId(r.featureId,edition)).map(r=>({...r,featureId:publicId(r.featureId,edition)})),revisions:state.revisions.filter(r=>isEditionId(r.blockId,edition)).map(r=>({...r,blockId:publicId(r.blockId,edition)})),comments:state.comments.filter(c=>ids.has(c.id)||(c.parentId&&ids.has(c.parentId))).map(c=>({...c,featureId:c.featureId?publicId(c.featureId,edition):null,anchors:c.anchors.map(a=>({...a,blockId:publicId(a.blockId,edition)}))}))};
}

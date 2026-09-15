import {database} from './sqlite';
export {database} from './sqlite';
import raw from './document.json';
import release from './releases/v2.json';
import {scopedDocument,editionState,storageId,isEditionId,type Edition} from './editions';
import {ApiError} from './access';
import {featureHash} from './review-rules';
import type {ReviewDocument,ReviewState,Edit,Anchor,Person,Review,Revision,Comment} from './types';
export const document=raw as ReviewDocument;
export const releaseData=release;
export const documentForEdition=(edition:Edition)=>edition==='v2'?release.document as ReviewDocument:document;
export function requestEdition(request:Request):Edition{const edition=new URL(request.url).searchParams.get('edition')??'original';if(edition!=='original'&&edition!=='v2')throw new ApiError(400,'文档版本不存在。');return edition;}

async function readAllState():Promise<ReviewState>{const db=database();const result=await db.batch([
 db.prepare('SELECT id,name FROM people ORDER BY name'),
 db.prepare('SELECT block_id AS blockId,text,version,author_id AS authorId,updated_at AS updatedAt FROM edits'),
 db.prepare('SELECT feature_id AS featureId,user_id AS userId,status,note,content_hash AS contentHash,updated_at AS updatedAt FROM reviews'),
 db.prepare('SELECT id,parent_id AS parentId,feature_id AS featureId,author_id AS authorId,body,anchors,resolved,resolved_by AS resolvedBy,created_at AS createdAt,updated_at AS updatedAt FROM comments ORDER BY created_at'),
 db.prepare('SELECT id,block_id AS blockId,author_id AS authorId,before_text AS beforeText,after_text AS afterText,version,created_at AS createdAt FROM revisions ORDER BY created_at DESC')]);
 return {people:result[0].results as Person[],edits:result[1].results as Edit[],reviews:result[2].results as Review[],comments:(result[3].results as unknown as (Omit<Comment,'anchors'|'resolved'>&{anchors:string;resolved:number})[]).map(x=>({...x,anchors:JSON.parse(x.anchors) as Anchor[],resolved:!!x.resolved})),revisions:result[4].results as Revision[]};}
export async function readState(edition:Edition='original'){return editionState(await readAllState(),edition);}
function string(value:unknown,max=5000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new ApiError(400,`请填写 1—${max} 字内容。`);return value.trim();}
function feature(document:ReviewDocument,id:unknown){const f=document.features.find(f=>f.id===id);if(!f)throw new ApiError(400,'未找到该功能。');return f;}
export async function mutate(person:Person,input:Record<string,unknown>,edition:Edition='original'){if(!input||typeof input!=='object')throw new ApiError(400,'提交内容格式有误。');const db=database(),now=new Date().toISOString();const document=scopedDocument(documentForEdition(edition),edition);
 input={...input};if(typeof input.featureId==='string')input.featureId=storageId(input.featureId,edition);if(typeof input.blockId==='string')input.blockId=storageId(input.blockId,edition);if(Array.isArray(input.anchors))input.anchors=input.anchors.map(a=>({...a,blockId:typeof a.blockId==='string'?storageId(a.blockId,edition):a.blockId}));
 const commentId=input.parentId||(input.op==='resolve'||input.op==='comment-edit'?input.id:null);if(commentId){const record=await db.prepare('SELECT feature_id,anchors,parent_id FROM comments WHERE id=?').bind(string(commentId,100)).first<{feature_id:string|null;anchors:string;parent_id:string|null}>();if(!record)throw new ApiError(404,'讨论不存在。');const root=record.parent_id?await db.prepare('SELECT feature_id,anchors FROM comments WHERE id=?').bind(record.parent_id).first<{feature_id:string|null;anchors:string}>():record;const key=root?.feature_id??(root?JSON.parse(root.anchors)[0]?.blockId:'')??'';if(!root||!isEditionId(key,edition))throw new ApiError(403,'该讨论属于另一个文档版本。');}

 if(input.op==='review'){
  const f=feature(document,input.featureId);if(typeof input.status!=='string'||!['pending','approved','issue'].includes(input.status))throw new ApiError(400,'审阅状态不正确。');
  const note=typeof input.note==='string'?input.note.trim():'';if(note.length>5000||input.status==='issue'&&!note)throw new ApiError(400,'请填写具体问题或补充说明。');
  const current=await db.prepare('SELECT block_id AS blockId,text,version,author_id AS authorId,updated_at AS updatedAt FROM edits').all<Edit>();const hash=featureHash(f,document,current.results);
  if(input.contentHash!==hash)throw new ApiError(409,'这项功能刚被修订，请阅读最新内容后再次确认。');
  // The guard is checked in the same statement as the write, so a concurrent edit cannot slip through.
  const cells=[f.name,f.detail,f.rule];const versions=cells.map(id=>current.results.find(e=>e.blockId===id)?.version??0);
  const guard=cells.map(()=>"COALESCE((SELECT version FROM edits WHERE block_id=?),0)=?").join(' AND ');
  const result=await db.prepare(`INSERT INTO reviews(feature_id,user_id,status,note,content_hash,updated_at) SELECT ?,?,?,?,?,? WHERE ${guard} ON CONFLICT(feature_id,user_id) DO UPDATE SET status=excluded.status,note=excluded.note,content_hash=excluded.content_hash,updated_at=excluded.updated_at`).bind(f.id,person.id,input.status,note,hash,now,...cells.flatMap((id,i)=>[id,versions[i]])).run();if(!result.meta.changes)throw new ApiError(409,'这项功能刚被修订，请刷新后再确认。');return;
 }
 if(input.op==='edit'){
  const id=input.blockId;if(typeof id!=='string'||!document.blocks[id])throw new ApiError(400,'正文位置不存在。');const text=string(input.text,12000);const base=input.baseVersion;if(typeof base!=='number'||!Number.isInteger(base)||base<0)throw new ApiError(400,'正文版本不正确。');
  const old=await db.prepare('SELECT text,version FROM edits WHERE block_id=?').bind(id).first<{text:string;version:number}>();if((old?.version??0)!==base)throw new ApiError(409,'这段内容已被其他同学修订。你的草稿已保留，请对照最新内容再提交。');const before=old?.text??document.blocks[id].text;if(before===text)return;
  const result=await db.batch([
   db.prepare('INSERT INTO revisions(id,block_id,author_id,before_text,after_text,version,created_at) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT version FROM edits WHERE block_id=?),0)=?').bind(crypto.randomUUID(),id,person.id,before,text,base+1,now,id,base),
   db.prepare('INSERT INTO edits(block_id,text,version,author_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(block_id) DO UPDATE SET text=excluded.text,version=excluded.version,author_id=excluded.author_id,updated_at=excluded.updated_at WHERE edits.version=?').bind(id,text,base+1,person.id,now,base)
  ]);if(!result[1].meta.changes)throw new ApiError(409,'已有更新版本，你的草稿已保留，请合并后重试。');return;
 }
 if(input.op==='comment'){
  const body=string(input.body);let parentId:string|null=null,featureId:string|null=null;let anchors:Anchor[]=[];
  if(input.parentId){const parent=await db.prepare('SELECT id,feature_id AS featureId FROM comments WHERE id=? AND parent_id IS NULL').bind(string(input.parentId,100)).first<{id:string;featureId:string|null}>();if(!parent)throw new ApiError(400,'原讨论不存在。');parentId=parent.id;featureId=parent.featureId;}
  else {
   if(input.featureId)featureId=feature(document,input.featureId).id;
   if(Array.isArray(input.anchors)){if(input.anchors.length>24)throw new ApiError(400,'请选择较短的文字片段。');const edits=await db.prepare('SELECT block_id AS blockId,text,version FROM edits').all<Edit>();
    anchors=input.anchors.map((a:Anchor)=>{if(!document.blocks[a.blockId]||typeof a.quote!=='string'||!a.quote.length||a.quote.length>5000||!Number.isInteger(a.start)||!Number.isInteger(a.end)||a.start<0||a.end<=a.start||typeof a.prefix!=='string'||typeof a.suffix!=='string')throw new ApiError(400,'划线位置不正确，请重新选择。');const e=edits.results.find(e=>e.blockId===a.blockId);const text=e?.text??document.blocks[a.blockId].text;if((e?.version??0)!==a.version||text.slice(a.start,a.end)!==a.quote)throw new ApiError(409,'选中文字已被修订，请重新划线后提交。');return {blockId:a.blockId,start:a.start,end:a.end,quote:a.quote,prefix:a.prefix.slice(-40),suffix:a.suffix.slice(0,40),version:a.version};});
   }
   if(!featureId&&!anchors.length)throw new ApiError(400,'请先选择文字或功能。');
  }
  await db.prepare('INSERT INTO comments(id,parent_id,feature_id,author_id,body,anchors,resolved,resolved_by,created_at,updated_at) VALUES(?,?,?,?,?,?,0,NULL,?,?)').bind(crypto.randomUUID(),parentId,featureId,person.id,body,JSON.stringify(anchors),now,now).run();return;
 }
 if(input.op==='resolve'){
  const result=await db.prepare('UPDATE comments SET resolved=?,resolved_by=?,updated_at=? WHERE id=? AND parent_id IS NULL').bind(input.resolved?1:0,input.resolved?person.id:null,now,string(input.id,100)).run();if(!result.meta.changes)throw new ApiError(404,'讨论不存在。');return;
 }
 if(input.op==='comment-edit'){
  const result=await db.prepare('UPDATE comments SET body=?,updated_at=? WHERE id=? AND author_id=?').bind(string(input.body),now,string(input.id,100),person.id).run();if(!result.meta.changes)throw new ApiError(403,'只能修改本人发表的评论。');return;
 }
 throw new ApiError(400,'暂不支持此操作。');
}

import type {Anchor,Feature,Review,ReviewDocument,Edit} from './types';
export function contentHash(text:string):string{let h=14695981039346656037n;for(let i=0;i<text.length;i++){h^=BigInt(text.charCodeAt(i));h=BigInt.asUintN(64,h*1099511628211n);}return h.toString(16);}
export function locateAnchor(text:string,a:Anchor):{start:number;end:number}|null{
 if(!a.quote)return null;
 if(text.slice(a.start,a.end)===a.quote)return {start:a.start,end:a.end};
 const matches:number[]=[];let from=0;
 while(from<=text.length){const at=text.indexOf(a.quote,from);if(at<0)break;matches.push(at);from=at+1;}
 if(matches.length===1)return {start:matches[0],end:matches[0]+a.quote.length};
 const exact=matches.filter(at=>(!a.prefix||text.slice(Math.max(0,at-a.prefix.length),at)===a.prefix)&&(!a.suffix||text.slice(at+a.quote.length,at+a.quote.length+a.suffix.length)===a.suffix));
 return exact.length===1?{start:exact[0],end:exact[0]+a.quote.length}:null;
}
export function effectiveStatus(review:Review|undefined,hash:string):string{if(!review||review.status==='pending')return 'pending';return review.contentHash===hash?review.status:'stale';}
export function featureHash(f:Feature,doc:ReviewDocument,edits:Edit[]):string{const map=new Map(edits.map(e=>[e.blockId,e.text]));return contentHash([f.name,f.detail,f.rule].map(id=>map.get(id)??doc.blocks[id].text).join('\u0000'));}
export function highlightSegments(text:string,ranges:{start:number;end:number;id:string}[]):{text:string;ids:string[]}[]{
 const valid=ranges.filter(r=>r.start>=0&&r.end<=text.length&&r.start<r.end);
 const points=[...new Set([0,text.length,...valid.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b);
 return points.slice(0,-1).map((start,i)=>({text:text.slice(start,points[i+1]),ids:valid.filter(r=>r.start<=start&&r.end>=points[i+1]).map(r=>r.id)}));
}

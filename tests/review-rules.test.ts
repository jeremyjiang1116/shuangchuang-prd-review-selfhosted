import assert from 'node:assert/strict';
import {test} from 'node:test';
import {contentHash,locateAnchor,effectiveStatus,highlightSegments} from '../lib/review-rules.ts';
import type {Anchor,Review} from '../lib/types.ts';
const a:Anchor={blockId:'a',start:2,end:6,quote:'导师复核',prefix:'提交',suffix:'后归档',version:0};
test('修改正文后原确认必须需复核',()=>{const old=contentHash('提交后归档');const next=contentHash('导师复核后归档');assert.notEqual(old,next);assert.equal(effectiveStatus({status:'approved',contentHash:old} as Review,next),'stale');});
test('原位置及插入文字后的引用能精确定位',()=>{assert.deepEqual(locateAnchor('提交导师复核后归档',a),{start:2,end:6});assert.deepEqual(locateAnchor('团队提交导师复核后归档',a),{start:4,end:8});});
test('引用删除或重复歧义时不错误标注',()=>{assert.equal(locateAnchor('完成后归档',a),null);assert.equal(locateAnchor('导师复核或导师复核',{...a,start:99,end:103,prefix:'',suffix:''}),null);});
test('重叠标注保留所有讨论且不重复文本',()=>{const seg=highlightSegments('abcdef',[{start:1,end:4,id:'a'},{start:3,end:5,id:'b'}]);assert.equal(seg.map(x=>x.text).join(''),'abcdef');assert(seg.some(x=>x.text==='d'&&x.ids.includes('a')&&x.ids.includes('b')));});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('快照完整导入、重复启动不覆盖、失败事务回滚、备份可恢复',async()=>{
 const storage=await import('../lib/sqlite.ts').catch(()=>null);
 const lifecycle=await import('../scripts/database.mjs').catch(()=>null);
 assert.ok(storage&&lifecycle,'需要独立 SQLite 存储与导入实现');
 const dir=mkdtempSync(join(tmpdir(),'prd-storage-')),path=join(dir,'review.sqlite');
 try{
  const seed=JSON.parse(readFileSync('seed/reviews.json','utf8'));
  assert.equal(lifecycle.initializeDatabase(path).initialized,true);
  const db=storage.openStore(path);
  for(const [table,rows] of Object.entries(seed.tables)){
   const actual=(await db.prepare('SELECT * FROM '+table).all()).results;
   const stable=values=>values.map(r=>JSON.stringify(Object.keys(r).sort().map(k=>[k,r[k]]))).sort();
   assert.deepEqual(stable(actual),stable(rows),table+' 逐行一致');
  }
  const p=seed.tables.people[0];
  await db.prepare('UPDATE people SET name=? WHERE id=?').bind('本地后续修订',p.id).run();
  assert.equal(lifecycle.initializeDatabase(path).initialized,false);
  assert.equal((await db.prepare('SELECT name FROM people WHERE id=?').bind(p.id).first()).name,'本地后续修订');
  await assert.rejects(db.batch([db.prepare('UPDATE people SET name=? WHERE id=?').bind('不应落库',p.id),db.prepare('INSERT INTO people(id,name,name_key,created_at) VALUES(?,?,?,?)').bind(p.id,'冲突','conflict','now')]));
  assert.equal((await db.prepare('SELECT name FROM people WHERE id=?').bind(p.id).first()).name,'本地后续修订');
  const backup=join(dir,'backup.sqlite');await lifecycle.backupDatabase(path,backup);
  const restored=storage.openStore(backup);
  assert.equal((await restored.prepare('SELECT name FROM people WHERE id=?').bind(p.id).first()).name,'本地后续修订');
  assert.equal((await restored.prepare('PRAGMA integrity_check').first()).integrity_check,'ok');
  restored.close();db.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('损坏快照整体回滚，修复快照后可重新初始化',async()=>{
 const {initializeDatabase}=await import('../scripts/database.mjs');
 const dir=mkdtempSync(join(tmpdir(),'prd-import-'));
 try{const snapshot=JSON.parse(readFileSync('seed/reviews.json','utf8'));delete snapshot.tables.comments[0].body;const bad=join(dir,'bad.json');writeFileSync(bad,JSON.stringify(snapshot));const path=join(dir,'test.sqlite');assert.throws(()=>initializeDatabase(path,bad),/字段不完整/);assert.equal(initializeDatabase(path).initialized,true);}finally{rmSync(dir,{recursive:true,force:true});}
});

test('恢复脚本可在新服务器目录恢复经过校验的备份',async()=>{
 const {initializeDatabase,backupDatabase}=await import('../scripts/database.mjs');
 const {openStore}=await import('../lib/sqlite.ts');const dir=mkdtempSync(join(tmpdir(),'prd-restore-'));
 try{const source=join(dir,'source.sqlite'),backup=join(dir,'backup.sqlite'),target=join(dir,'new-server','data','review.sqlite');initializeDatabase(source);await backupDatabase(source,backup);const result=spawnSync(process.execPath,['scripts/restore.mjs',backup,'--confirm-stopped'],{encoding:'utf8',env:{...process.env,DATABASE_PATH:target}});assert.equal(result.status,0,result.stderr);const db=openStore(target);assert.equal((await db.prepare('SELECT count(*) AS n FROM people').first()).n,5);db.close();}finally{rmSync(dir,{recursive:true,force:true});}
});

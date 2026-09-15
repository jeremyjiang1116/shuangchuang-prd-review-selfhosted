import {DatabaseSync,backup} from 'node:sqlite';
import {readFileSync,mkdirSync,chmodSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const tableNames=['people','comments','edits','reviews','revisions'];
export function initializeDatabase(path,seedFile=resolve('seed/reviews.json'),schemaFile=resolve('db/schema.sql')){
 mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 try{
  db.exec('BEGIN IMMEDIATE');
  const version=db.prepare('PRAGMA user_version').get().user_version;
  if(version===1){db.exec('COMMIT');return {initialized:false};}
  if(version!==0||db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().length)throw new Error('拒绝覆盖已有或版本不匹配的数据库。');
  const raw=readFileSync(seedFile,'utf8'),seed=JSON.parse(raw);
  if(seed.formatVersion!==1||Object.keys(seed.tables).sort().join(',')!==[...tableNames].sort().join(','))throw new Error('快照格式不匹配。');
  db.exec(readFileSync(schemaFile,'utf8'));
  for(const table of tableNames){
   const columns=db.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name);
   const insert=db.prepare('INSERT INTO '+table+' ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
   for(const row of seed.tables[table]){
    if(Object.keys(row).sort().join(',')!==[...columns].sort().join(','))throw new Error(table+' 快照字段不完整。');
    insert.run(...columns.map(c=>row[c]));
   }
  }
  db.exec('CREATE TABLE import_metadata (id INTEGER PRIMARY KEY, captured_at TEXT NOT NULL, sha256 TEXT NOT NULL);');
  db.prepare('INSERT INTO import_metadata VALUES(1,?,?)').run(seed.capturedAt,createHash('sha256').update(raw).digest('hex'));
  db.exec('PRAGMA user_version=1; COMMIT;');chmodSync(path,0o600);
  return {initialized:true,capturedAt:seed.capturedAt,counts:Object.fromEntries(tableNames.map(t=>[t,seed.tables[t].length]))};
 }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}finally{db.close();}
}
export async function backupDatabase(source,destination){
 if(!existsSync(source))throw new Error('数据库不存在。');
 if(existsSync(destination))throw new Error('备份目标已存在，请使用新文件名。');
 mkdirSync(dirname(destination),{recursive:true,mode:0o700});
 const db=new DatabaseSync(source,{readOnly:true});
 try{await backup(db,destination);chmodSync(destination,0o600);}finally{db.close();}
}

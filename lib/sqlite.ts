import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

type Result<T=Record<string,unknown>>={results:T[];meta:{changes:number}};
class Statement {
 private db:DatabaseSync;private sql:string;private args:SQLInputValue[];
 constructor(db:DatabaseSync,sql:string,args:SQLInputValue[]=[]){this.db=db;this.sql=sql;this.args=args;}
 bind(...args:SQLInputValue[]){return new Statement(this.db,this.sql,args);}
 execute<T=Record<string,unknown>>():Result<T>{
  const prepared=this.db.prepare(this.sql);
  if(prepared.columns().length)return {results:prepared.all(...this.args) as T[],meta:{changes:0}};
  return {results:[],meta:{changes:Number(prepared.run(...this.args).changes)}};
 }
 async all<T=Record<string,unknown>>(){return this.execute<T>();}
 async first<T=Record<string,unknown>>():Promise<T|null>{return this.execute<T>().results[0]??null;}
 async run(){return this.execute();}
}
export function openStore(path:string){
 const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 return {
  prepare:(sql:string)=>new Statement(db,sql),
  async batch(statements:Statement[]){db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}},
  close:()=>db.close()
 };
}
const globalStore=globalThis as typeof globalThis&{prdDatabase?:ReturnType<typeof openStore>};
export function database(){
 if(!globalStore.prdDatabase){const path=resolve(process.env.DATABASE_PATH||'data/review.sqlite');if(!existsSync(path))throw new Error('数据库未初始化，请先运行 npm run db:init。');globalStore.prdDatabase=openStore(path);}
 return globalStore.prdDatabase;
}

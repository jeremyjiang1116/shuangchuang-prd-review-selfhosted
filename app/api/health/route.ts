import {database} from '@/lib/sqlite';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){try{await database().prepare('SELECT 1').first();return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}});}}

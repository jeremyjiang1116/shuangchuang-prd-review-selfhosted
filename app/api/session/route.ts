import {apiFailure,currentPerson,login,logoutCookie,requestBody,sameOrigin} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({person:await currentPerson()},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{const r=await login(request,await requestBody(request));return Response.json({person:r.person},{headers:{'Set-Cookie':r.cookie,'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
export async function DELETE(request:Request){try{sameOrigin(request);return Response.json({ok:true},{headers:{'Set-Cookie':logoutCookie(),'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}

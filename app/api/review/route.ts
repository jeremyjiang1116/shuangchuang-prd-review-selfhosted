import {apiFailure,requirePerson,requestBody,sameOrigin} from '@/lib/access';
import {mutate,readState,requestEdition} from '@/lib/review-store';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await requirePerson();return Response.json(await readState(requestEdition(request)),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{sameOrigin(request);const p=await requirePerson();await mutate(p,await requestBody(request),requestEdition(request));return Response.json(await readState(requestEdition(request)),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}

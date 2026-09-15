import {apiFailure,requirePerson} from '@/lib/access';
import {documentForEdition,requestEdition} from '@/lib/review-store';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{await requirePerson();return Response.json(documentForEdition(requestEdition(request)),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}

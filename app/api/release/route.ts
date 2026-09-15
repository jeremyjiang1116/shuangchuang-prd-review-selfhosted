import {apiFailure,requirePerson} from '@/lib/access';
import {releaseData} from '@/lib/review-store';
export const dynamic='force-dynamic';
export async function GET(){try{await requirePerson();const {document:_,...release}=releaseData;return Response.json(release,{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}

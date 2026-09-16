import { PublicBooking } from '../../../../components/booking';
export default async function Page({params}:{params:Promise<{slug:string}>}){return <PublicBooking slug={(await params).slug}/>;}

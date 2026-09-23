import { LanguageProvider } from '../../../../components/shared';
import { PublicBooking } from '../../../../components/booking';
export default async function Page({params}:{params:Promise<{slug:string}>}){return <LanguageProvider><PublicBooking slug={(await params).slug}/></LanguageProvider>;}

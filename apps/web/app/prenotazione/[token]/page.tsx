import { LanguageProvider } from '../../../components/shared';
import { Cancellation } from '../../../components/cancellation';
export default async function Page({params}:{params:Promise<{token:string}>}){return <LanguageProvider><Cancellation token={(await params).token}/></LanguageProvider>;}

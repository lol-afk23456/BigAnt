import { Cancellation } from '../../../components/cancellation';
export default async function Page({params}:{params:Promise<{token:string}>}){return <Cancellation token={(await params).token}/>;}

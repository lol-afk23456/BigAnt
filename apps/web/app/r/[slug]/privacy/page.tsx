import { notFound } from 'next/navigation';
import { slugParam } from '@bigant/types';
import { PublicPrivacy } from '../../../../components/privacy';
export default async function Page({params}:{params:Promise<{slug:string}>}){const data=slugParam.safeParse(await params);if(!data.success)notFound();return <PublicPrivacy slug={data.data.slug}/>;}

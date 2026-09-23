import { LanguageProvider } from '../../../components/shared';
import { VenueHome } from '../../../components/venue-entry';
import { slugParam } from '@bigant/types';
import { notFound } from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!slugParam.safeParse({slug}).success)notFound();return <LanguageProvider><VenueHome slug={slug}/></LanguageProvider>;}

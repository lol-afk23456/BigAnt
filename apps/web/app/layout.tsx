import './globals.css';
import { uiMessages } from '@bigant/i18n';
import type { ReactNode } from 'react';
import { LanguageProvider } from '../components/shared';
export const metadata={title:uiMessages.it.brand,icons:{icon:'/icons/icon-192.png',apple:'/icons/icon-192.png'}};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="it"><body><LanguageProvider>{children}</LanguageProvider></body></html>;}

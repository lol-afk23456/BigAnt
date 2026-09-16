import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedDemo,demos } from './fixtures.js';
const url=new URL(process.env.DATABASE_URL??'');
if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(url.hostname)||!['/bigant','/bigant_test'].includes(url.pathname)||!process.argv.includes('--confirm'))throw new Error('Solo demo locale: ripeti con --confirm per cancellare e ricreare i due locali demo.');
const db=new PrismaClient({log:[]});
try{
 await db.tenant.deleteMany({where:{slug:{in:demos.map(d=>d.slug)}}});
 await seedDemo(db);
 process.stdout.write('Due locali demo ricreati con prenotazioni relative a oggi. Dati delle prove precedenti rimossi.\n');
}finally{await db.$disconnect();}

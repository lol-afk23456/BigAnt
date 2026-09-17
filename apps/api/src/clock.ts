// Solo gli scenari browser possono fissare l’ora, su un database isolato e senza invii reali.
export function serverClock(env:Readonly<Record<string,string|undefined>>) {
 if(!env.BIGANT_TEST_CLOCK)return ()=>new Date();
 if(env.NODE_ENV!=='test'||env.NOTIFICATION_MODE!=='demo'||!new URL(env.DATABASE_URL??'http://invalid').pathname.endsWith('_test'))throw new Error('TEST_CLOCK_FORBIDDEN');
 const base=Date.parse(env.BIGANT_TEST_CLOCK);if(!Number.isFinite(base))throw new Error('INVALID_TEST_CLOCK');
 const started=Date.now();return ()=>new Date(base+Date.now()-started);
}

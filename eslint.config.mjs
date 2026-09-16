import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['**/node_modules/**','**/.next/**','**/dist/**','**/next-env.d.ts','.local/**','.pnpm-store/**','playwright-report/**','test-results/**'] },js.configs.recommended,...ts.configs.recommended,{ rules: { 'no-console':'error' } },{files:['apps/**/*.ts','apps/**/*.tsx'],rules:{'no-restricted-imports':['error',{paths:[{name:'@prisma/client',message:'Usare il data layer @bigant/database.'}]}]}});

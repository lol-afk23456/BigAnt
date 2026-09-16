import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
config({quiet:true});
const database=process.env.TEST_DATABASE_URL??'postgresql://bigant:bigant_local@127.0.0.1:55432/bigant_test?schema=public';
process.env.TEST_DATABASE_URL=database;
export default defineConfig({
 timeout:120000,expect:{timeout:10000},testDir:'./tests/e2e',testMatch:'**/*.spec.ts',globalSetup:'./tests/e2e/setup.ts',workers:1,
 use:{actionTimeout:15000,channel:process.platform==='darwin'?'chrome':undefined,baseURL:'http://localhost:3100',viewport:{width:375,height:812},timezoneId:'America/New_York',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:[
  {command:'node apps/api/dist/server.js',url:'http://127.0.0.1:3001/health',reuseExistingServer:false,timeout:60000,env:{DATABASE_URL:database,JWT_SECRET:'e2e-test-secret-with-at-least-32-characters',PORT:'3001',HOST:'127.0.0.1',MENU_IMAGE_DIR:process.cwd()+'/.local/menu-images-e2e'}},
  {command:'pnpm --filter @bigant/web start --port 3100 --hostname localhost',url:'http://localhost:3100',reuseExistingServer:false,timeout:60000,env:{API_INTERNAL_URL:'http://127.0.0.1:3001'}},
 ],
});

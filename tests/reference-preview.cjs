/* Isolated UI fixtures: no real accounts, uploads, messages, or database writes.
   Run with node tests/ui-smoke.cjs. Set PLAYWRIGHT_MODULE / EDGE_PATH if needed. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Kyle Benj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(os.tmpdir(),'scholaria-product-review');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});const runtimeErrors=[];page.on('pageerror',e=>runtimeErrors.push(e.message));
await page.route('**/*',r=>{if(!r.request().url().startsWith(origin))return r.abort();if(r.request().url().includes('/js/core/auth.js'))return r.fulfill({contentType:'text/javascript',body:`let ROLE='student';let CURRENT_PROFILE={id:'ui-preview',full_name:'Alexandra Marie Santos-Reyes',role:'student',strand:'STEM',grade_level:'Grade 11',section:'Section A'};const API_BASE=location.origin;const db={channel:()=>{const c={on:()=>c,subscribe:()=>c};return c;},auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,insert:async()=>({error:null}),then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};return q;}};`});return r.continue();});
await page.goto(origin+'/dashboard.html');await page.evaluate(()=>{
window.uiOriginalQuizLoader=loadQuizzesFromDB;
loadMaterialsFromDB=async()=>{};loadQuizzesFromDB=async()=>{};loadUsersFromDB=async()=>{};loadClassRecAttempts=async()=>{};loadChatsPage=()=>{};
customQuizzes=[{id:'review',title:'Cell Biology: Foundations and Scientific Investigation',subject:'General Biology 1',dueDate:'2026-08-01T10:00:00Z'},{id:'overdue',title:'Functions and Graphs: Extended Practice Assessment',subject:'General Mathematics',dueDate:'2020-01-02T10:00:00Z'},{id:'future',title:'Interactive Vocabulary Challenge',subject:'English for Academic and Professional Purposes',type:'interactive',dueDate:'2030-10-15T10:00:00Z'},{id:'undated',title:'Self-paced practice with no deadline',subject:'General Biology 1'}].map(q=>({type:'standard',status:'active',createdAt:'2026-08-01T00:00:00Z',questions:[{type:'multiple_choice',question:'Which answer matches A?',options:['A','B'],answer:'A'}],...q}));
myQuizAttempts=[{id:'attempt',quiz_id:'review',student_id:CURRENT_PROFILE.id,student_name:CURRENT_PROFILE.full_name,score:1,total_items:1,score_percentage:100,quiz_title:customQuizzes[0].title,answers:[],submitted_at:'2026-08-01T00:00:00Z'}];
localStorage.setItem('scholaria_all_attempts_v1',JSON.stringify(myQuizAttempts));
materialsData=[{id:'resource-real',title:'Introduction to Biology: Extended Laboratory Reading',subject:'General Biology 1',status:'approved',strand:'STEM',created_at:'2026-08-01T00:00:00Z'}];
saveAnnouncements([{id:'actual-announcement',title:'Laboratory preparation',message:'Bring your activity sheet to the next class.',audience:['All Students'],category:'academic',timestamp:'2026-08-01T00:00:00Z'}]);
});

await page.evaluate(()=>{ROLE='student';CURRENT_PROFILE.role='student';initDashboardShell();renderPage('dashboard');closeNewsAlertModal();});
const results=[];
for(const width of [1280,390,320]){
 await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);await page.evaluate(()=>closeNewsAlertModal());
 const result=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,sidebar:getComputedStyle(document.querySelector('.sidebar')).backgroundImage,hero:!!document.querySelector('.student-hero-banner'),text:document.querySelector('#mainContent').textContent}));
 assert(result.hero);assert(result.text.includes('Recent News'));assert(result.text.includes('Assessment Overview'));assert(result.text.includes('My Enrolled Subjects'));assert(!result.sidebar.includes('none'));
 await page.screenshot({path:path.join(out,'reference-dashboard-'+width+'.png'),fullPage:true});delete result.text;results.push(result);
}
console.log(JSON.stringify({results,runtimeErrors,out},null,2));assert.equal(runtimeErrors.length,0);assert(!results.some(r=>r.overflow));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});


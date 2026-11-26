import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Exercise the real game logic without a browser; this is not visual browser QA.
const elements=new Map(),storage=new Map();
const context2d=new Proxy({measureText:text=>({width:String(text).length*7})},{get:(target,key)=>target[key]??(()=>{})});
function element(selector){
  if(elements.has(selector))return elements.get(selector);
  const classes=new Set();
  const value={textContent:'',innerHTML:'',value:'',width:0,height:0,open:false,
    classList:{toggle(name,flag){if(flag===undefined)flag=!classes.has(name);if(flag)classes.add(name);else classes.delete(name);},add:name=>classes.add(name),remove:name=>classes.delete(name)},
    addEventListener(){},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},
    getContext:()=>context2d,getBoundingClientRect:()=>({width:1000,height:740,left:0,top:0})};
  elements.set(selector,value);return value;
}
const sandbox={console,Intl,Date,Math,JSON,Map,Set,Path2D:class{rect(){}ellipse(){}},crypto:webcrypto,
  setTimeout:()=>1,clearTimeout(){},performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame(){},matchMedia:()=>({matches:true}),
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
  window:{devicePixelRatio:1,addEventListener(){}},
  document:{hidden:false,querySelector:element,querySelectorAll:()=>[],createElement:()=>element(`canvas-${elements.size}`),addEventListener(){},activeElement:{tagName:'CANVAS'}}};
const scope=vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('./dist/app.js',import.meta.url),'utf8'),scope);
const run=code=>vm.runInContext(code,scope);

assert.equal(elements.get('#header-name').textContent,'새봄');
assert.equal(run('walkable(533,449)'),false,'Fountain must block movement');
assert.equal(run('walkable(461,240)'),false,'Library must block movement');
assert.equal(run('walkable(907,632)'),false,'Pond must block movement');
assert.equal(run('walkable(-1,580)'),false,'World edges must block movement');

for(const [x,y] of [[747,358],[810,470],[651,635],[237,396],[345,490],[705,575]]){
  run(`player.x=515;player.y=580;keys.clear();planPath(${x},${y});`);
  assert.ok(run('path.length')>0,`Route must exist to ${x},${y}`);
  assert.ok(run('path.every(p=>walkable(p.x,p.y))'),'Route must avoid blocked cells');
  for(let i=0;i<750 && run('path.length');i++)run('update(.04,1000)');
  assert.ok(run(`Math.hypot(player.x-${x},player.y-${y})`)<30,'Route must arrive at its destination');
}
run("state.quest.status='active';state.quest.leaves=[];");
for(let i=0;i<3;i++)run(`player.x=leaves[${i}].x;player.y=leaves[${i}].y;update(0,1000);interact();`);
assert.equal(run('state.quest.leaves.length'),3,'All three quest items must be collectible');
run('update(0,1000);interact();');
assert.equal(run('state.quest.leaves.length'),3,'Quest items cannot be collected twice');

run("state.profile.name='테스트 학생';state.profile.stats.magic=23;save();");
assert.equal(run('readState().profile.name'),'테스트 학생','Character must survive a storage round trip');
assert.equal(run('readState().profile.stats.magic'),23,'Stats must survive a storage round trip');
run("addMessage('<img src=x onerror=alert(1)>','speech');");
assert.ok(elements.get('#chat-feed').innerHTML.includes('&lt;img'),'Chat content must be escaped');
assert.ok(!elements.get('#chat-feed').innerHTML.includes('<img'),'User content cannot inject HTML');
for(let i=0;i<105;i++)run("addMessage('대사','speech');");
assert.equal(run('state.messages.length'),100,'Chat history is bounded');
run('render(1000)');
storage.set('lumen-school-v1','{broken json');
assert.equal(run('readState().profile.name'),'새봄','Corrupt storage must recover safely');
console.log('PASS: startup, obstacle avoidance, six walking routes, quest collection, persistence, escaping, bounded chat, render code, storage recovery.');

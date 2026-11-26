'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY = 'lumen-school-v1';
const STAT_NAMES = {magic:'마력',knowledge:'지식',stamina:'체력',spirit:'정신력'};
const defaults = () => ({profile:{name:'새봄',house:'별무리 기숙사',year:'1',bio:'낯선 복도와 오래된 책 냄새를 좋아하는 신입생. 아직은 모든 것이 조금 서툴다.',stats:{magic:10,knowledge:10,stamina:10,spirit:10}},position:{x:515,y:580},relations:[],history:[],messages:[],quest:{status:'available',leaves:[]},eventJoined:false});
function readState(){
  const base = defaults();
  try{
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!stored || typeof stored !== 'object') return base;
    const p = stored.profile || {};
    for(const key of ['name','house','year','bio']) if(typeof p[key] === 'string') base.profile[key] = p[key].slice(0,key === 'bio' ? 500 : 30);
    for(const key of Object.keys(STAT_NAMES)) if(Number.isInteger(p.stats?.[key]) && p.stats[key]>=0 && p.stats[key]<=999) base.profile.stats[key]=p.stats[key];
    if(stored.position && Number.isFinite(stored.position.x) && Number.isFinite(stored.position.y)) base.position=stored.position;
    for(const key of ['relations','history','messages']) if(Array.isArray(stored[key])) base[key]=stored[key].filter(x=>x && typeof x === 'object').slice(-100);
    if(['available','active','complete'].includes(stored.quest?.status)) base.quest={status:stored.quest.status,leaves:[...new Set((stored.quest.leaves || []).filter(x=>[0,1,2].includes(x)))]};
    base.eventJoined=stored.eventJoined === true;
  }catch{ /* A blocked or empty storage still allows a temporary play session. */ }
  return base;
}
const state = readState();
let storageFailed=false;
function save(){
  state.position={x:player.x,y:player.y};
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  catch{if(!storageFailed){storageFailed=true;toast('이 브라우저에서는 저장할 수 없어, 이번 접속에서만 기록이 유지돼요.');}}
}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3600);}
const npcs=[
  {id:'mira',name:'미라',house:'달그늘 기숙사',year:'2',bio:'학교 정원에 가장 먼저 도착하고 가장 늦게 돌아가는 학생. 작은 약초 수첩을 늘 가지고 다닌다.',stats:{magic:14,knowledge:18,stamina:9,spirit:12},x:345,y:455,hair:'#88634f',robe:'#a481ab',line:'처음 보는 얼굴이네. 반가워! 온실에 달빛잎이 필요하대. 정원 게시판을 한번 봐 줄래?'},
  {id:'leon',name:'리온',house:'별무리 기숙사',year:'2',bio:'분수 소리를 들으며 책을 읽는 것을 좋아한다. 말수는 적지만 길을 물으면 꽤 자세하게 알려 준다.',stats:{magic:16,knowledge:15,stamina:12,spirit:14},x:705,y:540,hair:'#d8c29b',robe:'#7885a0',line:'여기는 조용해서 좋아. 도서관은 저쪽, 파란 지붕 건물이야. 네 이야기는 네 캐릭터 시트에 적어 두면 돼.'}
];

// The world is drawn with original canvas shapes; no game engine or external assets.
const W=1120,H=820;
const canvas=$('#world'),ctx=canvas.getContext('2d');
const map=document.createElement('canvas');map.width=W;map.height=H;
const g=map.getContext('2d');
let seed=27;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
function poly(points,c){g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
function ellipse(x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function outline(x,y,w,h,c,width=2){g.strokeStyle=c;g.lineWidth=width;g.strokeRect(x,y,w,h);}
function bush(x,y,s=1){g.save();g.translate(x,y);g.scale(s,s);ellipse(2,10,30,13,'#7e99664a');rect(-24,-14,48,22,'#7f9c67');rect(-30,-9,60,22,'#88a572');rect(-22,-22,40,30,'#8fae77');rect(-15,-25,23,5,'#9db982');for(let i=0;i<9;i++)rect(-22+random()*40,-17+random()*20,4,3,random()>.5?'#b2c58a':'#76995e');g.restore();}
function tree(x,y,s=1,tone=0){g.save();g.translate(x,y);g.scale(s,s);ellipse(8,14,51,20,'#788c5740');rect(-7,-33,14,48,'#978367');rect(-3,-37,5,49,'#b19b76');const colors=tone?['#8c9c68','#a6b57a','#b4c38a']:['#779c6a','#8aaa75','#9ab981'];poly([[-41,-32],[-50,-51],[-40,-83],[-25,-83],[-25,-103],[9,-113],[32,-95],[40,-72],[53,-59],[43,-33],[24,-21],[-19,-21]],colors[0]);poly([[-36,-60],[-34,-82],[-17,-84],[-17,-101],[8,-104],[29,-89],[32,-71],[41,-61],[26,-38],[-15,-37]],colors[1]);rect(-20,-83,12,6,colors[2]);rect(-28,-63,8,4,colors[2]);rect(2,-95,13,5,colors[2]);rect(17,-63,12,5,colors[2]);g.restore();}
function flowers(x,y,color='#eee4a9'){for(let i=0;i<7;i++){const a=random()*Math.PI*2,r=random()*21;const fx=Math.round(x+Math.cos(a)*r),fy=Math.round(y+Math.sin(a)*r);rect(fx,fy,2,6,'#91a475');rect(fx-2,fy-2,6,3,color);rect(fx,fy-4,2,7,color);rect(fx,fy-1,2,2,'#d7b975');}}
function bench(x,y){ellipse(x+3,y+15,38,9,'#8b956b35');rect(x-29,y+4,5,16,'#756e61');rect(x+24,y+4,5,16,'#756e61');rect(x-35,y-11,70,7,'#a58a67');rect(x-35,y-2,70,7,'#b69b76');rect(x-35,y+9,70,8,'#c1a883');rect(x-34,y+9,68,3,'#cfb991');rect(x-37,y-6,4,21,'#796d5d');rect(x+33,y-6,4,21,'#796d5d');}
function lamp(x,y){ellipse(x+4,y+8,12,5,'#89926730');rect(x-3,y-47,6,54,'#77786a');rect(x-7,y+4,14,5,'#878677');rect(x-9,y-62,18,17,'#7c7b6e');rect(x-6,y-59,12,11,'#f0df9e');poly([[x-13,y-62],[x,y-73],[x+13,y-62]],'#6c7269');rect(x-1,y-75,2,5,'#6c7269');}
function windowAt(x,y){rect(x,y,31,43,'#958b83');rect(x+3,y+3,25,35,'#eeddb4');rect(x+5,y+5,21,31,'#d2bb90');rect(x+5,y+5,10,30,'#e8d5a9');rect(x+14,y+3,3,35,'#b8aa98');rect(x+3,y+19,25,3,'#b8aa98');rect(x-3,y+40,37,5,'#c6b9a2');}
function drawMap(){
  rect(0,0,W,H,'#cbdab0');
  for(let i=0;i<5300;i++){const x=Math.floor(random()*W/3)*3,y=Math.floor(random()*H/3)*3;rect(x,y,random()>.8?6:3,2,['#c0d1a5','#d7e2bc','#baca9f','#c4d5a9'][i%4]);}
  // Stone garden wall and distant trees.
  rect(0,65,W,35,'#b1ba9f');rect(0,63,W,8,'#ced0b6');rect(0,73,W,2,'#e2dec4');
  for(let x=0;x<W;x+=40){outline(x,82,39,17,'#a3ae94',1);rect(x+1,65,36,6,'#d9d7bf');}
  for(const [x,y,s,t] of [[34,58,1.35,0],[135,57,1.1,1],[1037,65,1.3,0],[1111,75,1.5,1],[900,55,1.3,0],[761,52,1.05,1]])tree(x,y,s,t);
  // Paving uses a clipped union of garden paths.
  const path=new Path2D();path.rect(84,401,980,108);path.rect(446,265,162,555);path.rect(737,280,138,211);path.ellipse(532,453,169,121,0,0,Math.PI*2);
  g.save();g.clip(path);rect(0,0,W,H,'#c9c4a7');
  for(let row=0;row<30;row++)for(let col=0;col<37;col++){const x=col*35+(row%2)*17,y=row*27;rect(x+1,y+1,33,25,['#d8d2b8','#d4cfb3','#ded8c0','#d0cbb0'][Math.floor(random()*4)]);rect(x+3,y+3,29,1,'#e5dfc8');if(random()>.75)rect(x+10,y+17,10,1,'#c9c3a7');}
  g.restore();
  // The old library.
  ellipse(464,304,238,30,'#73855c27');rect(255,164,413,139,'#c6baa3');rect(264,178,394,116,'#e9dec6');rect(264,266,394,28,'#d9ceb7');rect(264,292,394,10,'#b7ad96');
  for(let y=185;y<289;y+=19){rect(264,y,394,1,'#d0c6b05c');for(let x=270+(y%2)*15;x<650;x+=54)rect(x,y,1,18,'#d0c6b06b');}
  rect(270,175,12,120,'#d2c5ad');rect(635,175,12,120,'#d2c5ad');
  for(const x of [294,350,545,602])windowAt(x,214);
  rect(428,218,69,80,'#b0a38d');poly([[428,231],[428,213],[443,198],[482,198],[497,213],[497,231]],'#b0a38d');rect(434,223,57,72,'#756d77');poly([[434,227],[434,216],[446,205],[479,205],[491,216],[491,227]],'#817887');rect(440,228,45,65,'#9b8f94');rect(461,225,3,70,'#7f7581');rect(453,259,3,7,'#d3b779');rect(472,259,3,7,'#d3b779');
  rect(413,298,101,8,'#d2c6ae');rect(403,306,122,7,'#ddd2ba');rect(394,313,140,7,'#e2d8c2');
  poly([[232,182],[278,101],[633,101],[688,182]],'#77788a');poly([[239,169],[278,93],[635,93],[681,169]],'#7a7d91');poly([[242,165],[280,94],[455,94],[455,165]],'#85889d');
  for(let y=105;y<162;y+=12){rect(269-(y-105)*.49,y,375+(y-105)*.95,2,'#696d84');for(let x=280+(y%24?10:0);x<640;x+=25)rect(x,y+3,1,9,'#a5a6b336');}
  rect(232,169,456,9,'#b3aa9d');rect(232,177,456,6,'#9e968f');rect(232,168,456,2,'#d2c5af');
  // Clock tower.
  rect(419,75,84,90,'#d3c8b3');rect(426,81,70,79,'#e4dac5');poly([[411,83],[460,30],[510,83]],'#636d87');poly([[418,78],[460,35],[460,78]],'#7b839c');rect(410,82,101,6,'#aaa08e');rect(458,19,4,17,'#ada079');ellipse(460,111,21,21,'#b8aa90');ellipse(460,111,17,17,'#f3ead2');g.strokeStyle='#999082';g.lineWidth=2;g.beginPath();g.moveTo(460,99);g.lineTo(460,111);g.lineTo(469,116);g.stroke();rect(452,140,16,20,'#a8a5a3');
  // Glass greenhouse.
  ellipse(835,308,111,19,'#73855c20');rect(754,208,169,99,'#a2b5a0');rect(758,216,161,80,'#bdd1b4');poly([[745,215],[788,150],[886,150],[930,215]],'#91b3a3');poly([[752,210],[791,155],[883,155],[923,210]],'#bfd0b1');
  for(let x=773;x<921;x+=28){rect(x,215,3,83,'#8da696');g.strokeStyle='#8da696';g.lineWidth=3;g.beginPath();g.moveTo(x,210);g.lineTo(791+(x-756)*.55,155);g.stroke();}
  rect(753,245,172,3,'#8da696');rect(745,210,185,6,'#7f9e90');rect(752,298,172,10,'#b7b8a0');bush(780,283,.6);bush(896,282,.65);rect(815,239,39,61,'#829c8e');rect(819,243,31,54,'#c9d5b8');rect(833,243,3,54,'#8aa394');rect(819,262,31,3,'#8aa394');rect(841,277,3,5,'#a89870');rect(807,307,55,6,'#d8cdb4');
  // Fountain basin, with water animated in the foreground.
  ellipse(539,486,79,28,'#7f896c2c');ellipse(533,458,75,50,'#a4ad9a');rect(459,440,149,15,'#a4ad9a');ellipse(533,440,75,46,'#d4d6be');ellipse(533,435,63,36,'#a4bdb3');ellipse(533,435,57,30,'#b4c9be');ellipse(533,435,46,23,'#c2d5c5');g.strokeStyle='#d9e7d0';g.lineWidth=2;g.beginPath();g.ellipse(533,435,43,21,0,0,Math.PI*2);g.stroke();rect(525,396,16,46,'#b7c0ad');ellipse(533,442,18,7,'#d7dcc3');ellipse(533,400,27,10,'#cbd0b8');ellipse(533,395,29,10,'#dce0c8');rect(529,377,8,18,'#c3cbb4');ellipse(533,377,9,5,'#e2e4c9');
  // Reflecting pond.
  ellipse(907,640,91,59,'#bbc5a3');ellipse(907,635,84,53,'#a8b9a0');ellipse(907,630,77,46,'#92b4aa');ellipse(907,627,70,39,'#a4c5b3');for(let i=0;i<12;i++)rect(858+random()*100,605+random()*45,13+random()*12,2,'#c4dcc0');ellipse(879,626,9,4,'#7fa17b');ellipse(925,644,11,5,'#8aaa7d');flowers(950,667,'#e6cbd4');
  // Notice board.
  rect(210,336,6,58,'#9d8a6a');rect(257,336,6,58,'#9d8a6a');rect(201,325,71,48,'#9a8266');rect(206,330,61,37,'#b49c78');poly([[196,326],[236,303],[277,326]],'#7e8477');rect(215,335,17,24,'#f0e7cc');rect(238,333,21,19,'#e5dec3');rect(242,337,13,2,'#b6a791');rect(218,340,10,2,'#baa791');rect(218,345,10,1,'#c7b59d');
  // Furniture and planted borders.
  bench(345,546);bench(687,413);bench(746,647);
  for(const [x,y] of [[140,397],[658,342],[1009,412],[405,650],[645,743]])lamp(x,y);
  for(const [x,y,s] of [[170,277,.95],[226,282,.9],[693,288,.9],[112,554,1.1],[174,568,1],[340,683,1.1],[990,327,1],[1020,542,1.1],[714,721,1.1],[839,725,1]])bush(x,y,s);
  for(const [x,y,c] of [[170,307,'#e9d9ab'],[698,305,'#e5c8cd'],[138,585,'#eee1ba'],[325,707,'#dbcfeb'],[1010,348,'#ead6b7'],[736,741,'#f0e3b4'],[641,592,'#e9cfd4'],[970,566,'#e5d2e9']])flowers(x,y,c);
  for(const [x,y,s,t] of [[65,288,1.2,0],[103,220,1.1,1],[1024,236,1.2,1],[1097,353,1.1,0],[74,638,1.35,0],[211,734,1.2,1],[60,815,1.4,0],[1012,805,1.45,0],[1117,685,1.5,1],[397,821,1,0],[747,830,1.1,1]])tree(x,y,s,t);
  // Small fallen petals.
  for(let i=0;i<43;i++){const x=100+random()*950,y=300+random()*450;if(random()>.5)rect(x,y,3,2,'#eadbd4');}
}
drawMap();

const obstacles=[{x:240,y:95,w:447,h:213},{x:748,y:150,w:180,h:162},{x:196,y:305,w:82,h:70},{x:312,y:531,w:68,h:28},{x:650,y:402,w:74,h:24},{x:710,y:634,w:74,h:29}];
function walkable(x,y){return x>34 && x<W-34 && y>110 && y<H-35 && !obstacles.some(o=>x>o.x-10 && x<o.x+o.w+10 && y>o.y-8 && y<o.y+o.h+8) && Math.hypot((x-533)/1.08,y-449)>62 && Math.hypot((x-907)/1.5,y-632)>44;}
const player={x:state.position.x,y:state.position.y,dir:'down',moving:false};
if(!walkable(player.x,player.y)){player.x=515;player.y=580;}
const leaves=[{x:747,y:358},{x:810,y:470},{x:651,y:635}];
const points=[{id:'board',x:237,y:396,label:'정원 게시판 읽기'},{id:'library',x:461,y:335,label:'도서관 안내 보기'},{id:'greenhouse',x:836,y:332,label:'온실 살펴보기'},...npcs.map(n=>({...n,label:`${n.name}에게 말 걸기`}))];
let path=[],keys=new Set(),mode='speech',activePanel=null,nearby=null,bubble=null,lastFrame=0,frame=0,viewport={w:1,h:1,s:1,x:0,y:0};
let clickMarker=null,saveTimer;
const dialog=$('#panel-dialog');
const dateFormat=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'});
const timeFormat=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'});
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,250);}
function planPath(tx,ty){
  const step=20,cols=Math.ceil(W/step),rows=Math.ceil(H/step),cell=(x,y)=>`${x},${y}`;
  const start={x:Math.round(player.x/step),y:Math.round(player.y/step)};
  let end={x:Math.round(tx/step),y:Math.round(ty/step)};
  if(!walkable(end.x*step,end.y*step)){
    let best=null,dist=Infinity;
    for(let ox=-4;ox<=4;ox++)for(let oy=-4;oy<=4;oy++){const x=end.x+ox,y=end.y+oy,d=Math.hypot(x*step-tx,y*step-ty);if(walkable(x*step,y*step)&&d<dist){best={x,y};dist=d;}}
    if(!best)return;end=best;
  }
  const queue=[start],visited=new Map([[cell(start.x,start.y),null]]);let found=false;
  for(let head=0;head<queue.length;head++){
    const p=queue[head];if(p.x===end.x && p.y===end.y){found=true;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=p.x+dx,ny=p.y+dy,k=cell(nx,ny);if(nx<0||nx>=cols||ny<0||ny>=rows||visited.has(k)||!walkable(nx*step,ny*step))continue;visited.set(k,p);queue.push({x:nx,y:ny});}
  }
  if(!found){toast('그곳까지는 갈 수 없어요. 가까운 길을 눌러 주세요.');return;}
  const result=[];let current=end;
  while(current){result.push({x:current.x*step,y:current.y*step});current=visited.get(cell(current.x,current.y));}
  path=result.reverse();if(path.length && Math.hypot(path[0].x-player.x,path[0].y-player.y)<6)path.shift();
  clickMarker={x:end.x*step,y:end.y*step,until:performance.now()+1300};
}
function sprite(x,y,{robe='#737d9f',hair='#5e515e',name='',self=false,moving=false,dir='down'}={},t=0){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  const walk=moving?Math.sin(t*12)*2:0;
  ctx.fillStyle='#596b4e30';ctx.beginPath();ctx.ellipse(0,4,14,6,0,0,Math.PI*2);ctx.fill();
  const r=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(a,b,w,h);};
  r(-7,0+walk,5,8,'#665f65');r(3,0-walk,5,8,'#665f65');
  r(-10,-17,20,20,robe);r(-12,-12,24,12,robe);r(-7,-17,14,20,robe);r(-6,-15,3,17,'#ffffff24');r(-2,-16,4,17,'#d5c79e');r(-12,-10,4,9,'#c8b09a');r(9,-10,4,9,'#e0c5a5');
  r(-9,-35,18,17,hair);r(-12,-31,24,13,hair);r(-8,-29,16,14,'#ecd1ad');r(-10,-35,20,8,hair);r(-11,-31,5,14,hair);r(7,-31,4,16,hair);
  if(dir!=='up'){r(-4,-24,2,3,'#5a555d');r(4,-24,2,3,'#5a555d');r(-1,-19,3,1,'#c39c89');}else r(-8,-30,16,12,hair);
  if(self){r(-4,-41,8,3,'#f0dfb2');r(-1,-44,3,9,'#f0dfb2');}
  if(name){ctx.font='11px "Noto Sans KR",sans-serif';const text=name+(self?' · 나':'');const width=ctx.measureText(text).width+18;ctx.fillStyle=self?'#6d6585e8':'#fffef6e8';roundRect(ctx,-width/2,15,width,23,5);ctx.fillStyle=self?'#fff':'#6e7663';ctx.textAlign='center';ctx.fillText(text,0,30);}
  ctx.restore();
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function worldLabel(text,x,y){ctx.save();ctx.font='11px "Noto Sans KR",sans-serif';const width=ctx.measureText(text).width+22;ctx.fillStyle='#fffef0d9';roundRect(ctx,x-width/2,y-16,width,25,5);ctx.fillStyle='#7a7c66';ctx.textAlign='center';ctx.fillText(text,x,y+1);ctx.restore();}
function update(dt,now){
  if(dialog.open){keys.clear();player.moving=false;return;}
  const oldX=player.x,oldY=player.y;
  let dx=(keys.has('right')?1:0)-(keys.has('left')?1:0),dy=(keys.has('down')?1:0)-(keys.has('up')?1:0);
  if(dx||dy){path=[];const n=Math.hypot(dx,dy);dx/=n;dy/=n;}
  else if(path.length){const dest=path[0],distance=Math.hypot(dest.x-player.x,dest.y-player.y);if(distance<3){player.x=dest.x;player.y=dest.y;path.shift();if(!path.length)scheduleSave();}else{dx=(dest.x-player.x)/distance;dy=(dest.y-player.y)/distance;}}
  const speed=Math.min(140*dt,path.length?Math.hypot(path[0].x-player.x,path[0].y-player.y):Infinity);
  if(walkable(player.x+dx*speed,player.y))player.x+=dx*speed;
  if(walkable(player.x,player.y+dy*speed))player.y+=dy*speed;
  player.moving=Math.hypot(player.x-oldX,player.y-oldY)>.01;
  if(player.moving){player.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
  else if(path.length && (dx||dy)){path=[];scheduleSave();}
  let options=points;
  if(state.quest.status==='active')options=[...points,...leaves.map((l,i)=>({...l,id:`leaf-${i}`,label:'달빛잎 채집하기'})).filter((_,i)=>!state.quest.leaves.includes(i))];
  const target=options.reduce((best,p)=>Math.hypot(p.x-player.x,p.y-player.y)<Math.hypot(best.x-player.x,best.y-player.y)?p:best,options[0]);
  const next=Math.hypot(target.x-player.x,target.y-player.y)<65?target:null;
  if(nearby?.id!==next?.id){nearby=next;$('#interaction').classList.toggle('hidden',!nearby);if(nearby)$('#interaction').innerHTML=`<kbd>E</kbd>${escapeHTML(nearby.label)}`;}
}
function render(now){
  const {width,height}=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  const s=Math.max(width/W,height/H),ox=Math.min(0,Math.max(width-W*s,width/2-player.x*s)),oy=(height-H*s)/2;
  viewport={w:width,h:height,s,x:ox,y:oy};ctx.save();ctx.translate(ox,oy);ctx.scale(s,s);ctx.drawImage(map,0,0);
  // Moving water, falling light, and available quest items.
  ctx.strokeStyle='#e1edd6aa';ctx.lineWidth=2;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(533,432,19+((now/140+i*11)%32),7+((now/250+i*5)%13),0,0,Math.PI*2);ctx.stroke();}
  ctx.strokeStyle='#d9e9d1';ctx.beginPath();ctx.moveTo(533,371);ctx.quadraticCurveTo(522+Math.sin(now/550)*2,378,526,392);ctx.moveTo(534,373);ctx.quadraticCurveTo(543,378,541,392);ctx.stroke();
  worldLabel('오래된 도서관',460,344);worldLabel('유리 온실',837,343);
  if(state.quest.status!=='complete'){ctx.fillStyle='#f9e9b6';roundRect(ctx,227,274+Math.sin(now/400)*3,21,27,5);ctx.fillStyle='#a18b5e';ctx.font='bold 17px Georgia';ctx.textAlign='center';ctx.fillText('!',237,294+Math.sin(now/400)*3);}
  for(let i=0;i<leaves.length;i++){
    if(state.quest.leaves.includes(i))continue;const {x,y}=leaves[i];ctx.save();ctx.translate(x,y);ctx.globalAlpha=state.quest.status==='active'?1:.55;ctx.fillStyle='#7a9c69';ctx.fillRect(-1,-12,3,17);ctx.fillRect(-10,-13,10,6);ctx.fillRect(1,-20,10,7);ctx.fillRect(-7,-19,7,7);ctx.fillStyle='#d7e2a9';ctx.fillRect(-6,-17,3,3);ctx.fillRect(5,-18,3,3);if(state.quest.status==='active'){ctx.fillStyle='#fff0b9';const b=Math.sin(now/400+i);ctx.fillRect(-12, -25+b*3,3,3);ctx.fillRect(12,-6-b*3,2,2);}ctx.restore();
  }
  if(clickMarker && clickMarker.until>now){ctx.strokeStyle='#fbfff1aa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(clickMarker.x,clickMarker.y,13,6,0,0,Math.PI*2);ctx.stroke();}
  const characters=[...npcs.map(n=>({x:n.x,y:n.y,data:{...n,self:false}})),{x:player.x,y:player.y,data:{name:state.profile.name,self:true,dir:player.dir,moving:player.moving}}].sort((a,b)=>a.y-b.y);
  for(const c of characters)sprite(c.x,c.y,c.data,now/1000);
  if(bubble && bubble.until>now){const text=bubble.text.length>28?bubble.text.slice(0,28)+'…':bubble.text;ctx.font='12px "Noto Sans KR",sans-serif';const bw=ctx.measureText(text).width+24;ctx.fillStyle='#fffffff5';roundRect(ctx,player.x-bw/2,player.y-87,bw,30,8);ctx.beginPath();ctx.moveTo(player.x-4,player.y-57);ctx.lineTo(player.x+4,player.y-57);ctx.lineTo(player.x,player.y-51);ctx.fill();ctx.fillStyle='#786780';ctx.textAlign='center';ctx.fillText(text,player.x,player.y-67);}
  // Subtle drifting pollen.
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(let i=0;i<12;i++){const x=(i*113+now*.006)%W,y=(i*73+Math.sin(now/1700+i)*9+160)%H;ctx.fillStyle='#fffae4a8';ctx.fillRect(x,y,2,2);}
  ctx.restore();
}
function animate(now){const dt=Math.min((now-lastFrame)/1000||0,.04);lastFrame=now;update(dt,now);render(now);frame=requestAnimationFrame(animate);}

function refreshIdentity(){const p=state.profile;$('#header-name').textContent=p.name;$('#footer-name').textContent=p.name;$('#footer-house').textContent=`${p.house} · ${p.year}학년`;renderPeople();}
function renderPeople(){
  $('#people-view').innerHTML=`<p class="people-intro">현재는 내 캐릭터와 안내 캐릭터 두 명이 있는 체험 공간이에요.</p><button class="person-row" data-panel="profile"><span class="portrait">✦</span><span><strong>${escapeHTML(state.profile.name)}</strong><small>${escapeHTML(state.profile.house)}</small></span><span class="person-type">나</span></button>${npcs.map(n=>`<button class="person-row" data-npc="${n.id}"><span class="portrait" style="background:${n.id==='mira'?'#f1e6ed':'#e9edf4'};color:${n.robe}">${n.name[0]}</span><span><strong>${n.name}</strong><small>${n.house}</small></span><span class="person-type">안내</span></button>`).join('')}`;
}
function chatHTML(m){
  if(m.kind==='system')return `<div class="message system"><span>${escapeHTML(m.text)}</span></div>`;
  const name=String(m.name||state.profile.name),label=m.npc?'<span class="message-tag">안내 캐릭터</span>':'';
  return `<div class="message ${m.kind==='action'?'action':''}"><span class="message-avatar">${escapeHTML(name[0]||'✦')}</span><div class="message-body"><div class="message-meta"><span class="message-name">${escapeHTML(name)}</span>${label}<time>${Number.isFinite(m.time)?timeFormat.format(m.time):''}</time></div><p class="message-text">${escapeHTML(m.text)}</p></div></div>`;
}
function renderChat(){
  const feed=$('#chat-feed');feed.innerHTML=`<div class="date-divider">${dateFormat.format(Date.now())} · 새로운 이야기</div><div class="welcome-card"><span class="welcome-star">✧</span><strong>루멘에 온 걸 환영해요.</strong><p>조금 서툴러도 괜찮아요.<br>이곳의 이야기는 당신에게서 시작돼요.</p><button data-panel="profile">내 캐릭터 소개하기</button></div>${state.messages.map(chatHTML).join('')}`;feed.scrollTop=feed.scrollHeight;
}
function addMessage(text,kind='system',npc=null){state.messages.push({text,kind,name:npc?.name||state.profile.name,npc:!!npc,time:Date.now()});state.messages=state.messages.slice(-100);renderChat();save();}
function refreshQuest(){
  const {status,leaves:collected}=state.quest;
  $('#quest-caption').textContent=status==='complete'?'완료한 작은 이야기':'오늘의 작은 부탁';
  $('#quest-title').textContent=status==='complete'?'온실에 달빛잎을 전했어요':'온실에 달빛잎이 필요해요';
  $('#quest-progress-label').textContent=status==='available'?'게시판에서 이야기 확인하기':status==='complete'?'성장은 캐릭터 시트에 직접 기록해요':`달빛잎 모으기 ${collected.length} / 3`;
  $('#quest-dot').classList.toggle('hidden',status==='complete');
}
function interact(){
  if(!nearby)return;const id=nearby.id;
  if(id.startsWith('leaf-')){const i=Number(id.slice(5));if(state.quest.status!=='active'||state.quest.leaves.includes(i))return;state.quest.leaves.push(i);save();refreshQuest();toast(`달빛잎을 모았어요. ${state.quest.leaves.length} / 3`);if(state.quest.leaves.length===3)addMessage('달빛잎을 모두 모았다. 퀘스트 창에서 온실에 전달할 수 있다.');nearby=null;$('#interaction').classList.add('hidden');return;}
  if(id==='board'){openPanel('quests');return;}
  if(id==='library'){toast('오래된 도서관은 아직 준비 중이에요. 지금은 정원을 둘러볼 수 있어요.');return;}
  if(id==='greenhouse'){if(state.quest.status==='active' && state.quest.leaves.length===3){openPanel('quests');}else toast('유리 너머로 작은 약초들이 보인다. 게시판에 온실의 부탁이 걸려 있다.');return;}
  const n=npcs.find(n=>n.id===id);if(n){addMessage(n.line,'speech',n);toast(`${n.name}의 안내 대사를 대화창에 남겼어요.`);}
}

function showDialog(content,eyebrow,panel){
  path=[];keys.clear();activePanel=panel;$('#panel-content').innerHTML=content;$('#panel-eyebrow').textContent=eyebrow;if(!dialog.open)dialog.showModal();
  $$('.rail-button[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===panel));$('#map-button').classList.toggle('active',panel==='help'||panel==='npc');
}
function statsHTML(stats,editable=false){return `<div class="stats-grid">${Object.entries(STAT_NAMES).map(([key,label])=>`<div class="stat-cell"><label for="stat-${key}">${label}</label><input id="stat-${key}" name="${key}" aria-label="${label}" type="number" min="0" max="999" step="1" value="${stats[key]}" ${editable?'required':'disabled'}></div>`).join('')}</div>`;}
function openPanel(panel,extra){
  if(panel==='profile'){
    const p=state.profile;
    showDialog(`<div class="profile-hero"><span class="portrait">✦</span><div><h2 id="panel-title">나의 캐릭터 시트</h2><p>우리의 이야기에 첫 문장을 써 보세요.</p></div></div><form id="profile-form"><div class="field-pair"><label class="field">이름<input name="name" required maxlength="24" value="${escapeHTML(p.name)}"></label><label class="field">학년<select name="year">${['1','2','3','4','5','6'].map(y=>`<option ${p.year===y?'selected':''}>${y}</option>`).join('')}</select></label></div><label class="field">소속<input name="house" maxlength="30" required value="${escapeHTML(p.house)}"></label><label class="field">캐릭터 소개<textarea name="bio" maxlength="500">${escapeHTML(p.bio)}</textarea></label><div class="section-label">능력치 <span>캐릭터 주인이 직접 관리해요</span></div>${statsHTML(p.stats,true)}<label class="field" style="margin-top:18px">스탯 변경 사유 <input name="reason" maxlength="120" placeholder="예: 온실 퀘스트를 마치고 마력이 성장했다"></label><p class="small-note">퀘스트를 완료해도 수치는 자동으로 오르지 않아요. 스탯을 바꾸면 변경 사유와 함께 기록돼요.</p><div class="button-row"><button class="primary-button" type="submit">캐릭터 시트 저장</button></div></form><div class="section-label">성장 기록 <span>${state.history.length}개의 기록</span></div><div class="history-list">${state.history.length?state.history.slice(-8).reverse().map(h=>`<div class="history-item"><strong>${escapeHTML(h.change)}</strong><br>${escapeHTML(h.reason)}<br><span>${Number.isFinite(h.time)?dateFormat.format(h.time):''}</span></div>`).join(''):'<p class="small-note">아직 성장 기록이 없어요. 천천히 나만의 이야기를 쌓아 가요.</p>'}</div>`,'CHARACTER SHEET','profile');
    $('#profile-form').addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const data=new FormData(form),stats={},changes=[];
      for(const key of Object.keys(STAT_NAMES)){stats[key]=Number(data.get(key));if(!Number.isInteger(stats[key])||stats[key]<0||stats[key]>999)return toast('능력치는 0부터 999까지의 정수로 입력해 주세요.');if(stats[key]!==p.stats[key])changes.push(`${STAT_NAMES[key]} ${p.stats[key]} → ${stats[key]}`);}
      const name=data.get('name').trim(),house=data.get('house').trim(),reason=data.get('reason').trim();
      if(!name||!house)return toast('캐릭터 이름과 소속을 적어 주세요.');
      if(changes.length&&!reason){form.elements.reason.setCustomValidity('스탯을 바꾼 이유를 짧게 적어 주세요.');form.elements.reason.reportValidity();form.elements.reason.addEventListener('input',()=>form.elements.reason.setCustomValidity(''),{once:true});return;}
      if(changes.length)state.history.push({change:changes.join(' · '),reason,time:Date.now()});state.history=state.history.slice(-100);
      state.profile={name,house,year:data.get('year'),bio:data.get('bio').trim(),stats};save();refreshIdentity();openPanel('profile');toast('캐릭터 시트를 저장했어요.');
    });
  }else if(panel==='quests'){
    const q=state.quest;
    showDialog(`<h2 class="panel-title" id="panel-title">정원 게시판</h2><p class="panel-subtitle">작은 부탁 하나가 새로운 이야기의 시작이 되기도 하죠.</p><article class="quest-card"><div class="quest-card-header"><span class="quest-icon"><svg><use href="#i-leaf"/></svg></span><div><h3>온실의 작은 부탁</h3><small>정원 탐색 · 혼자서도 할 수 있어요</small></div></div><p>“오늘따라 달빛잎이 부족하네요. 정원에 자란 달빛잎 세 포기를 찾아 주실래요? 잎 끝에서 작은 빛이 반짝일 거예요.”<br>— 온실 관리인</p><div class="quest-task"><span class="task-check ${q.status!=='available'?'done':''}">${q.status!=='available'?'✓':''}</span>게시판에서 부탁 받아 두기</div><div class="quest-task"><span class="task-check ${q.leaves.length===3?'done':''}">${q.leaves.length===3?'✓':''}</span>정원에서 달빛잎 모으기 (${q.leaves.length}/3)</div><div class="quest-task"><span class="task-check ${q.status==='complete'?'done':''}">${q.status==='complete'?'✓':''}</span>달빛잎을 온실에 전달하기</div><div class="button-row">${q.status==='available'?'<button class="primary-button" id="accept-quest">부탁 받아 두기</button>':q.status==='complete'?'<span class="quest-status">이야기 완료</span>':q.leaves.length===3?'<button class="primary-button" id="complete-quest">달빛잎 전달하기</button>':'<button class="secondary-button" id="continue-quest">정원에서 찾아보기</button>'}</div></article><p class="small-note">달빛잎 가까이에서 E를 누르거나 화면의 상호작용 버튼을 눌러 채집해요. 완료 후 성장은 캐릭터 시트에 직접 기록해 주세요.</p><div class="section-label">학교의 다음 이야기</div><article class="event-card"><span class="event-eyebrow">SAMPLE EVENT · 이벤트 예시</span><h3>별이 가까워지는 밤</h3><p>친구들과 정원에 모여 별자리를 찾는 작은 관측회.<br>이런 방식으로 운영자가 정기 이벤트를 올릴 수 있어요.</p><button class="secondary-button" id="event-join">${state.eventJoined?'관심 표시 취소':'관심 있는 이야기로 표시'}</button><p class="small-note">이 표시는 이 브라우저에만 저장돼요. 실제 일정과 모집은 아직 없어요.</p></article>`,'QUESTS & LITTLE MOMENTS','quests');
    $('#accept-quest')?.addEventListener('click',()=>{state.quest.status='active';save();refreshQuest();closePanel();addMessage('온실의 작은 부탁을 받았다. 반짝이는 달빛잎 세 포기를 찾아보자.');toast('작은 잎사귀의 반짝임을 찾아 보세요.');});
    $('#continue-quest')?.addEventListener('click',closePanel);
    $('#complete-quest')?.addEventListener('click',()=>{state.quest.status='complete';save();refreshQuest();openPanel('quests');addMessage('온실에 달빛잎을 전달했다. 온실 관리인이 고맙다는 인사를 건넸다.');toast('첫 번째 이야기를 마쳤어요! 성장은 시트에 직접 기록해 주세요.');});
    $('#event-join').addEventListener('click',()=>{state.eventJoined=!state.eventJoined;save();openPanel('quests');});
  }else if(panel==='relations'){
    const edit=state.relations.find(r=>r.id===extra);
    showDialog(`<h2 class="panel-title" id="panel-title">우리 사이의 이야기</h2><p class="panel-subtitle">같은 만남도 서로에게는 다른 이야기일 수 있어요.<br>이 관계도에는 내 캐릭터의 시선을 기록해요.</p>${state.relations.length?state.relations.map(r=>`<article class="relation-card"><h3><span class="relation-name">${escapeHTML(r.name)}</span><span class="relation-kind">${escapeHTML(r.kind)}</span></h3><p>${escapeHTML(r.note||'아직 적어 두지 않은 이야기.')}</p><div class="relation-tools"><button class="text-button" data-edit-relation="${escapeHTML(r.id)}">수정</button><button class="text-button" data-delete-relation="${escapeHTML(r.id)}">삭제</button></div></article>`).join(''):'<div class="empty-state"><span>✧</span>아직 연결된 이야기가 없어요.<br>기억하고 싶은 만남을 하나 남겨 볼까요?</div>'}<form id="relation-form" class="relation-form"><div class="section-label">${edit?'관계 수정':'새로운 관계 기록'}</div><div class="field-pair"><label class="field">상대 캐릭터 이름<input name="name" required maxlength="24" value="${escapeHTML(edit?.name||'')}" placeholder="예: 미라"></label><label class="field">나에게 어떤 사이인가요?<input name="kind" required maxlength="24" value="${escapeHTML(edit?.kind||'')}" placeholder="예: 정원에서 만난 선배"></label></div><label class="field">함께한 일 · 상대를 향한 생각<textarea name="note" maxlength="500" placeholder="처음 학교에 온 날, 온실에 가는 길을 알려 주었다.">${escapeHTML(edit?.note||'')}</textarea></label><div class="button-row">${edit?'<button class="secondary-button" type="button" data-panel="relations">수정 취소</button>':''}<button class="primary-button" type="submit">${edit?'수정 내용 저장':'관계 기록 남기기'}</button></div></form>`,'RELATIONSHIP JOURNAL','relations');
    $('#relation-form').addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget),name=data.get('name').trim(),kind=data.get('kind').trim();if(!name||!kind)return toast('상대 이름과 관계를 적어 주세요.');if(!edit&&state.relations.length>=50)return toast('이 체험 버전에서는 관계를 50개까지 기록할 수 있어요.');const entry={id:edit?.id||crypto.randomUUID(),name,kind,note:data.get('note').trim()};if(edit)state.relations[state.relations.indexOf(edit)]=entry;else state.relations.push(entry);save();openPanel('relations');toast('관계에 새 이야기를 남겼어요.');});
  }else if(panel==='npc'){
    const n=npcs.find(n=>n.id===extra);if(!n)return;
    showDialog(`<div class="profile-hero"><span class="portrait">${n.name[0]}</span><div><h2 id="panel-title">${n.name}</h2><p>${n.house} · ${n.year}학년 · 안내 캐릭터</p></div></div><p class="panel-subtitle">${n.bio}</p>${statsHTML(n.stats)}<div class="info-strip">${n.line}</div><p class="small-note">이 캐릭터는 조작을 안내하는 예시 인물이에요. 실제 접속한 이용자가 아니에요.</p><div class="button-row"><button class="secondary-button" id="walk-to-npc">가까이 다가가기</button><button class="primary-button" id="record-npc">관계 기록하기</button></div>`,'SOMEONE IN THE GARDEN','npc');
    $('#walk-to-npc').addEventListener('click',()=>{closePanel();planPath(n.x,n.y+35);});
    $('#record-npc').addEventListener('click',()=>{openPanel('relations');$('#relation-form').elements.name.value=n.name;$('#relation-form').elements.kind.focus();});
  }else{
    showDialog(`<h2 class="panel-title" id="panel-title">처음 만나는 루멘</h2><p class="panel-subtitle">맵을 돌아다니고, 캐릭터의 말로 이야기를 남겨 보세요.</p><ul class="help-list"><li><strong>이동</strong> · 방향키 / WASD, 또는 바닥 클릭. 모바일에서는 이동 버튼도 쓸 수 있어요.</li><li><strong>상호작용</strong> · 게시판, 달빛잎, 안내 캐릭터 가까이에서 E 또는 화면에 나타난 버튼을 눌러요.</li><li><strong>역할극</strong> · 대사와 행동 묘사를 골라 입력해요. Enter로 전송, Shift + Enter로 줄을 바꿔요.</li><li><strong>캐릭터</strong> · 이름·설정·능력치를 직접 수정해요. 스탯 변경 사유는 성장 기록에 남아요.</li><li><strong>관계도</strong> · 상대와의 관계와 함께한 일을 내 시점에서 적어 둬요.</li></ul><div class="info-strip">지금은 브라우저 체험 버전이에요. 대화와 캐릭터 기록은 이 기기에만 저장되고, 실시간 접속·회원가입·친구 초대는 아직 연결되지 않았어요. 브라우저 데이터를 지우면 기록도 사라져요.</div><div class="button-row"><button class="primary-button" id="start-exploring">정원 둘러보기</button></div>`,'A LITTLE GUIDE','help');
    $('#start-exploring').addEventListener('click',closePanel);
  }
}
function closePanel(){if(dialog.open)dialog.close();}
dialog.addEventListener('close',()=>{activePanel=null;$$('.rail-button').forEach(b=>b.classList.toggle('active',b.id==='map-button'));canvas.focus({preventScroll:true});});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel();}});
document.addEventListener('click',event=>{
  const panel=event.target.closest('[data-panel]');if(panel)openPanel(panel.dataset.panel);
  const npc=event.target.closest('[data-npc]');if(npc)openPanel('npc',npc.dataset.npc);
  const edit=event.target.closest('[data-edit-relation]');if(edit)openPanel('relations',edit.dataset.editRelation);
  const remove=event.target.closest('[data-delete-relation]');if(remove){state.relations=state.relations.filter(r=>r.id!==remove.dataset.deleteRelation);save();openPanel('relations');toast('관계 기록을 삭제했어요.');}
});
$('#close-panel').addEventListener('click',closePanel);$('#help-button').addEventListener('click',()=>openPanel('help'));$('#map-button').addEventListener('click',()=>{closePanel();canvas.focus();});
$('#interaction').addEventListener('click',interact);
$('#center-button').addEventListener('click',()=>{path=[];keys.clear();player.x=515;player.y=580;save();canvas.focus({preventScroll:true});toast('정원 중앙으로 돌아왔어요.');});
$('#chat-tab').addEventListener('click',()=>selectChatTab(false));$('#people-tab').addEventListener('click',()=>selectChatTab(true));
function selectChatTab(people){$('#people-view').classList.toggle('hidden',!people);$('#chat-view').classList.toggle('hidden',people);$('#people-tab').classList.toggle('selected',people);$('#chat-tab').classList.toggle('selected',!people);$('#people-tab').setAttribute('aria-selected',String(people));$('#chat-tab').setAttribute('aria-selected',String(!people));}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(el=>el.classList.toggle('selected',el===b));$('#chat-input').placeholder=mode==='action'?'캐릭터의 행동을 묘사해 주세요…':'캐릭터의 이야기를 들려주세요…';$('#chat-input').focus();}));
$('#chat-form').addEventListener('submit',event=>{event.preventDefault();const input=$('#chat-input'),text=input.value.trim();if(!text)return;addMessage(text,mode);input.value='';bubble={text:mode==='action'?`(${text})`:text,until:performance.now()+5000};});
$('#chat-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#chat-form').requestSubmit();}});
canvas.addEventListener('pointerdown',event=>{if(dialog.open)return;canvas.focus({preventScroll:true});const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left-viewport.x)/viewport.s,y=(event.clientY-r.top-viewport.y)/viewport.s;const n=npcs.find(n=>Math.abs(x-n.x)<24 && y>n.y-43 && y<n.y+32);if(n){openPanel('npc',n.id);return;}if(Math.abs(x-player.x)<20 && y>player.y-43 && y<player.y+30){openPanel('profile');return;}planPath(x,y);});
const keyMap={w:'up',a:'left',s:'down',d:'right',arrowup:'up',arrowleft:'left',arrowdown:'down',arrowright:'right'};
document.addEventListener('keydown',event=>{if(dialog.open||event.ctrlKey||event.metaKey||event.altKey||/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName))return;const key=event.key.toLowerCase();if(keyMap[key]){event.preventDefault();keys.add(keyMap[key]);}if(key==='e'&&!event.repeat){event.preventDefault();interact();}if(key==='enter'&&document.activeElement===canvas){event.preventDefault();$('#chat-input').focus();}});
document.addEventListener('keyup',event=>{const key=keyMap[event.key.toLowerCase()];if(key){keys.delete(key);scheduleSave();}});
window.addEventListener('blur',()=>{keys.clear();scheduleSave();});
$$('[data-move]').forEach(b=>{b.addEventListener('pointerdown',event=>{event.preventDefault();b.setPointerCapture(event.pointerId);keys.add(b.dataset.move);});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>{keys.delete(b.dataset.move);scheduleSave();});});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();cancelAnimationFrame(frame);save();}else{lastFrame=0;frame=requestAnimationFrame(animate);}});
refreshIdentity();refreshQuest();renderChat();frame=requestAnimationFrame(animate);

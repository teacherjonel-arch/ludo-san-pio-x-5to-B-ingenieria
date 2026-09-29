const path=require('path');
const fs=require('fs');
const http=require('http');
const express=require('express');
const {Server}=require('socket.io');

const app=express();
const server=http.createServer(app);
const io=new Server(server);
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD='1234';
const DATA_FILE=path.join(__dirname,'data','questions.json');
const DATABASE_URL=process.env.DATABASE_URL||process.env.POSTGRES_URL||'';
let dbPool=null;

app.use(express.static(path.join(__dirname,'public')));

const route=[[6,1],[6,3],[6,5],[4,6],[2,6],[0,6],[0,8],[1,8],[3,8],[5,8],[6,10],[6,12],[6,14],[8,14],[8,13],[8,11],[8,9],[10,8],[12,8],[14,8],[14,6],[13,6],[11,6],[9,6],[8,4],[8,2],[8,0],[6,0]];
const starts=[0,7,14,21];
const cfg=[
  {name:'Álgebra',colorName:'Mantua',start:0,homes:[[2,2],[2,4],[4,2],[4,4]],lane:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]]},
  {name:'Aritmética',colorName:'Riese',start:7,homes:[[2,10],[2,12],[4,10],[4,12]],lane:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]]},
  {name:'Geometría',colorName:'Venecia',start:14,homes:[[10,10],[10,12],[12,10],[12,12]],lane:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]]},
  {name:'Trigonometría',colorName:'Treviso',start:21,homes:[[10,2],[10,4],[12,2],[12,4]],lane:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]}
];

function loadQuestions(){try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}catch{return {questionMapVersion:2,customCellQuestions:{},skillQuestions:[]};}}
let questions=loadQuestions();

async function initPersistence(){
  if(!DATABASE_URL){
    console.log('DATABASE_URL no configurada. Se usará data/questions.json durante esta ejecución.');
    return;
  }
  try{
    const {Pool}=require('pg');
    dbPool=new Pool({connectionString:DATABASE_URL,max:5});
    await dbPool.query(`CREATE TABLE IF NOT EXISTS ludo_questions (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const result=await dbPool.query('SELECT data FROM ludo_questions WHERE id=1');
    if(result.rows.length){
      questions=result.rows[0].data;
      fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
      fs.writeFileSync(DATA_FILE,JSON.stringify(questions,null,2),'utf8');
      console.log('Preguntas cargadas desde PostgreSQL.');
    }else{
      await dbPool.query('INSERT INTO ludo_questions(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING',[JSON.stringify(questions)]);
      console.log('Preguntas iniciales copiadas a PostgreSQL.');
    }
  }catch(error){
    dbPool=null;
    console.error('No se pudo conectar a PostgreSQL. Se usará el archivo local:',error.message);
  }
}

async function saveQuestions(q){
  questions=q;
  fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
  fs.writeFileSync(DATA_FILE,JSON.stringify(q,null,2),'utf8');
  if(dbPool){
    await dbPool.query(`INSERT INTO ludo_questions(id,data,updated_at) VALUES(1,$1::jsonb,NOW()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()`,[JSON.stringify(q)]);
  }
}
function cleanQuestions(q){
  if(!q||typeof q!=='object')return null;
  const out={questionMapVersion:2,customCellQuestions:{},skillQuestions:Array.isArray(q.skillQuestions)?q.skillQuestions.slice(0,4):[]};
  const src=q.customCellQuestions||{};
  for(const [k,v] of Object.entries(src)){
    if(!Array.isArray(v))continue;
    const cleanedBank=v.filter(item=>item&&typeof item.q==='string'&&Array.isArray(item.a)&&item.a.length===4).slice(0,4).map(item=>({q:item.q.slice(0,1000),a:item.a.slice(0,4).map(x=>String(x).slice(0,300)),ok:Math.max(0,Math.min(3,Number(item.ok)||0)),image:typeof item.image==='string'?item.image:''}));
    if(cleanedBank.length)out.customCellQuestions[k]=cleanedBank;
  }
  return out;
}

const rooms=new Map();
const makeCode=()=>{let c;do{c=Math.random().toString(36).slice(2,8).toUpperCase()}while(rooms.has(c));return c;};
function publicState(room){return {current:room.current,value:room.value,playerCount:room.playerCount,started:room.started,awaitingMove:room.awaitingMove,tokens:room.tokens,winner:room.winner,message:room.message};}
function roomInfo(room){return {code:room.code,playerCount:room.playerCount,started:room.started,host:room.host,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,team:p.team}))};}
function broadcastRoom(room){io.to(room.code).emit('roomInfo',roomInfo(room));io.to(room.code).emit('state',publicState(room));}
function legal(room,t){return t&&t.p===room.current&&room.value&&room.value>=1&&room.value<=6&&room.started&&!room.winner&&room.awaitingMove&&(t.pos<0?room.value===6:t.pos+room.value<=34);}
function spot(t){const p=t.p,pos=t.pos;if(pos<0)return cfg[p].homes[t.n];if(pos<28)return route[(cfg[p].start+pos)%28];if(pos<34)return cfg[p].lane[pos-28];return [7,7];}
function finishMove(room,t,six,correct){
  if(!correct)t.pos=room.pending?room.pending.oldPos:t.pos;
  // capture only on common route and only after a correct move.
  if(correct&&t.pos>=0&&t.pos<28){
    const cell=(cfg[t.p].start+t.pos)%28;
    if(!starts.includes(cell)){
      for(const other of room.tokens){if(other===t)continue;if(other.pos>=0&&other.pos<28&&((cfg[other.p].start+other.pos)%28)===cell)other.pos=-1;}
    }
  }
  if(correct&&t.pos===34){room.winner=t.p;room.message=`${room.playersByTeam[t.p]?.name||cfg[t.p].name} llegó a la meta.`;room.awaitingMove=false;room.value=null;return;}
  room.awaitingMove=false;room.value=null;
  if(six&&correct){room.message='¡Sacaste 6! Conservas el turno.';}
  else {room.current=(room.current+1)%room.playerCount;room.message=`Turno de ${room.playersByTeam[room.current]?.name||('Jugador '+(room.current+1))}.`;}
}
function askQuestion(room,t,oldPos,six){
  const isSkill=t.pos===34;
  const cell=isSkill?null:(cfg[t.p].start+t.pos)%28;
  const course=isSkill?null:Math.floor(cell/7);
  const localCell=isSkill?null:(cell-course*7);
  const bank=isSkill?room.questions.skillQuestions:room.questions.customCellQuestions[`${course}-${localCell}`];
  if(!bank||!bank.length){finishMove(room,t,six,true);broadcastRoom(room);return;}
  const item=bank[Math.floor(Math.random()*bank.length)];
  const q={id:Math.random().toString(36).slice(2),tag:isSkill?'Habilidad Matemática':cfg[course].name,q:item.q,a:item.a,image:item.image||'',team:t.p,tokenIndex:room.tokens.indexOf(t)};
  room.pending={...q,oldPos,six};
  // Todos los jugadores ven el mismo desafío; solo el dueño del turno puede resolverlo.
  io.to(room.code).emit('question',q);
}
function startRoom(room){room.started=true;room.current=0;room.value=null;room.awaitingMove=false;room.winner=null;room.tokens=[];for(let p=0;p<room.playerCount;p++)for(let n=0;n<4;n++)room.tokens.push({p,n,pos:-1});room.message=`¡Partida lista! Empieza ${room.playersByTeam[0]?.name||'Jugador 1'}.`;broadcastRoom(room);}

io.on('connection',socket=>{
  socket.on('adminLogin',({password}={})=>{if(String(password)===ADMIN_PASSWORD){socket.admin=true;socket.emit('adminLoginResult',{ok:true,questions});}else socket.emit('adminLoginResult',{ok:false,message:'Contraseña incorrecta.'});});
  socket.on('adminSaveQuestions',async({questions:q}={})=>{if(!socket.admin)return socket.emit('errorMessage','No tienes permisos de administrador.');const cleaned=cleanQuestions(q);if(!cleaned)return socket.emit('errorMessage','Preguntas inválidas.');try{await saveQuestions(cleaned);for(const room of rooms.values())room.questions=JSON.parse(JSON.stringify(cleaned));io.emit('questionsUpdated',{questions:cleaned});socket.emit('message','Preguntas guardadas online.');}catch(error){console.error(error);socket.emit('errorMessage','No se pudieron guardar las preguntas online.');}});
  socket.on('createRoom',({playerCount=2,name}={})=>{const count=Math.max(2,Math.min(4,Number(playerCount)||2));const cleanName=String(name||'Jugador').trim().slice(0,24);const code=makeCode();const room={code,playerCount:count,host:socket.id,players:new Map(),playersByTeam:{},started:false,current:0,value:null,awaitingMove:false,winner:null,message:'Esperando jugadores.',tokens:[],pending:null,questions:JSON.parse(JSON.stringify(questions))};rooms.set(code,room);room.players.set(socket.id,{id:socket.id,name:cleanName,team:0});room.playersByTeam[0]=room.players.get(socket.id);socket.join(code);socket.roomCode=code;socket.team=0;socket.emit('roomCreated',{code,team:0,playerCount:count,name:cleanName});broadcastRoom(room);});
  socket.on('joinRoom',({code,name}={})=>{const room=rooms.get(String(code||'').toUpperCase());if(!room)return socket.emit('errorMessage','La sala no existe.');if(room.started)return socket.emit('errorMessage','La partida ya comenzó.');if(room.players.size>=room.playerCount)return socket.emit('errorMessage','La sala está completa.');const cleanName=String(name||'Jugador').trim().slice(0,24);if([...room.players.values()].some(p=>p.name.toLowerCase()===cleanName.toLowerCase()))return socket.emit('errorMessage','Ese nombre ya está en uso.');let team=0;while(room.playersByTeam[team])team++;room.players.set(socket.id,{id:socket.id,name:cleanName,team});room.playersByTeam[team]=room.players.get(socket.id);socket.join(room.code);socket.roomCode=room.code;socket.team=team;socket.emit('joinedRoom',{code:room.code,team,playerCount:room.playerCount,name:cleanName});broadcastRoom(room);});
  socket.on('startGame',()=>{const room=rooms.get(socket.roomCode);if(!room||room.host!==socket.id)return;if(room.players.size!==room.playerCount)return socket.emit('errorMessage','Faltan jugadores.');startRoom(room);});
  socket.on('rollDice',()=>{const room=rooms.get(socket.roomCode);if(!room||room.current!==socket.team||!room.started||room.awaitingMove||room.winner!==null)return;room.value=1+Math.floor(Math.random()*6);room.awaitingMove=true;const can=room.tokens.some(t=>t.p===room.current&&(t.pos<0?room.value===6:t.pos+room.value<=34));if(!can){room.awaitingMove=false;const rolled=room.value;room.value=null;room.message=`Salió ${rolled}. No hay movimiento posible.`;room.current=(room.current+1)%room.playerCount;}else room.message=`Salió ${room.value}. Elige una ficha.`;broadcastRoom(room);});
  socket.on('moveToken',({tokenIndex}={})=>{const room=rooms.get(socket.roomCode);if(!room||socket.team!==room.current||!room.awaitingMove)return;const t=room.tokens[Number(tokenIndex)];if(!legal(room,t))return socket.emit('errorMessage','Movimiento no válido.');const oldPos=t.pos,six=room.value===6;t.pos=t.pos<0?0:t.pos+room.value;room.message='Responde el desafío matemático.';const isWhite=t.pos>=0&&t.pos<28&&!starts.includes((cfg[t.p].start+t.pos)%28);if(isWhite||t.pos===34)askQuestion(room,t,oldPos,six);else {finishMove(room,t,six,true);broadcastRoom(room);}});
  socket.on('answerQuestion',({answer,questionId}={})=>{const room=rooms.get(socket.roomCode);if(!room||!room.pending||room.pending.id!==questionId||room.pending.team!==socket.team||room.current!==socket.team)return;const p=room.pending;const correct=Number(answer)===Number(p.a.indexOf(p.a[p.a.findIndex(x=>x===p.a[Number(answer)])])); // replaced below
    const bank=room.questions.customCellQuestions;
    let expected=null;
    const isSkill=room.pending.tag==='Habilidad Matemática';
    if(isSkill){
      const item=room.questions.skillQuestions.find(x=>x.q===room.pending.q);expected=item?item.ok:null;
    }else{
      for(const arr of Object.values(bank)){const item=arr&&arr[0];if(item&&item.q===room.pending.q){expected=item.ok;break;}}
    }
    const ok=Number(answer)===Number(expected);
    const t=room.tokens[p.tokenIndex];room.pending=null;finishMove(room,t,p.six,ok);io.to(room.code).emit('questionResult',{correct:ok,message:ok?'¡Respuesta correcta!':'Respuesta incorrecta. La ficha regresa.',state:publicState(room)});});
  socket.on('disconnect',()=>{const code=socket.roomCode;if(!code)return;const room=rooms.get(code);if(!room)return;room.players.delete(socket.id);delete room.playersByTeam[socket.team];if(room.host===socket.id){const next=room.players.values().next().value;if(next){room.host=next.id;}}if(room.players.size===0){rooms.delete(code);return;}io.to(code).emit('roomInfo',roomInfo(room));});
});

initPersistence().finally(()=>server.listen(PORT,()=>console.log(`Ludo San Pío X online en puerto ${PORT}`)));

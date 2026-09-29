const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const fs=require('fs');
const path=require('path');

const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'1234';
const DATA_FILE=path.join(__dirname,'questions.json');
const app=express();
const server=http.createServer(app);
const io=new Server(server);
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(req,res)=>res.json({ok:true,app:'Ludo Matemático 5.º B'}));

function loadQuestions(){
  try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}
  catch(e){return {questionMapVersion:2,customCellQuestions:{},skillQuestions:[]};}
}
function cleanQuestions(data){
  const out={questionMapVersion:2,customCellQuestions:{},skillQuestions:[]};
  const src=data&&data.customCellQuestions&&typeof data.customCellQuestions==='object'?data.customCellQuestions:{};
  for(const [key,bank] of Object.entries(src)){
    if(!Array.isArray(bank))continue;
    out.customCellQuestions[key]=bank.slice(0,4).map(q=>({q:String(q.q||'Pregunta sin texto'),a:Array.isArray(q.a)?q.a.slice(0,4).map(x=>String(x)):['Sin respuesta','Sin respuesta','Sin respuesta','Sin respuesta'],ok:Math.max(0,Math.min(3,Number(q.ok)||0)),image:typeof q.image==='string'?q.image:''}));
  }
  if(Array.isArray(data?.skillQuestions))out.skillQuestions=data.skillQuestions.slice(0,4).map(q=>({q:String(q.q||'Pregunta sin texto'),a:Array.isArray(q.a)?q.a.slice(0,4).map(x=>String(x)):['Sin respuesta','Sin respuesta','Sin respuesta','Sin respuesta'],ok:Math.max(0,Math.min(3,Number(q.ok)||0)),image:typeof q.image==='string'?q.image:''}));
  return out;
}
let questions=cleanQuestions(loadQuestions());
function saveQuestions(data){questions=cleanQuestions(data);fs.writeFileSync(DATA_FILE,JSON.stringify(questions,null,2),'utf8');io.emit('questionsUpdated',questions);io.emit('questionsData',questions);}

const route=[[6,1],[6,3],[6,5],[4,6],[2,6],[0,6],[0,8],[1,8],[3,8],[5,8],[6,10],[6,12],[6,14],[8,14],[8,13],[8,11],[8,9],[10,8],[12,8],[14,8],[14,6],[13,6],[11,6],[9,6],[8,4],[8,2],[8,0],[6,0]];
const cfg=[
 {name:'Álgebra',colorName:'Mantua',start:0},
 {name:'Aritmética',colorName:'Riese',start:7},
 {name:'Geometría',colorName:'Venecia',start:14},
 {name:'Trigonometría',colorName:'Treviso',start:21}
];
function defaultCellQuestions(course,cell){
 const n=cell+2;
 if(course===0)return[{q:`¿Cuánto vale x si x + ${n} = ${n+7}?`,a:[`${n+5}`,'7',`${n+7}`,`${n+9}`],ok:1},{q:`¿Cuánto vale x si 2x = ${2*n}?`,a:[`${n-1}`,`${n}`,`${n+1}`,`${2*n}`],ok:1},{q:`¿Cuánto vale x si x − ${n} = 5?`,a:['5',`${n}`,`${n+5}`,`${n+4}`],ok:2},{q:`Si x = ${n}, ¿cuánto es x + 3?`,a:[`${n+2}`,`${n+3}`,`${n+4}`,`${n*3}`],ok:1}];
 if(course===1){const factor=2+(cell%8);return[{q:`¿Cuánto es ${factor} × 7?`,a:[`${factor*6}`,`${factor*7}`,`${factor*8}`,`${factor+7}`],ok:1},{q:`¿Cuál es la mitad de ${2*n}?`,a:[`${n-1}`,`${n}`,`${n+1}`,`${2*n}`],ok:1},{q:`¿Cuánto es ${n+10} + ${n}?`,a:[`${2*n+8}`,`${2*n+10}`,`${2*n+12}`,`${n+10}`],ok:1},{q:`¿Cuánto es ${3*n} ÷ 3?`,a:[`${n-1}`,`${n}`,`${n+1}`,`${3*n}`],ok:1}]}
 if(course===2){const sides=3+(cell%6);return[{q:`¿Cuántos lados tiene un polígono de ${sides} lados?`,a:[`${sides-1}`,`${sides}`,`${sides+1}`,'0'],ok:1},{q:'¿Cuánto suman los ángulos de un triángulo?',a:['90°','180°','270°','360°'],ok:1},{q:'Un cuadrado tiene lados…',a:['todos iguales','todos diferentes','curvos','ninguno'],ok:0},{q:'¿Cuántos vértices tiene un rectángulo?',a:['3','4','5','6'],ok:1}]}
 const angles=[30,45,60,90],angle=angles[cell%4];return[{q:`¿Cuál es el complemento de ${angle}°?`,a:[`${90-angle}°`,`${180-angle}°`,`${angle}°`,'360°'],ok:0},{q:'¿Cuánto vale cos(0°)?',a:['0','1','1/2','-1'],ok:1},{q:'¿Cuál de estos es un ángulo recto?',a:['45°','60°','90°','180°'],ok:2},{q:'¿Cuántos grados tiene una vuelta completa?',a:['180°','270°','360°','90°'],ok:2}]}
function bankFor(course,cell){return questions.customCellQuestions[`${course}-${cell}`]||defaultCellQuestions(course,cell)}
function skillBank(){return questions.skillQuestions?.length===4?questions.skillQuestions:[{q:'Completa la secuencia: 2, 4, 6, __',a:['7','8','9','10'],ok:1},{q:'Si tienes 3 grupos de 5, ¿cuántos hay en total?',a:['8','10','15','20'],ok:2},{q:'¿Cuál es el mayor número?',a:['0.8','0.08','0.18','0.7'],ok:0},{q:'Si un número aumenta de 9 a 12, ¿cuánto aumentó?',a:['2','3','4','21'],ok:1}]}
function pick(bank){return bank[Math.floor(Math.random()*bank.length)]}
function state(room){return {current:room.current,value:room.value,playerCount:room.playerCount,started:room.started,awaitingMove:room.awaitingMove,tokens:room.tokens,winner:room.winner,message:room.message}}
function broadcastInfo(room){io.to(room.code).emit('roomInfo',{code:room.code,playerCount:room.playerCount,host:room.host,started:room.started,players:room.players.map(p=>({name:p.name,team:p.team}))});}
function emitState(room){io.to(room.code).emit('state',state(room));}
function nextTurn(room){room.current=(room.current+1)%room.playerCount;room.value=null;room.awaitingMove=false;room.pending=null;room.message='Turno siguiente.';emitState(room)}
function spot(room,t){if(t.pos<0)return null;if(t.pos<28)return route[(cfg[t.p].start+t.pos)%28];if(t.pos<34)return null;return [7,7]}
function capture(room,t){const at=spot(room,t);if(t.pos<0||t.pos>=28||[0,7,14,21].includes((cfg[t.p].start+t.pos)%28))return;for(const o of room.tokens){if(o!==t&&o.p!==t.p&&o.pos>=0&&o.pos<34){const os=spot(room,o);if(os&&at&&os[0]===at[0]&&os[1]===at[1])o.pos=-1;}}}
function legal(room,t){if(t.p!==room.current||room.value===null||room.awaitingMove)return false;if(t.pos<0)return room.value===6;if(t.pos>=34)return false;return t.pos+room.value<=34;}
function questionFor(room,t){const isSkill=t.pos===34;const cell=isSkill?null:(cfg[t.p].start+t.pos)%28;const course=isSkill?null:Math.floor(cell/7);const bank=isSkill?skillBank():bankFor(course,cell);const item=pick(bank);return {id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,q:item.q,a:item.a,ok:item.ok,image:item.image||'',tag:isSkill?'Habilidad Matemática':cfg[course].name};}

const rooms=new Map();
function code(){let c;do{c=Math.random().toString(36).slice(2,8).toUpperCase()}while(rooms.has(c));return c}
function sendQuestion(room,socket){const q=questionFor(room,room.pending.token);room.pending.question=q;room.pending.oldPos=room.pending.oldPos;socket.emit('question',{id:q.id,q:q.q,a:q.a,image:q.image,tag:q.tag});}

io.on('connection',socket=>{
 socket.on('requestQuestions',()=>socket.emit('questionsData',questions));
 socket.on('adminLogin',d=>{socket.admin=String(d?.password||'')===ADMIN_PASSWORD;socket.emit('adminLoginResult',{ok:socket.admin});if(socket.admin)socket.emit('questionsData',questions);});
 socket.on('adminSaveQuestions',d=>{if(!socket.admin)return socket.emit('errorMessage','No autorizado.');saveQuestions(d);});
 socket.on('createRoom',(d={})=>{
   const count=Math.max(2,Math.min(4,Number(d.playerCount)||2));
   const name=String(d.name||'Jugador').trim().slice(0,24)||'Jugador';
   if(d.questions)questions=cleanQuestions(d.questions);
   const room={code:code(),playerCount:count,host:socket.id,players:[],started:false,current:0,value:null,awaitingMove:false,tokens:[],winner:null,message:'Esperando jugadores.',pending:null};
   rooms.set(room.code,room);socket.join(room.code);room.players.push({id:socket.id,name,team:0});socket.data.room=room.code;socket.data.team=0;
   socket.emit('roomCreated',{code:room.code,team:0,playerCount:count,name});broadcastInfo(room);
 });
 socket.on('joinRoom',d=>{const room=rooms.get(String(d?.code||'').toUpperCase());if(!room)return socket.emit('errorMessage','Sala no encontrada.');if(room.started)return socket.emit('errorMessage','La partida ya comenzó.');if(room.players.length>=room.playerCount)return socket.emit('errorMessage','La sala está completa.');const name=String(d.name||'Jugador').trim().slice(0,24)||'Jugador';const team=room.players.length;room.players.push({id:socket.id,name,team});socket.join(room.code);socket.data.room=room.code;socket.data.team=team;socket.emit('joinedRoom',{code:room.code,team,playerCount:room.playerCount,name});broadcastInfo(room);});
 socket.on('startGame',()=>{const room=rooms.get(socket.data.room);if(!room)return;if(socket.id!==room.host)return socket.emit('errorMessage','Solo el anfitrión puede iniciar.');if(room.players.length!==room.playerCount)return socket.emit('errorMessage','Faltan jugadores.');room.started=true;room.current=0;room.value=null;room.awaitingMove=false;room.winner=null;room.tokens=room.players.flatMap((p)=>[0,1,2,3].map(n=>({p:p.team,n,pos:-1})));room.message='¡Partida lista! Empieza el primer jugador.';broadcastInfo(room);emitState(room);});
 socket.on('rollDice',()=>{const room=rooms.get(socket.data.room);if(!room||!room.started||socket.data.team!==room.current||room.awaitingMove||room.pending)return;const n=1+Math.floor(Math.random()*6);room.value=n;const moves=room.tokens.filter(t=>legal(room,t));if(!moves.length){room.message=`No hay movimientos posibles para ${cfg[room.current].name}.`;emitState(room);return setTimeout(()=>nextTurn(room),750);}room.awaitingMove=true;room.message=`Sacaste ${n}. Elige una ficha resaltada.`;emitState(room);});
 socket.on('moveToken',({tokenIndex}={})=>{const room=rooms.get(socket.data.room);if(!room||!room.started||socket.data.team!==room.current||!room.awaitingMove)return;const t=room.tokens[Number(tokenIndex)];if(!t||!legal(room,t))return;const oldPos=t.pos;const six=room.value===6;t.pos=t.pos<0?0:t.pos+room.value;const routeCell=t.pos>=0&&t.pos<28?(cfg[t.p].start+t.pos)%28:null;const needsQuestion=(t.pos===34)||(routeCell!==null&&! [0,7,14,21].includes(routeCell));if(needsQuestion){room.awaitingMove=false;room.pending={token:t,oldPos,six};const q=questionFor(room,t);room.pending.question=q;socket.emit('question',{id:q.id,q:q.q,a:q.a,image:q.image,tag:q.tag});return;}capture(room,t);finish(room,t,six,true);});
 socket.on('answerQuestion',({answer,questionId}={})=>{const room=rooms.get(socket.data.room);if(!room||!room.pending||socket.data.team!==room.current)return;const p=room.pending;if(p.question.id!==questionId)return;const correct=Number(answer)===Number(p.question.ok);const t=p.token;if(!correct)t.pos=p.oldPos;room.pending=null;finish(room,t,p.six,correct);});
 socket.on('disconnect',()=>{const code=socket.data.room;if(!code)return;const room=rooms.get(code);if(!room)return;room.players=room.players.filter(p=>p.id!==socket.id);if(room.players.length===0)return rooms.delete(code);if(socket.id===room.host)room.host=room.players[0].id;io.to(room.code).emit('message','Un jugador salió de la sala.');broadcastInfo(room);});
});
function finish(room,t,six,correct){if(correct)capture(room,t);room.value=null;room.awaitingMove=false;if(correct&&t.pos===34){room.winner=t.p;room.message='¡Un jugador ganó la partida!';emitState(room);return;}room.message=!correct?'Respuesta incorrecta: vuelve a la casilla anterior.':six?'Sacaste 6: vuelve a lanzar.':'Pasa el turno al siguiente jugador.';if(six&&correct){emitState(room);return;}emitState(room);setTimeout(()=>nextTurn(room),500);}

server.listen(PORT,()=>console.log(`Ludo 5.º B en puerto ${PORT}`));

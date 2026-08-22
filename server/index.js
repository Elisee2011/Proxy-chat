import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
const PORT=Number(process.env.PORT||3001);const app=express();const players=new Map();const media=new Map();const CHAT_RADIUS=1500;
app.use(express.json({limit:'8mb'}));
app.get('/health',(_,res)=>res.json({ok:true,service:'proxy-chat',players:players.size,media:media.size}));
app.get('/media',(_,res)=>res.json([...media.values()]));
app.post('/media',(req,res)=>{const d=req.body||{};const type=['youtube','image','video'].includes(d.type)?d.type:null;if(!type||typeof d.src!=='string'||!d.src||!Number.isFinite(Number(d.x))||!Number.isFinite(Number(d.y)))return res.status(400).json({error:'invalid media'});if(d.src.length>7_000_000)return res.status(413).json({error:'media too large'});const item={id:String(d.id||crypto.randomUUID()),type,src:d.src.slice(0,7_000_000),x:Math.max(0,Math.min(2400,Number(d.x))),y:Math.max(0,Math.min(1500,Number(d.y))),width:Math.max(40,Math.min(1000,Number(d.width)||400)),height:Math.max(40,Math.min(800,Number(d.height)||240)),rotation:Math.max(-180,Math.min(180,Number(d.rotation)||0)),autoplay:!!d.autoplay,loop:!!d.loop};media.set(item.id,item);res.status(201).json(item);broadcast({type:'media:update',items:[...media.values()]});});
app.delete('/media/:id',(req,res)=>{media.delete(String(req.params.id));res.json({ok:true});broadcast({type:'media:update',items:[...media.values()]});});
const server=http.createServer(app);const wss=new WebSocketServer({server});
const send=(ws,p)=>{if(ws.readyState===1)ws.send(JSON.stringify(p));};
const broadcast=(p,except=null)=>{const s=JSON.stringify(p);for(const [id,c] of players)if(id!==except&&c.ws.readyState===1)c.ws.send(s);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cleanName=v=>String(v||'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,18).trim()||'Player';
const nameKey=v=>cleanName(v).toLocaleLowerCase();
const nameTaken=(name,exceptId=null)=>{const key=nameKey(name);for(const [id,p] of players)if(id!==exceptId&&nameKey(p.name)===key)return true;return false;};
const pub=p=>({id:p.id,name:p.name,x:p.x,y:p.y});
const notify=(ws,text)=>send(ws,{type:'chat',name:'Serveur',text,at:Date.now(),player:{id:'__server__',name:'Serveur',x:0,y:0}});
wss.on('connection',ws=>{let id=null;ws.on('message',raw=>{let d;try{d=JSON.parse(raw.toString())}catch{return}
 if(d.type==='join'){id=String(d.id);if(players.has(id))return;const requested=cleanName(d.name);if(nameTaken(requested)){notify(ws,`Le pseudo « ${requested} » est déjà utilisé. Choisis un autre pseudo.`);send(ws,{type:'name:rejected',reason:'taken',name:requested});setTimeout(()=>ws.close(4001,'Pseudo déjà utilisé'),50);return;}const p={id,name:requested,x:Number(d.x)||1200,y:Number(d.y)||750,ws};players.set(id,p);send(ws,{type:'snapshot',players:[...players.values()].map(pub),media:[...media.values()]});broadcast({type:'player:join',player:pub(p)},id);return;}
 const me=players.get(id);if(!me)return;
 if(d.type==='move'){if(Number.isFinite(Number(d.x)))me.x=Math.max(0,Math.min(2400,Number(d.x)));if(Number.isFinite(Number(d.y)))me.y=Math.max(0,Math.min(1500,Number(d.y)));broadcast({type:'player:move',player:pub(me)},id);}
 else if(d.type==='rename'){const requested=cleanName(d.name);if(nameTaken(requested,id)){notify(ws,`Le pseudo « ${requested} » est déjà utilisé. Choisis un autre pseudo.`);send(ws,{type:'name:rejected',reason:'taken',name:requested});return;}me.name=requested;const p={type:'player:name',player:pub(me)};broadcast(p);send(ws,p);}
 else if(d.type==='chat'){const text=String(d.text||'').trim().slice(0,180);if(text)for(const [tid,t] of players)if(tid===id||dist(me,t)<=CHAT_RADIUS)send(t.ws,{type:'chat',name:me.name,text,at:Date.now(),player:pub(me)});}
 else if(['voice:request','voice:ready','voice:offer','voice:answer','voice:ice'].includes(d.type)&&d.to){const target=players.get(String(d.to));if(target)send(target.ws,{...d,from:id});}
 });ws.on('close',()=>{if(id){players.delete(id);broadcast({type:'player:leave',id})}});ws.on('error',()=>{});});
setInterval(()=>{for(const c of players.values())if(c.ws.readyState===1)c.ws.ping()},15000);server.listen(PORT,()=>console.log(`Proxy Chat server listening on :${PORT}`));

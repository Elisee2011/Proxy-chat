import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
const PORT=Number(process.env.PORT||3001);const app=express();const players=new Map();const CHAT_RADIUS=360;
app.get('/health',(_,res)=>res.json({ok:true,service:'proxy-chat',players:players.size}));
const server=http.createServer(app);const wss=new WebSocketServer({server});
const send=(ws,p)=>{if(ws.readyState===1)ws.send(JSON.stringify(p));};
const broadcast=(p,except=null)=>{const s=JSON.stringify(p);for(const [id,c] of players)if(id!==except&&c.ws.readyState===1)c.ws.send(s);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const cleanName=v=>String(v||'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,18)||'Player';const pub=p=>({id:p.id,name:p.name,x:p.x,y:p.y});
wss.on('connection',ws=>{let id=null;ws.on('message',raw=>{let d;try{d=JSON.parse(raw.toString())}catch{return}
 if(d.type==='join'){id=String(d.id);if(players.has(id))return;const p={id,name:cleanName(d.name),x:Number(d.x)||1200,y:Number(d.y)||750,ws};players.set(id,p);send(ws,{type:'snapshot',players:[...players.values()].map(pub)});broadcast({type:'player:join',player:pub(p)},id);return;}
 const me=players.get(id);if(!me)return;
 if(d.type==='move'){if(Number.isFinite(Number(d.x)))me.x=Math.max(0,Math.min(2400,Number(d.x)));if(Number.isFinite(Number(d.y)))me.y=Math.max(0,Math.min(1500,Number(d.y)));broadcast({type:'player:move',player:pub(me)},id);}
 else if(d.type==='rename'){me.name=cleanName(d.name);const p={type:'player:name',player:pub(me)};broadcast(p);send(ws,p);}
 else if(d.type==='chat'){const text=String(d.text||'').trim().slice(0,180);if(text)for(const [tid,t] of players)if(tid===id||dist(me,t)<=CHAT_RADIUS)send(t.ws,{type:'chat',name:me.name,text,at:Date.now(),player:pub(me)});}
 else if(['voice:request','voice:ready','voice:offer','voice:answer','voice:ice'].includes(d.type)&&d.to){const target=players.get(String(d.to));if(target)send(target.ws,{...d,from:id});}
 });ws.on('close',()=>{if(id){players.delete(id);broadcast({type:'player:leave',id})}});ws.on('error',()=>{});});
setInterval(()=>{for(const c of players.values())if(c.ws.readyState===1)c.ws.ping()},15000);server.listen(PORT,()=>console.log(`Proxy Chat server listening on :${PORT}`));

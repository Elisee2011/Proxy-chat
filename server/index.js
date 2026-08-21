import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT=Number(process.env.PORT||3001);const app=express();const players=new Map();const CHAT_RADIUS=360;
app.use(express.json());
app.get('/health',(_,res)=>res.json({ok:true,service:'proxy-chat',players:players.size}));
const server=http.createServer(app);const wss=new WebSocketServer({server});
function send(ws,payload){if(ws.readyState===1)ws.send(JSON.stringify(payload));}
function broadcast(payload,exceptId=null){const packet=JSON.stringify(payload);for(const [id,client] of players)if(id!==exceptId&&client.ws.readyState===1)client.ws.send(packet);}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function cleanName(v){return String(v||'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,18)||'Player';}
function publicPlayer(p){return{id:p.id,name:p.name,x:p.x,y:p.y};}

wss.on('connection',ws=>{let id=null;
 ws.on('message',raw=>{let data;try{data=JSON.parse(raw.toString());}catch{return;}
  if(data.type==='join'){id=String(data.id);if(players.has(id))return;const player={id,name:cleanName(data.name),x:Number.isFinite(Number(data.x))?Math.max(0,Math.min(2400,Number(data.x))):1200,y:Number.isFinite(Number(data.y))?Math.max(0,Math.min(1500,Number(data.y))):750,lastMove:Date.now()};players.set(id,{ws,...player});send(ws,{type:'snapshot',players:[...players.values()].map(publicPlayer)});broadcast({type:'player:join',player:publicPlayer(player)},id);return;}
  const me=players.get(id);if(!me)return;
  if(data.type==='move'){const nx=Number(data.x),ny=Number(data.y);if(Number.isFinite(nx))me.x=Math.max(0,Math.min(2400,nx));if(Number.isFinite(ny))me.y=Math.max(0,Math.min(1500,ny));me.lastMove=Date.now();broadcast({type:'player:move',player:publicPlayer(me)},id);}
  if(data.type==='rename'){const old=me.name;me.name=cleanName(data.name);if(me.name!==old){const packet={type:'player:name',player:publicPlayer(me)};broadcast(packet);send(ws,packet);}}
  if(data.type==='chat'){const text=String(data.text||'').trim().slice(0,180);if(!text)return;for(const [targetId,target] of players)if(targetId===id||dist(me,target)<=CHAT_RADIUS)send(target.ws,{type:'chat',name:me.name,text,at:Date.now(),player:publicPlayer(me)});}
  if(['voice:request','voice:ready','voice:offer','voice:answer','voice:ice'].includes(data.type)&&data.to){const target=players.get(String(data.to));if(target)send(target.ws,{...data,from:id});}
 });
 ws.on('close',()=>{if(!id)return;players.delete(id);broadcast({type:'player:leave',id});});
 ws.on('error',()=>{});
});
setInterval(()=>{for(const client of players.values())if(client.ws.readyState===1)client.ws.ping();},15000);
server.listen(PORT,()=>console.log(`Proxy Chat server listening on :${PORT}`));

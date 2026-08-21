import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3001);
const app = express();
app.get('/health', (_, res) => res.json({ok:true, service:'proxy-chat', players: players.size}));
const server = http.createServer(app);
const wss = new WebSocketServer({server});
const players = new Map();
const CHAT_RADIUS = 360;

function send(ws, payload) { if (ws.readyState === 1) ws.send(JSON.stringify(payload)); }
function broadcast(payload, exceptId=null) { for (const [id, ws] of players) if (id !== exceptId) send(ws,payload); }
function dist(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
function cleanName(v) { return String(v || 'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,18) || 'Player'; }

wss.on('connection', ws => {
  let id = null;
  ws.on('message', raw => {
    let data; try { data = JSON.parse(raw.toString()); } catch { return; }
    if (data.type === 'join') {
      id = String(data.id); if (players.has(id)) return;
      const player = {id,name:cleanName(data.name),x:Number(data.x)||1200,y:Number(data.y)||750};
      players.set(id,{ws, ...player});
      send(ws,{type:'snapshot',players:[...players.values()].map(({ws:_,...p})=>p)});
      broadcast({type:'player:join',player},id);
      return;
    }
    const me = players.get(id); if (!me) return;
    if (data.type === 'move') {
      me.x=Math.max(0,Math.min(2400,Number(data.x)||me.x)); me.y=Math.max(0,Math.min(1500,Number(data.y)||me.y));
      broadcast({type:'player:move',player:{id:me.id,name:me.name,x:me.x,y:me.y}},id);
    }
    if (data.type === 'chat') {
      const text=String(data.text||'').trim().slice(0,180); if(!text)return;
      for(const [targetId,target] of players){ if(targetId===id) { send(target.ws,{type:'chat',name:me.name,text,at:Date.now(),player:me}); continue; } if(dist(me,target)<=CHAT_RADIUS) send(target.ws,{type:'chat',name:me.name,text,at:Date.now(),player:me}); }
    }
    if (['voice:offer','voice:answer','voice:ice'].includes(data.type) && data.to) {
      const target=players.get(String(data.to)); if(target) send(target.ws,{...data,from:id});
    }
  });
  ws.on('close',()=>{ if(!id)return; players.delete(id); broadcast({type:'player:leave',id}); });
});

server.listen(PORT,()=>console.log(`Proxy Chat server listening on :${PORT}`));

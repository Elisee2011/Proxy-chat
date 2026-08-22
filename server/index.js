import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
const PORT=Number(process.env.PORT||3001);const app=express();const players=new Map();const media=new Map();const CHAT_RADIUS=1500;
app.get('/health',(_,res)=>res.json({ok:true,service:'proxy-chat',players:players.size,media:media.size}));
const server=http.createServer(app);const wss=new WebSocketServer({server});
const send=(ws,p)=>{if(ws.readyState===1)ws.send(JSON.stringify(p));};
const broadcast=(p,except=null)=>{const s=JSON.stringify(p);for(const [id,c] of players)if(id!==except&&c.ws.readyState===1)c.ws.send(s);};
const broadcastMedia=(p,except=null)=>{const s=JSON.stringify(p);for(const [id,c] of players)if(id!==except&&c.ws.readyState===1)c.ws.send(s);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cleanName=v=>String(v||'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,18).trim()||'Player';
const nameKey=v=>cleanName(v).toLocaleLowerCase();
const nameTaken=(name,exceptId=null)=>{const key=nameKey(name);for(const [id,p] of players)if(id!==exceptId&&nameKey(p.name)===key)return true;return false;};
const pub=p=>({id:p.id,name:p.name,x:p.x,y:p.y});
const pubMedia=m=>({id:m.id,ownerId:m.ownerId,ownerName:m.ownerName,type:m.type,url:m.url,x:m.x,y:m.y,width:m.width,height:m.height,rotation:m.rotation,loop:m.loop,autoplay:m.autoplay,title:m.title});
const notify=(ws,text)=>send(ws,{type:'chat',name:'Serveur',text,at:Date.now(),player:{id:'__server__',name:'Serveur',x:0,y:0}});
wss.on('connection',ws=>{let id=null;ws.on('message',raw=>{let d;try{d=JSON.parse(raw.toString())}catch{return}
 if(d.type==='join'){id=String(d.id);if(players.has(id))return;const requested=cleanName(d.name);if(nameTaken(requested)){notify(ws,`Le pseudo « ${requested} » est déjà utilisé. Choisis un autre pseudo.`);send(ws,{type:'name:rejected',reason:'taken',name:requested});setTimeout(()=>ws.close(4001,'Pseudo déjà utilisé'),50);return;}const p={id,name:requested,x:Number(d.x)||1200,y:Number(d.y)||750,ws};players.set(id,p);send(ws,{type:'snapshot',players:[...players.values()].map(pub),media:[...media.values()].map(pubMedia)});broadcast({type:'player:join',player:pub(p)},id);return;}
 const me=players.get(id);if(!me)return;
 if(d.type==='move'){if(Number.isFinite(Number(d.x)))me.x=Math.max(0,Math.min(2400,Number(d.x)));if(Number.isFinite(Number(d.y)))me.y=Math.max(0,Math.min(1500,Number(d.y)));broadcast({type:'player:move',player:pub(me)},id);}
 else if(d.type==='rename'){const requested=cleanName(d.name);if(nameTaken(requested,id)){notify(ws,`Le pseudo « ${requested} » est déjà utilisé. Choisis un autre pseudo.`);send(ws,{type:'name:rejected',reason:'taken',name:requested});return;}me.name=requested;const p={type:'player:name',player:pub(me)};broadcast(p);send(ws,p);}
 else if(d.type==='chat'){const text=String(d.text||'').trim().slice(0,180);if(text)for(const [tid,t] of players)if(tid===id||dist(me,t)<=CHAT_RADIUS)send(t.ws,{type:'chat',name:me.name,text,at:Date.now(),player:pub(me)});}
 else if(d.type==='media:publish'){const type=['image','video','youtube'].includes(d.media?.type)?d.media.type:null;if(!type)return;const rawUrl=String(d.media.url||'');if(!rawUrl||rawUrl.length>7000000)return;const m={id:String(d.media.id||crypto.randomUUID()),ownerId:id,ownerName:me.name,type,url:rawUrl,x:Math.max(0,Math.min(2400,Number(d.media.x)||me.x)),y:Math.max(0,Math.min(1500,Number(d.media.y)||me.y)),width:Math.max(40,Math.min(800,Number(d.media.width)||300)),height:Math.max(40,Math.min(600,Number(d.media.height)||200)),rotation:Number(d.media.rotation)||0,loop:Boolean(d.media.loop),autoplay:Boolean(d.media.autoplay),title:String(d.media.title||'').slice(0,80)};media.set(m.id,m);broadcastMedia({type:'media:published',media:pubMedia(m)});send(ws,{type:'media:published',media:pubMedia(m)});}
 else if(d.type==='media:remove'){const mid=String(d.id||'');const m=media.get(mid);if(m&&m.ownerId===id){media.delete(mid);broadcastMedia({type:'media:removed',id:mid});}}
 else if(['voice:request','voice:ready','voice:offer','voice:answer','voice:ice'].includes(d.type)&&d.to){const target=players.get(String(d.to));if(target)send(target.ws,{...d,from:id});}
 });ws.on('close',()=>{if(id){players.delete(id);broadcast({type:'player:leave',id})}});ws.on('error',()=>{});});
setInterval(()=>{for(const c of players.values())if(c.ws.readyState===1)c.ws.ping()},15000);server.listen(PORT,()=>console.log(`Proxy Chat server listening on :${PORT}`));

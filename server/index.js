import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT=Number(process.env.PORT||3001);
const app=express();
// Base64 increases a 5 MB file to roughly 6.7 MB, plus JSON overhead.
// Keep the HTTP body limit comfortably above that so compressed 5 MB videos can be published.
app.use(express.json({limit:'12mb'}));
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS')return res.sendStatus(204);next()});
const players=new Map(),media=new Map();
const CHAT_RADIUS=1500;
const MAX_MEDIA_SRC=11*1024*1024;
const cleanName=v=>String(v||'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,18).trim()||'Player';
const nameKey=v=>cleanName(v).toLocaleLowerCase();
const nameTaken=(name,exceptId=null)=>{const key=nameKey(name);for(const [id,p] of players)if(id!==exceptId&&nameKey(p.name)===key)return true;return false};
const pub=p=>({id:p.id,name:p.name,x:p.x,y:p.y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const send=(ws,p)=>{if(ws.readyState===1)ws.send(JSON.stringify(p))};
const broadcast=(p,except=null)=>{const s=JSON.stringify(p);for(const [id,c] of players)if(id!==except&&c.ws.readyState===1)c.ws.send(s)};
const broadcastMedia=p=>{const s=JSON.stringify(p);for(const c of players.values())if(c.ws.readyState===1)c.ws.send(s)};
const notify=(ws,text)=>send(ws,{type:'chat',name:'Serveur',text,at:Date.now(),player:{id:'__server__',name:'Serveur',x:0,y:0}});

app.get('/health',(_,res)=>res.json({ok:true,service:'proxy-chat',players:players.size,media:media.size}));
app.get('/media',(_,res)=>res.json([...media.values()]));
app.post('/media',(req,res)=>{
  try{
    const d=req.body||{};
    if(!['image','video'].includes(d.type))return res.status(400).json({error:'Type de média invalide'});
    const src=String(d.src||'').trim();
    if(!src)return res.status(400).json({error:'Média vide'});
    if(src.length>MAX_MEDIA_SRC)return res.status(413).json({error:'Média trop volumineux après encodage'});
    if(d.type==='image'&&!/^data:image\/(jpeg|png|webp|gif);base64,/i.test(src))return res.status(400).json({error:'Format image invalide'});
    if(d.type==='video'&&!/^data:video\/(webm|mp4);base64,/i.test(src))return res.status(400).json({error:'Format vidéo invalide'});
    const item={
      id:String(d.id||crypto.randomUUID()),ownerId:String(d.ownerId||'anonymous'),ownerName:String(d.ownerName||'Player').slice(0,18),type:d.type,src,
      x:Math.max(0,Math.min(2400,Number(d.x)||0)),y:Math.max(0,Math.min(1500,Number(d.y)||0)),
      width:Math.max(40,Math.min(1400,Number(d.width)||400)),height:Math.max(40,Math.min(1400,Number(d.height)||225)),rotation:Number(d.rotation)||0,
      autoplay:Boolean(d.autoplay),loop:Boolean(d.loop)
    };
    media.set(item.id,item);broadcastMedia({type:'media:published',media:item});res.json(item);
  }catch(e){res.status(500).json({error:'Erreur serveur média'})}
});
app.delete('/media/:id',(req,res)=>{const id=String(req.params.id);if(!media.has(id))return res.status(404).json({error:'Média introuvable'});media.delete(id);broadcastMedia({type:'media:removed',id});res.json({ok:true})});

const server=http.createServer(app),wss=new WebSocketServer({server});
wss.on('connection',ws=>{let id=null;ws.on('message',raw=>{let d;try{d=JSON.parse(raw.toString())}catch{return}
 if(d.type==='join'){id=String(d.id);if(players.has(id))return;const requested=cleanName(d.name);if(nameTaken(requested)){notify(ws,`Le pseudo « ${requested} » est déjà utilisé. Choisis un autre pseudo.`);send(ws,{type:'name:rejected',reason:'taken',name:requested});setTimeout(()=>ws.close(4001,'Pseudo déjà utilisé'),50);return}const p={id,name:requested,x:Number(d.x)||1200,y:Number(d.y)||750,ws};players.set(id,p);send(ws,{type:'snapshot',players:[...players.values()].map(pub),media:[...media.values()]});broadcast({type:'player:join',player:pub(p)},id);return}
 const me=players.get(id);if(!me)return;
 if(d.type==='move'){if(Number.isFinite(Number(d.x)))me.x=Math.max(0,Math.min(2400,Number(d.x)));if(Number.isFinite(Number(d.y)))me.y=Math.max(0,Math.min(1500,Number(d.y)));broadcast({type:'player:move',player:pub(me)},id)}
 else if(d.type==='rename'){const requested=cleanName(d.name);if(nameTaken(requested,id)){notify(ws,`Le pseudo « ${requested} » est déjà utilisé. Choisis un autre pseudo.`);send(ws,{type:'name:rejected',reason:'taken',name:requested});return}me.name=requested;const p={type:'player:name',player:pub(me)};broadcast(p);send(ws,p)}
 else if(d.type==='chat'){const text=String(d.text||'').trim().slice(0,180);if(text)for(const [tid,t] of players)if(tid===id||dist(me,t)<=CHAT_RADIUS)send(t.ws,{type:'chat',name:me.name,text,at:Date.now(),player:pub(me)})}
 else if(['voice:request','voice:ready','voice:offer','voice:answer','voice:ice'].includes(d.type)&&d.to){const target=players.get(String(d.to));if(target)send(target.ws,{...d,from:id})}
 });ws.on('close',()=>{if(id){players.delete(id);broadcast({type:'player:leave',id})}});ws.on('error',()=>{})});
setInterval(()=>{for(const c of players.values())if(c.ws.readyState===1)c.ws.ping()},15000);
server.listen(PORT,()=>console.log(`Proxy Chat server listening on :${PORT}`));
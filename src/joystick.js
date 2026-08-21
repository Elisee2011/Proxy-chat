// Joystick analogique + ZQSD.
const style=document.createElement('style');
style.textContent=`#mobileJoystick{position:fixed;left:22px;bottom:24px;width:150px;height:150px;border-radius:50%;background:rgba(15,23,42,.82);border:2px solid rgba(255,255,255,.24);backdrop-filter:blur(8px);z-index:1000;touch-action:none;user-select:none;display:block;box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 0 20px rgba(139,92,246,.12)}#mobileJoystick .stick{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px;border-radius:50%;background:rgba(139,92,246,.95);border:2px solid rgba(255,255,255,.7);box-shadow:0 5px 18px rgba(0,0,0,.4);pointer-events:none;transform:translate(0,0)}#mobileJoystick:after{content:'JOYSTICK';position:absolute;top:156px;left:0;right:0;text-align:center;color:rgba(255,255,255,.6);font:600 10px system-ui,sans-serif}@media(max-width:800px){#mobileJoystick{left:18px;bottom:18px;width:132px;height:132px}#mobileJoystick .stick{width:56px;height:56px;margin:-28px}#mobileJoystick:after{top:138px}}`;
document.head.appendChild(style);

const joystick=document.createElement('div');joystick.id='mobileJoystick';joystick.innerHTML='<div class="stick"></div>';document.body.appendChild(joystick);
const stick=joystick.querySelector('.stick');
const activeKeys=new Set();let pointerId=null;const radius=75,deadzone=.16;
function keyDown(key){if(activeKeys.has(key))return;activeKeys.add(key);window.dispatchEvent(new KeyboardEvent('keydown',{key,code:key==='w'?'KeyW':key==='a'?'KeyA':key==='s'?'KeyS':'KeyD',bubbles:true,cancelable:true}));}
function keyUp(key){if(!activeKeys.has(key))return;activeKeys.delete(key);window.dispatchEvent(new KeyboardEvent('keyup',{key,code:key==='w'?'KeyW':key==='a'?'KeyA':key==='s'?'KeyS':'KeyD',bubbles:true,cancelable:true}));}
function clearKeys(){for(const k of [...activeKeys])keyUp(k)}
function updateKeys(dx,dy){const nx=dx/radius,ny=dy/radius;if(Math.hypot(nx,ny)<deadzone){clearKeys();return}const next=new Set();if(ny<-deadzone)next.add('w');if(ny>deadzone)next.add('s');if(nx<-deadzone)next.add('a');if(nx>deadzone)next.add('d');for(const k of activeKeys)if(!next.has(k))keyUp(k);for(const k of next)if(!activeKeys.has(k))keyDown(k)}
function move(x,y){const r=joystick.getBoundingClientRect();let dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2),len=Math.hypot(dx,dy);if(len>radius){dx=dx/len*radius;dy=dy/len*radius}stick.style.transform=`translate(${dx}px,${dy}px)`;updateKeys(dx,dy)}
joystick.addEventListener('pointerdown',e=>{pointerId=e.pointerId;joystick.setPointerCapture(pointerId);move(e.clientX,e.clientY);e.preventDefault()});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointerId){move(e.clientX,e.clientY);e.preventDefault()}});
function end(e){if(e.pointerId!==pointerId)return;pointerId=null;stick.style.transform='translate(0,0)';clearKeys()}joystick.addEventListener('pointerup',end);joystick.addEventListener('pointercancel',end);joystick.addEventListener('lostpointercapture',()=>{pointerId=null;stick.style.transform='translate(0,0)';clearKeys()});

// Clavier français AZERTY: ZQSD est traduit vers les touches internes WASD.
const map={z:'w',q:'a',s:'s',d:'d'};
window.addEventListener('keydown',e=>{const k=map[e.key.toLowerCase()];if(!k||e.repeat)return;e.preventDefault();e.stopImmediatePropagation();keyDown(k)},true);
window.addEventListener('keyup',e=>{const k=map[e.key.toLowerCase()];if(!k)return;e.preventDefault();e.stopImmediatePropagation();keyUp(k)},true);

const hint=document.querySelector('.hint');if(hint)hint.innerHTML='🕹️ Joystick ou <b>ZQSD</b> pour bouger · <b>Entrée</b> pour envoyer';

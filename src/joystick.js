// Contrôle analogique tactile : transforme la direction du joystick en touches
// WASD utilisées par le moteur de déplacement existant.
const style = document.createElement('style');
style.textContent = `
  #mobileJoystick{position:fixed;left:22px;bottom:24px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.10);border:2px solid rgba(255,255,255,.20);backdrop-filter:blur(8px);z-index:1000;touch-action:none;display:none;box-shadow:0 8px 30px rgba(0,0,0,.3)}
  #mobileJoystick .stick{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px;border-radius:50%;background:rgba(139,92,246,.9);border:2px solid rgba(255,255,255,.65);box-shadow:0 5px 18px rgba(0,0,0,.35);pointer-events:none;transform:translate(0,0)}
  @media (pointer:coarse), (max-width:800px){#mobileJoystick{display:block}.hint{display:none}}
`;
document.head.appendChild(style);

const joystick = document.createElement('div');
joystick.id = 'mobileJoystick';
joystick.innerHTML = '<div class="stick"></div>';
document.body.appendChild(joystick);
const stick = joystick.querySelector('.stick');
const activeKeys = new Set();
let pointerId = null;
const radius = 75;
const deadzone = 0.16;

function keyDown(key){
  if(activeKeys.has(key)) return;
  activeKeys.add(key);
  window.dispatchEvent(new KeyboardEvent('keydown',{key,code:key==='w'?'KeyW':key==='a'?'KeyA':key==='s'?'KeyS':'KeyD',bubbles:true}));
}
function keyUp(key){
  if(!activeKeys.has(key)) return;
  activeKeys.delete(key);
  window.dispatchEvent(new KeyboardEvent('keyup',{key,code:key==='w'?'KeyW':key==='a'?'KeyA':key==='s'?'KeyS':'KeyD',bubbles:true}));
}
function clearKeys(){ for(const k of [...activeKeys]) keyUp(k); }
function updateKeys(dx,dy){
  const nx=dx/radius, ny=dy/radius;
  const mag=Math.hypot(nx,ny);
  if(mag < deadzone){ clearKeys(); return; }
  const ax=Math.abs(nx), ay=Math.abs(ny);
  // Les diagonales sont conservées pour un déplacement analogique à 8 directions.
  const next=new Set();
  if(ny < -deadzone) next.add('w');
  if(ny > deadzone) next.add('s');
  if(nx < -deadzone) next.add('a');
  if(nx > deadzone) next.add('d');
  for(const k of activeKeys) if(!next.has(k)) keyUp(k);
  for(const k of next) if(!activeKeys.has(k)) keyDown(k);
}
function move(clientX,clientY){
  const r=joystick.getBoundingClientRect();
  let dx=clientX-(r.left+r.width/2);
  let dy=clientY-(r.top+r.height/2);
  const len=Math.hypot(dx,dy);
  if(len>radius){dx=dx/len*radius;dy=dy/len*radius;}
  stick.style.transform=`translate(${dx}px,${dy}px)`;
  updateKeys(dx,dy);
}
joystick.addEventListener('pointerdown',e=>{pointerId=e.pointerId;joystick.setPointerCapture(pointerId);move(e.clientX,e.clientY);e.preventDefault();});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointerId){move(e.clientX,e.clientY);e.preventDefault();}});
function end(e){if(e.pointerId!==pointerId)return;pointerId=null;stick.style.transform='translate(0,0)';clearKeys();}
joystick.addEventListener('pointerup',end);joystick.addEventListener('pointercancel',end);joystick.addEventListener('lostpointercapture',()=>{pointerId=null;stick.style.transform='translate(0,0)';clearKeys();});

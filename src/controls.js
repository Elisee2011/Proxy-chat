const style = document.createElement('style');
style.textContent = `
#joystick{position:absolute;left:24px;bottom:24px;width:132px;height:132px;z-index:10;touch-action:none;user-select:none}
#joystick-base{position:absolute;inset:0;border-radius:50%;background:rgba(15,23,42,.78);border:2px solid rgba(255,255,255,.24);box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 0 20px rgba(139,92,246,.14)}
#joystick-knob{position:absolute;width:58px;height:58px;left:37px;top:37px;border-radius:50%;background:rgba(139,92,246,.95);border:2px solid rgba(255,255,255,.7);box-shadow:0 5px 18px rgba(0,0,0,.4);pointer-events:none}
#joystick-label{position:absolute;left:0;right:0;top:138px;text-align:center;color:rgba(255,255,255,.6);font:600 10px system-ui,sans-serif;pointer-events:none}
@media(max-width:900px){#joystick{width:126px;height:126px;left:18px;bottom:18px}#joystick-knob{width:56px;height:56px;left:35px;top:35px}}
`;
document.head.appendChild(style);

function keyEvent(type,key){window.dispatchEvent(new KeyboardEvent(type,{key,bubbles:true,cancelable:true}));}

// ZQSD devient le contrôle principal sur clavier.
const map={z:'w',q:'a',s:'s',d:'d'};
window.addEventListener('keydown',e=>{const k=map[e.key.toLowerCase()];if(!k||e.repeat)return;e.preventDefault();e.stopImmediatePropagation();keyEvent('keydown',k)},true);
window.addEventListener('keyup',e=>{const k=map[e.key.toLowerCase()];if(!k)return;e.preventDefault();e.stopImmediatePropagation();keyEvent('keyup',k)},true);

const wrap=document.querySelector('.world-wrap');
if(wrap){
 const joy=document.createElement('div');joy.id='joystick';joy.innerHTML='<div id="joystick-base"></div><div id="joystick-knob"></div><div id="joystick-label">JOYSTICK</div>';wrap.appendChild(joy);
 const knob=joy.querySelector('#joystick-knob'),max=35,pressed=new Set();let active=false,pid=null;
 const release=()=>{for(const k of pressed)keyEvent('keyup',k);pressed.clear()};
 const direction=(dx,dy)=>{const next=new Set(),dead=.22;if(dy<-dead)next.add('w');if(dy>dead)next.add('s');if(dx<-dead)next.add('a');if(dx>dead)next.add('d');for(const k of pressed)if(!next.has(k))keyEvent('keyup',k);for(const k of next)if(!pressed.has(k))keyEvent('keydown',k);pressed.clear();next.forEach(k=>pressed.add(k))};
 const move=(x,y)=>{const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}knob.style.transform=`translate3d(${dx}px,${dy}px,0)`;direction(dx/max,dy/max)};
 joy.addEventListener('pointerdown',e=>{active=true;pid=e.pointerId;joy.setPointerCapture(pid);move(e.clientX,e.clientY);e.preventDefault()});
 joy.addEventListener('pointermove',e=>{if(active&&e.pointerId===pid){move(e.clientX,e.clientY);e.preventDefault()}});
 const end=e=>{if(e.pointerId!==pid)return;active=false;pid=null;knob.style.transform='translate3d(0,0,0)';release();e.preventDefault()};
 joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);
}
const hint=document.querySelector('.hint');if(hint)hint.innerHTML='🕹️ Joystick ou <b>ZQSD</b> pour bouger · <b>Entrée</b> pour envoyer';

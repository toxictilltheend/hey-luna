'use strict';
// Dim the actual scene, change it in darkness, then reveal the next scene.
// No DOM screenshots: clipped accessibility text can never leak into the artwork.
class LunaPageTransition {
  constructor(root,motion){this.root=root;this.motion=motion;this.active=false;this.frame=0;this.queued=null;this.phase=0;this.changed=false;}
  run(change,after){
    if(this.active){this.queued={change,after};return;}
    if(!this.motion()){change();after?.();return;}
    this.active=true;this.changed=false;this.phase=0;this.change=change;this.after=after;this.start=performance.now();
    this.root.classList.add('transitioning');this.root.setAttribute('aria-busy','true');this.root.querySelector('#page-content').inert=true;
    this.paint(0);this.frame=requestAnimationFrame(now=>this.tick(now));
  }
  commit(){if(this.changed)return;this.changed=true;this.change?.();}
  paint(t){
    const smooth=v=>v*v*(3-2*v);
    const darkness=t<.42?smooth(t/.42):t<.5?1:1-smooth((t-.5)/.5);
    // A single soft registration shift, almost concealed by the dark frame.
    const pulse=t>.33&&t<.65?Math.sin((t-.33)/.32*Math.PI):0;
    const offset=Math.sin(t*Math.PI*12)*.7*pulse;
    this.root.style.setProperty('--transition-darkness',String(darkness));
    this.root.style.setProperty('--transition-shift',offset+'px');
  }
  tick(now){
    if(!this.active)return;
    const t=Math.min(1,(now-this.start)/920);this.phase=t;this.paint(t);
    if(t>=.42)this.commit();
    if(t>=1)this.finish();else this.frame=requestAnimationFrame(n=>this.tick(n));
  }
  finish(){
    if(!this.active)return;
    cancelAnimationFrame(this.frame);this.active=false;this.phase=1;
    this.commit();this.root.classList.remove('transitioning');this.root.removeAttribute('aria-busy');
    this.root.style.removeProperty('--transition-darkness');this.root.style.removeProperty('--transition-shift');
    this.root.querySelector('#page-content').inert=false;
    const after=this.after;this.after=null;this.change=null;after?.();
    const next=this.queued;this.queued=null;if(next)this.run(next.change,next.after);
  }
}
window.LunaPageTransition=LunaPageTransition;

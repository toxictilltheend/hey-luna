'use strict';
class LunaArtRenderer {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.buffers={};this.scene='boot';this.cover=true;this.time=0;this.width=0;this.height=0;this.sceneStart=0;
  for(const [key,url] of Object.entries(window.LUNA_DISPLAY_ART||{})){const img=new Image();img.onload=()=>{this.buffers[key]=img;this.draw();document.dispatchEvent(new CustomEvent('luna-art-ready',{detail:key}));};img.src=url;}
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);
 }
 resize(){this.width=this.canvas.parentElement.clientWidth;this.height=this.canvas.parentElement.clientHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.draw();}
 set(scene,cover=false){if(this.scene!==scene||this.cover!==cover)this.sceneStart=this.time;this.scene=scene;this.cover=cover;this.draw();}
 portrait(key,alpha=1){
  const c=this.ctx,w=this.width,h=this.height,img=this.buffers[key];if(!img)return;
  const identity=this.scene==='boot'&&!this.cover,mobile=w<800;
  const width=identity?Math.min(w*(mobile?.85:.47),780):Math.min(850,w*(mobile?.98:.61));
  const height=width*img.height/img.width,cx=identity?w*(mobile?.5:.25):w*(mobile?.55:.77);
  const cy=mobile?height*.48+15:Math.min(h*.47,440);
  c.save();c.globalAlpha=alpha*(.92+Math.sin(this.time*.0007)*.025);c.drawImage(img,cx-width/2+Math.sin(this.time*.00015)*2,cy-height/2+Math.cos(this.time*.00013)*2,width,height);c.restore();
 }
 digits(progress){
  const map=window.LUCY_DIGITS;if(!map)return;const c=this.ctx,w=this.width,mobile=w<800,size=Math.min(mobile?w*.98:w*.58,820),left=(mobile?w*.5:w*.76)-size/2,top=mobile?5:12,pitch=size/map.cols,chars='0123456789<>:+';
  c.save();c.font=(pitch*.94)+'px Consolas,monospace';c.textAlign='center';c.textBaseline='middle';
  for(let y=0;y<map.rows;y++)for(let x=0;x<map.cols;x++){
   const i=y*map.cols+x,l=map.values[i]/255,seed=((x*73+y*151)%997)/997;
   if(l<.035||seed>progress)continue;
   c.globalAlpha=Math.min(1,l*1.8)*Math.min(1,(progress-seed)*8)*(.86+.14*Math.sin(this.time*.0006+seed*5));
   c.fillStyle=seed>.92?'#ff9edc':'#b7fff4';
   c.fillText(chars[(i+Math.floor(this.time/(1800+seed*2200)))%chars.length],left+(x+.5)*pitch,top+(y+.5)*pitch);
  }c.restore();
 }
 schematic(){
  const c=this.ctx,w=this.width,h=Math.min(this.height,650),x=w*.74;
  c.save();c.strokeStyle='#9aebf5';c.globalAlpha=.065;c.lineWidth=1;
  for(let i=0;i<5;i++){const y=80+i*70;c.strokeRect(x-65+i*7,y,Math.min(220,w*.2),42);c.beginPath();c.moveTo(x,y+42);c.lineTo(x,y+70);c.stroke();}
  c.globalAlpha=.2;c.fillStyle='#ff9edc';const y=82+(this.time*.025)%340;c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();c.restore();
 }
 draw(){
  const c=this.ctx,w=this.width,h=this.height;if(!w||!h)return;c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;
  const historical=['ada','britain','america','grace','shop'].includes(this.scene);
  if(historical){
   const img=this.buffers[this.scene];if(img){
    // Keep the whole source in a stable scene viewport. Text and note expansion
    // must never change the image scale or move a face out of the frame.
    const sceneHeight=w<800?330:Math.min(900,Math.max(730,w*.51));
    const scale=Math.min(w/img.width,sceneHeight/img.height),iw=img.width*scale,ih=img.height*scale;
    c.save();c.drawImage(img,Math.round((w-iw)/2+Math.sin(this.time*.00012)*2),0,iw,ih);
    const fade=c.createLinearGradient(0,0,0,ih);fade.addColorStop(0,'#0b0e101c');fade.addColorStop(.65,'#0b0e1000');fade.addColorStop(1,'#0b0e10cf');c.fillStyle=fade;c.fillRect(0,0,w,ih);c.restore();
   }
  }else if(this.scene==='lucy'){
   const elapsed=(this.time-this.sceneStart)/1000,still=document.documentElement.dataset.motion==='paused';
   const progress=still?1:Math.max(0,Math.min(1,(elapsed-1.5)/3.2));
   if(!still&&elapsed<1.4)this.portrait('luna',Math.max(0,1-elapsed/1.4));
   this.digits(progress);
  }else if(this.cover||['boot','release','reset'].includes(this.scene))this.portrait('luna',.86);
  else if(this.scene.startsWith('ceo')&&this.scene!=='ceo')this.portrait(this.scene,.45);
  else if(this.scene!=='dossier')this.schematic();
 }
 destroy(){this.observer.disconnect();}
 tick(time){this.time=time;this.draw();}
}
window.LunaArtRenderer=LunaArtRenderer;

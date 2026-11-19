import * as THREE from '/vendor/three.module.js';

export function rearViewLayout(width,height){
 const compact=width<=620&&height>width;
 const w=compact?Math.min(300,width*.7):Math.min(340,Math.max(120,width-(width<=800?420:540))),h=w/3.4;
 return {x:Math.round((width-w)/2),y:height<540?8:12,w:Math.round(w),h:Math.round(h),compact};
}
// A small, throttled second camera shares the scene and canvas. It has its own
// render target but never regenerates shadows, weather or environment effects.
export class RearView {
 constructor(renderer){
  this.renderer=renderer;this.enabled=true;this.at=-Infinity;this.size='';this.shown=false;
  this.camera=new THREE.PerspectiveCamera(74,3.4,.3,180);
  this.target=new THREE.WebGLRenderTarget(512,152,{depthBuffer:true,stencilBuffer:false});
  this.target.texture.repeat.x=-1;this.target.texture.offset.x=1;
  this.overlay=new THREE.Scene();this.overlayCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:this.target.texture,depthTest:false,depthWrite:false,toneMapped:false}));this.overlay.add(this.quad);
  this.frame=document.createElement('div');this.frame.className='rear-view';this.frame.setAttribute('role','img');this.frame.setAttribute('aria-label','Live rear-view mirror');this.frame.hidden=true;
  const label=document.createElement('span');label.textContent='REAR VIEW';this.frame.append(label);document.body.append(this.frame);
  if(!document.querySelector('link[data-rear-view-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/rear-view.css';style.dataset.rearViewStyle='';document.head.append(style);}
 }
 render(scene,car,ownModel,visible,now){
  const show=!!(visible&&car&&this.enabled);this.frame.hidden=!show;
  document.body.classList.toggle('rear-view-enabled',show);
  if(!show){document.body.classList.remove('rear-view-compact');this.shown=false;return;}
  const renderer=this.renderer,size=renderer.getSize(new THREE.Vector2()),rect=rearViewLayout(size.x,size.y),key=[size.x,size.y,rect.w,rect.h].join(':');
  document.body.classList.toggle('rear-view-compact',rect.compact);
  if(key!==this.size){this.size=key;Object.assign(this.frame.style,{left:rect.x+'px',top:rect.y+'px',width:rect.w+'px',height:rect.h+'px'});document.body.style.setProperty('--rear-view-bottom',rect.y+rect.h+12+'px');this.camera.aspect=rect.w/rect.h;this.camera.updateProjectionMatrix();this.target.setSize(Math.min(512,Math.round(rect.w*1.25)),Math.min(152,Math.round(rect.h*1.25)));this.at=-Infinity;}
  if(!this.shown)this.at=-Infinity;this.shown=true;
  if(now-this.at>=(renderer.getPixelRatio()<1?1000/15:1000/24)){
   this.at=now;const h=car.heading,p=car.pitch||0,fx=Math.sin(h),fz=Math.cos(h);
   this.camera.position.set(car.x,car.y+1.7,car.z);this.camera.up.set(0,1,0);this.camera.lookAt(car.x-fx*80,car.y+1.3-Math.sin(p)*80,car.z-fz*80);
   const wasVisible=ownModel?.visible,target=renderer.getRenderTarget(),autoShadow=renderer.shadowMap.autoUpdate,reflections=[];
   scene.traverse(object=>{if(object.isReflector){reflections.push([object,object.onBeforeRender]);object.onBeforeRender=()=>{};}});
   if(ownModel)ownModel.visible=false;
   renderer.shadowMap.autoUpdate=false;
   try{renderer.setRenderTarget(this.target);renderer.clear();renderer.render(scene,this.camera);}finally{renderer.setRenderTarget(target);renderer.shadowMap.autoUpdate=autoShadow;for(const [object,callback]of reflections)object.onBeforeRender=callback;if(ownModel)ownModel.visible=wasVisible;}
  }
  const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
  try{renderer.setViewport(rect.x,size.y-rect.y-rect.h,rect.w,rect.h);renderer.setScissor(rect.x,size.y-rect.y-rect.h,rect.w,rect.h);renderer.setScissorTest(true);renderer.autoClear=false;renderer.clearDepth();renderer.render(this.overlay,this.overlayCamera);}finally{renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;}
 }
 reset(){this.at=-Infinity;this.shown=false;this.frame.hidden=true;}
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.quad.material.dispose();this.frame.remove();}
}

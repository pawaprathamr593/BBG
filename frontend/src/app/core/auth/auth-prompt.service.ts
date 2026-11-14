import { Injectable, signal } from '@angular/core';
export interface AuthPromptState{reason:string;top:number;left:number;arrowLeft:number;placement:'below'|'above';}
@Injectable({providedIn:'root'})
export class AuthPromptService{
 readonly prompt=signal<AuthPromptState|null>(null);
 private pendingAction:(()=>void|Promise<void>)|null=null;
 open(reason:string,anchor:HTMLElement,action?:()=>void|Promise<void>):void{
  this.pendingAction=action??null;
  const rect=anchor.getBoundingClientRect(),width=Math.min(390,Math.max(300,window.innerWidth-32)),height=470;
  const left=Math.min(Math.max(16,rect.left+rect.width/2-width/2),window.innerWidth-width-16);
  const placement: 'below'|'above'=window.innerHeight-rect.bottom>=height+20||rect.top<height+20?'below':'above';
  const top=placement==='below'?Math.min(rect.bottom+13,window.innerHeight-90):Math.max(16,rect.top-height-13);
  const arrowLeft=Math.min(Math.max(22,rect.left+rect.width/2-left),width-22);
  this.prompt.set({reason,top,left,arrowLeft,placement});
 }
 close():void{this.prompt.set(null);this.pendingAction=null;}
 async complete():Promise<void>{const action=this.pendingAction;this.close();if(action)await action();}
}

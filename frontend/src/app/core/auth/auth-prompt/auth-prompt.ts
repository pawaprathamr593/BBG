import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { AuthPromptService } from '../auth-prompt.service';
import { AuthPanel } from '../../../features/auth/components/auth-panel/auth-panel';
@Component({selector:'app-auth-prompt',imports:[AuthPanel],templateUrl:'./auth-prompt.html',styleUrl:'./auth-prompt.scss'})
export class AuthPrompt{
 protected readonly promptService=inject(AuthPromptService);
 private readonly element=inject(ElementRef<HTMLElement>);
 protected async onAuthenticated():Promise<void>{await this.promptService.complete();}
 @HostListener('document:keydown.escape') protected onEscape():void{if(this.promptService.prompt())this.promptService.close();}
 @HostListener('document:pointerdown',['$event']) protected onOutsidePointer(event:PointerEvent):void{
  if(!this.promptService.prompt())return;const target=event.target;
  if(target instanceof Node&&!this.element.nativeElement.contains(target))this.promptService.close();
 }
}

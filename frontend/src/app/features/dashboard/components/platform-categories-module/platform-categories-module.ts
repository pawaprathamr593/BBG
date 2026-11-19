import { ChangeDetectionStrategy, Component, DestroyRef, input, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
import { WorkspaceDrawer } from '../../../../shared/workspace-drawer/workspace-drawer';

interface CategoryRecord { [key:string]: unknown; }
interface CategoryForm {
  category_code:string; category_name:string; category_type:'BUSINESS'|'PRODUCT';
  description:string; parent_category_id:string; display_order:string;
}
const emptyForm=():CategoryForm=>({category_code:'',category_name:'',category_type:'BUSINESS',description:'',parent_category_id:'',display_order:'0'});

@Component({
  selector:'app-platform-categories-module',standalone:true,imports:[FormsModule,WorkspaceDrawer],
  changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./platform-categories-module.html',
  styleUrl:'./platform-categories-module.scss',
})
export class PlatformCategoriesModule {
  readonly categories=input<CategoryRecord[]>([]);
  readonly canCreate=input(false);readonly canUpdate=input(false);readonly canDelete=input(false);
  readonly refreshRequested=output<void>();
  readonly totalItems=input(0);readonly currentPage=input(1);readonly pageCount=input(1);readonly loading=input(false);
  readonly pageChange=output<number>();
  readonly drawerOpen=signal(false);readonly editingId=signal<number|null>(null);
  readonly form=signal<CategoryForm>(emptyForm());readonly busy=signal(false);
  readonly error=signal('');readonly notice=signal('');
  private readonly auth=inject(AuthService);
  private readonly destroyRef=inject(DestroyRef);
  private alive=true;
  constructor(){this.destroyRef.onDestroy(()=>{this.alive=false;});}private readonly api=inject(WorkspaceModuleApiService);

  create():void{
    if(!this.canCreate()||this.busy())return;
    this.editingId.set(null);this.form.set(emptyForm());this.error.set('');this.drawerOpen.set(true);
  }
  edit(category:CategoryRecord):void{
    if(!this.canUpdate()||this.busy())return;
    const id=Number(category['category_id']??category['id']??0);if(!id)return;
    this.editingId.set(id);
    this.form.set({
      category_code:String(category['category_code']??''),category_name:String(category['category_name']??''),
      category_type:String(category['category_type']??'BUSINESS').toUpperCase()==='PRODUCT'?'PRODUCT':'BUSINESS',
      description:String(category['description']??''),parent_category_id:category['parent_category_id']==null?'':String(category['parent_category_id']),
      display_order:String(category['display_order']??0),
    });
    this.error.set('');this.drawerOpen.set(true);
  }
  updateField(field:keyof CategoryForm,value:string):void{
    this.form.update(form=>({
      ...form,
      [field]:value,
      ...(field === 'category_type' && value !== form.category_type ? { parent_category_id: '' } : {}),
    }) as CategoryForm);
  }
  async save():Promise<void>{
    const form=this.form(),id=this.editingId();
    const parentId=form.parent_category_id.trim()?Number(form.parent_category_id):null;
    const displayOrder=Number(form.display_order);
    if(!(id===null?this.canCreate():this.canUpdate()))return;
    if(!form.category_code.trim()||!form.category_name.trim()){this.error.set('Category code and name are required.');return;}
    if((parentId!==null&&(!Number.isInteger(parentId)||parentId<1||parentId===id))||!Number.isInteger(displayOrder)||displayOrder<0){
      this.error.set('Choose a valid parent category and enter a non-negative display order.');return;
    }
    if(this.busy())return;this.busy.set(true);this.error.set('');
    const payload={
      category_code:form.category_code.trim().toUpperCase(),category_name:form.category_name.trim(),
      category_type:form.category_type,description:form.description.trim(),parent_category_id:parentId,display_order:displayOrder,
    };
    try{
      await this.api.request(id===null?'/api/v1/admin/categories/create':'/api/v1/admin/categories/update',
        id===null?'createCategory':'updateCategory',id===null?payload:{category_id:id,...payload},'adminParam');
      if(!this.alive)return;
      this.notice.set(id===null?'Category created.':'Category updated.');
      if(!this.alive)return;
      this.drawerOpen.set(false);this.refreshRequested.emit();
    }catch(error){if(this.alive)this.error.set(this.auth.errorMessage(error));}
    finally{if(this.alive)this.busy.set(false);}
  }
  async remove(category:CategoryRecord):Promise<void>{
    if(!this.canDelete()||this.busy())return;
    const id=Number(category['category_id']??category['id']??0);if(!id)return;
    if(!window.confirm('Soft-delete this category? Categories referenced by active businesses or products cannot be deleted.'))return;
    this.busy.set(true);this.error.set('');
    try{
      await this.api.request('/api/v1/admin/categories/delete','deleteCategory',{category_id:id},'adminParam');
      if(!this.alive)return;
      this.notice.set('Category deleted.');this.refreshRequested.emit();
    }catch(error){this.error.set(this.auth.errorMessage(error));}
    finally{this.busy.set(false);}
  }
  parentCategories(): CategoryRecord[] {
    const currentId = this.editingId();
    const type = this.form().category_type;
    const categories = this.categories().filter((category) => {
      const id = Number(category['category_id'] ?? category['id'] ?? 0);
      return id > 0 && id !== currentId
        && String(category['category_type'] ?? 'BUSINESS').toUpperCase() === type;
    });
    const selectedId = Number(this.form().parent_category_id);
    if (selectedId > 0 && !categories.some((category) => this.categoryId(category) === selectedId)) {
      return [{ category_id: selectedId, category_name: 'Current parent category', category_type: type }, ...categories];
    }
    return categories;
  }
  categoryId(category:CategoryRecord):number{return Number(category['category_id']??category['id']??0);}
  name(category:CategoryRecord):string{return String(category['category_name']??'Unnamed category');}
  code(category:CategoryRecord):string{return String(category['category_code']??'');}
  description(category:CategoryRecord):string{return String(category['description']??'No description provided');}
  categoryType(category:CategoryRecord):string{return String(category['category_type']??'BUSINESS');}
}

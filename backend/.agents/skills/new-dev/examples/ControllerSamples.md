path: `protected/modules/api/modules/v1/controllers/<ModuleName>Controller.php`
```php
class <ModuleName>Controller extends V1Controller {

    public function actionGet<ModuleName>() {
        if (ComponentsHttp::httpMethod() == 'POST') {
            <ModuleName>ServicesV1::get<ModuleName>($this->_inDtoArray);
        }
    }

    public function actionManage<ModuleName>() {
        if (ComponentsHttp::httpMethod() == 'POST') {
            <ModuleName>ServicesV1::manage<ModuleName>($this->_inDtoArray);
        }
    }
}
```

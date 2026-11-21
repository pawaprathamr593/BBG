path: `protected/modules/api/modules/v1/services/implementations/<ModuleName>ServicesV1.php`
```php
class <ModuleName>ServicesV1 implements I<ModuleName>ServicesV1 {

    public static function get<ModuleName>($inDtoArray) {
        $<moduleName>InDto = InDtoObjectFactory::create('<ModuleName>InDto', $inDtoArray);
        $resArr = <ModuleName>Services::get<ModuleName>($<moduleName>InDto-><moduleName>Param);
        ComponentsJson::GenerateJsonAndSend($resArr);
    }

    public static function manage<ModuleName>($inDtoArray) {
        $<moduleName>InDto = InDtoObjectFactory::create('<ModuleName>InDto', $inDtoArray);
        $resArr = <ModuleName>Services::manage<ModuleName>($<moduleName>InDto-><moduleName>Param);
        ComponentsJson::GenerateJsonAndSend($resArr);
    }
}
```

path: `protected/modules/api/modules/v1/services/interfaces/I<ModuleName>ServicesV1.php`
```php
interface I<ModuleName>ServicesV1 {
    public static function get<ModuleName>($inDtoArray);
    public static function manage<ModuleName>($inDtoArray);
}
```

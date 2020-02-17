<p align="center">
  <h3 align="center">Typesafe Container</h3>
</p>

-----------

[npm](https://www.npmjs.com/package/typesafe-container)

What is it?
-----------
 `typesafe-container`  is small (<%- sizes.min() %>kb min, <%- sizes.gzip() %>kb min+gzip) library for managing object creation with lifetime management for TypeScript. It relays on TypeScript's implicit type inferring in order to provide full edit-time resolution of dependency graph.

Features
--------
* **edit time resolution**: if container declaration is resolved during edit time then it can resolve objects at runtime
* **object creation freedom**: container user should not know or care if object is created by fetching lazy-loaded script or by just calling `new`
* **minimalistic & transparent**: api is as simple as it gets - object creation can be complex by itself, so it don't add additional layer of complexity on top of it - you see what it does.
* **small footprint**: don't require anything special for object declaration or creation - just separating object creation into different layer. It's simple to add, simple to remove.
* **bundle size friendly**: it will not impact your bundle size on initial addition nor on further usage

Comparison with "proper" DI-containers
--------------------------------------
I tried to create simplest possible way to create and manage object with complex dependencies with taking full advantage of typing system. Let's compare it with existing DI-containers for typescript like [Inversify](https://github.com/inversify/InversifyJS) or [tsyringe](https://github.com/microsoft/tsyringe). Here is example of common way of using Inversify approach:
```typescript
const TYPES = {
    Weapon: Symbol.for('Weapon');
};

@injectable()
class Ninja {
    public constructor(@inject(TYPES.Weapon) private katana: Weapon) {}
}
```
I stumbled upon following problems, while using it:
1. No native runtime typings leads to cumbersome declarations

We cannot just bind interface to it's implementation in a way we would do it in statically-typed languages like C#, since there is no type metadata in compile time (with some exceptions like awesome Angular DI with special AST-parsing magic). So in order to tell container how to resolve arguments, we have to add a this metadata manually in form of `@inject()` attributes. This adds noise to your code and can make even a simple constructor looking complex and hard to read.

2. Requires decorators

You have to emit typescript metadata for each class with dependency. This not only increases application size (quite noticeably sometimes), but also require some not-so-convenient registration call if for some reason you're unable to add decorators.

3. Dynamic nature means limited compile-time typings support

When you're injecting instance by dynamic locator, you're losing compile-time typing support and can get unexpected errors in runtime: developer can write wrong interface or identifier (e.g. `Sword` instead of `Weapon` as `katana` type) and typescript will not be able to warn user about incorrect typing.

That also means, there is no clear indication that some dependencies were broken during container refactoring, since there is no way to automatically check that all types of dependencies are correct.

---
`typesafe-container` is solving all these problems while being very small and simple.


How to use it?
--------------
You can find step-by-step examples below, but feel free to jump straight to [API reference](./docs/reference.md).

### 01. Simple example

```typescript
<%- example("01") %>
```
* container works like service locator that will abstract away details of object creation
* `ContainerBuilder` will provide interface to create container typed container that contains dependencies that are included in modules. In our example it means that `container` will have `currentTime` as method that returns `string`.
* `ContainerBuilder.register()` function is registering new module to container. It accept registration function as argument, which returns object, every field of which is registered dependency. We added `currentTime` as one. For full API description, check [API reference](./docs/reference.md).
* `register.transient` means that we're registering dependency in transient scope. This means that specified factory method will be called every time this object is requested.
* `register.singleton` means that specified factory method will be called first time and will be pulled from cache for other calls. For list of all lifetime scopes, check [API reference](./docs/reference.md).

### 02. Dependency injection & Modules
Let's introduce `currentDate` dependency that will add formatting for our date:
```typescript
<%- example("02") %>
```
* `BaseModule` is just simple implementation for module. As you saw from example earlier, "module" doesn't require any special fields and can be just plain object, but for code structuring & code splitting, we can use this abstraction.
* `register.transient` factory method can receive `container` as argument. It can use it to resolve dependencies that are already registered in container. In our case `timeString` will resolve `currentTime` and add formatting for it.
> NOTE: while you _can_ use `this` to resolve dependencies from current module, I'll recommend using `container` as it will contain typed dependencies from current AND other modules.

You can also use shorthand syntax like this:
```typescript
<%- example("02_1") %>
```

### 03. Module Dependencies
```typescript
<%- example("03") %>
```

* `ContainerBuilder` can register multiple modules into single container and will adjust it's typings accordingly.
* Module can specify it's dependency on other module. In `BaseModule`'s case it it's generic argument.
* Module registration is sequential, so all dependencies of each module have to be satisfied before it can be added.

### 04. Module monikers

We can also add monikers (alternative keys for modules), so whole module can be available by that name *in addition* to global container scope.

```typescript
<%- example("04") %>
```

* You can have multiple monikers as string or symbols for same module

### 05. Custom scopes

If we need to dynamically control lifetime of object, we can use custom scopes:

```typescript
<%- example("05") %>
```

* You can set custom objects lifetime based on `ContainerScope` interface
* `ContainerScope` controls only cache, not object creation. So object will be created on first call regardless of it's value

Hints / Advanced topics
-----------------------

### Dependency on multiple modules
When your module is dependent on multiple other modules, you can simply create intersection type from them:
```typescript
class ModuleA extends BaseModule {}
class ModuleB extends BaseModule {}
class ModuleC extends BaseModule<ModuleA & ModuleC> {}
```

### Dependency on own module: why `this`?
TypeScript compiler refuses to infer the type of an object literal if the inferred type references itself. So in order to reference current module, you have to help it to infer properly. Functions will require explicit `this` as last parameter.

```typescript
class MyModule extends BaseModule {
    foo = this.register.singleton(() => 42);
    // 'this' argument is required to use `foo` there
    bar = this.register.singleton(ctr => ctr.foo(), this);
}
```
This argument will not be actually used in code. It's there just for compiler.
You could also just use `this` instead of `ctr` in that case, but I'll recommend strongly against it. You will have to edit a lot more wiring code after moving dependencies.

### Preventing names collision
Since we have single namespace, you can stumble upon naming collision problem if you have a lot of services. There are some ways to tackle this problem:
1. Using [Module monikers](#04-module-monikers)
2. Using symbols as keys instead of strings inside container (like in Inversify):
```typescript

// ./types/samurai.ts
export const Weapon = Symbol.for('Weapon')

// ./types/bowman.ts
export const Weapon = Symbol.for('Weapon')

// ./container.ts
import * as Samurai from './types/samurai.ts'
import * as Bowman from './types/bowman.ts'

class SamuraiModule extends BaseModule {
    [Samurai.Weapon] = this.register.transient(() => 'Katana')
}

class BowmanModule extends BaseModule {
    [Bowman.Weapon] = this.register.transient(() => 'Bow')
}

const container = new ContainerBuilder()
    .register(r => new SamuraiModule(r))
    .register(r => new BowmanModule(r))
    .getContainer();

console.log(container[Bowman.Weapon]()); // prints 'Bow'
```

Note how I used namespace import to gather all symbols in single object.

In latest on the time of writing TS version (3.5.2), you cannot create structures like this:
```typescript
// This will NOT work (TS 3.5.2)
const TYPES = {
    Weapon: Symbol.for('Weapon')
}
```
`Weapon` will have `symbol` type instead of more specific `typeof TYPES.Weapon`, which means that it cannot be used as a key in your module class.

### Debugging
You can debug resolution & registration by decorating object registrar or your own base module implementation like so:
```typescript

function echanceFn(fn: any, key: string) {
    return function (...args) {
        console.log(key, 'registering')
        let result = fn(...args);
        if (typeof result == 'function') {
            return function(...args) {
                console.log(key, 'resolving');
                let r = result(...args);
                console.log(key, 'resolved', r);
                return r;
            }
        }
        return result
    };
}

function addLogging<T>(registrar: ModuleRegistrar<T>): ModuleRegistrar<T> {
    let enchanced = {} as any;
    for (let key in registrar) {
        enchanced[key] = echanceFn(t[key], key);
    }
    return enchanced;
}

class LoggableModule<T = {}> extends BaseModule<T> {
    constructor(register: ModuleRegistrar<T>) {
        super(addLogging(register));
        // this will print module class name
        console.log("Registering " + (this.constructor as any).name);
    }
}

new ContainerBuilder({ decorateRegistrar: addLogging })
    //...
```
By using this simple trick, you will get log entries on every module registration and every module registration and every dependency resolving.

Contributing
------------
Issues & PRs are welcome! But please mind code style & tests.

License
-------
MIT

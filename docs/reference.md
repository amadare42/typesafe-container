# API reference

## ContainerBuilder
`ContainerBuilder` is object that provide API to create container from its modules.

### `new ContainerBuilder(config: ContainerBuilderConfig)`

on builder creation you can provide following options:

#### container: any

existing container that will be used instead of new one. Please note, using this option can lead to unpredictable behavior if keys will be overridden called during async object resolution

#### onNameCollision: "throw" | "override"

specify what to do when dependency key that module adds already exists. Default value: `throw`.

#### decorateRegistrar: (registrar: ModuleRegistrar) => ModuleRegistrar

higher order function that can be used to enhance existing registrar behavior


### `ContainerBuilder.register<TModule>(registerFn: (registrar) => TModule)`

Here is object registration api: `register.<scope>(<factory>[,<monikers>])`.

#### factory
`(ctx: TContainer) => TObj`

`(ctx: TContainer, arg: TArg) => TObj`

Factory function that creates object. Can contain argument that was provided on resolution.

#### monikers

`[string | symbol]`

If provided, module will be registered not only in container root, but also under monikers keys

#### scope
Each time object is referenced, it will be either created or pulled from cache. Scope defines caching behavior.

### `ContainerBuilder.getContainer(): TContainer`

Will return container object that have type of all intersecting modules.

## Scopes

#### transient
`(factory: (ctx: TContainer) => TObj): () => TObj`

calls factory method on every call. You can also add argument to factory method using this signature:

`(factory: (ctx: TContainer, arg: TArg) => TObj): (arg: TArg) => TObj`


#### transientAsync
`(waitFor: (ctr: TContainer) => Promise<TValue>, factory: (ctr: TContainer, obj: TValue) => TObj) => () => Promise<TObj>`

calls factory method on every call. Waits for dependent value. It can be used to keep factory method synchronous

#### singleton
`(factory: (ctx: TContainer) => TObj): () => TObj`

calls factory method on init and then returns cached value

#### const
`(value: TObj) => TObj`

in oppose to other scopes, will return constant value instead of method

#### inScopeOf
`<TScope extends ContainerScope>(getScope: (...) => TScope, factory: (ctr) => TObj)`

cache will be managed by your custom scope. You can also use argumented factory.

#### inAsyncScopeOf
`inAsyncScopeOf(getScope: (...) => TScope | Promise<TScope>, factory: (ctr) => TObj | Promise<TObj>)`

async version of `inScopeOf`. `TScope` can be either sync or async. It have argumented factory support as well.

When using `inAsyncScopeOf` result will always be `Promise`.

## ContainerScope & ContainerScopeAsync

```
{
    shouldCreateNew(metadata: { arg?: any }): bool | Promise<bool>
}
```

Represents custom scope. It is called for scoped objects when value is saved to cache (on seconds call and later). It returns boolean flag or promise of it that determines whether or not use value from cache.

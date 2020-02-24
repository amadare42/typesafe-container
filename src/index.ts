type Ctr<TContainer> = Omit<TContainer, 'register'>;

export interface ObjectRegistrationFunc<TContainer> {
    <T>(factory: (ctx: TContainer) => T): () => T;

    <T, TArg>(factory: (ctx: TContainer, arg: TArg) => T): (arg: TArg) => T;

    <T, This>(factory: (ctx: Ctr<TContainer & This>) => T, _this: This): () => T;

    <T, TArg, This>(factory: (ctx: Ctr<TContainer & This>, arg: TArg, _this: This) => T): (arg: TArg) => T;
}

export interface ObjectRegistrationFuncAsync<TContainer> {
    <TObj, T, This>(
        waitFor: ((ctr: Ctr<TContainer>) => Promise<TObj>),
        factory: (ctr: Ctr<TContainer>, obj: TObj) => T
    ): () => Promise<T>;

    <TObj, T, This>(
        waitFor: ((ctr: Ctr<TContainer & This>) => Promise<TObj>),
        factory: (ctr: Ctr<TContainer & This>, obj: TObj) => T,
        _this: This
    ): () => Promise<T>;
}

export type ContainerScopeMetadata = {
    arg?: any;
}

export interface ContainerScope {
    shouldCreateNew(metadata: ContainerScopeMetadata): boolean;
}

export interface ContainerScopeAsync {
    shouldCreateNew(metadata: ContainerScopeMetadata): Promise<boolean>;
}

export type AnyContainerScope = ContainerScope | ContainerScopeAsync;

export interface IsAsyncScopeOfFunc<TContainer> {
    // async container
    <TScope extends AnyContainerScope, T>(
        getScope: (ctr: Ctr<TContainer>) => TScope | Promise<TScope>,
        factory: (ctx: Ctr<TContainer>) => T | Promise<T>
    ): () => Promise<T>;

    <TScope extends AnyContainerScope, T, This>(
        getScope: (ctr: Ctr<TContainer & This>) => TScope | Promise<TScope>,
        factory: (ctx: Ctr<TContainer & This>) => T | Promise<T>,
        _this: This
    ): () => Promise<T>;

    <TScope extends AnyContainerScope, TArg, TValue>(
        getScope: (ctr: Ctr<TContainer>) => TScope | Promise<TScope>,
        factory: (ctx: Ctr<TContainer>, arg: TArg) => TValue | Promise<TValue>
    ): (arg: TArg) => Promise<TValue>;

    <TScope extends AnyContainerScope, TArg, TValue, This>(
        getScope: (ctr: Ctr<TContainer & This>) => TScope | Promise<TScope>,
        factory: (ctx: Ctr<TContainer & This>, arg: TArg) => TValue | Promise<TValue>,
        _this: This
    ): (arg: TArg) => Promise<TValue>;


    // async getScope
    <TScope extends AnyContainerScope, T>(getScope: (ctr: Ctr<TContainer>) => Promise<TScope>,
                                          factory: (ctx: Ctr<TContainer>) => T | Promise<T>
    ): () => Promise<T>;

    <TScope extends AnyContainerScope, T, This>(getScope: (ctr: Ctr<TContainer & This>) => Promise<TScope>,
                                                factory: (ctx: Ctr<TContainer & This>) => T | Promise<T>,
                                                _this: This
    ): () => Promise<T>;

    <TScope extends AnyContainerScope, TArg, TValue, This>(getScope: (ctr: Ctr<TContainer & This>) => Promise<TScope>,
                                                           factory: (ctx: Ctr<TContainer & This>, arg: TArg) => TValue | Promise<TValue>,
                                                           _this: This
    ): (arg: TArg) => Promise<TValue>;
}


export interface IsScopeOfFunc<TContainer> {
    <TScope extends ContainerScope, T>(getScope: (ctr: Ctr<TContainer>) => TScope,
                                       factory: (ctx: Ctr<TContainer>) => T
    ): () => T;

    <TScope extends ContainerScope, TArg, TValue>(getScope: (ctr: Ctr<TContainer>) => TScope,
                                                  factory: (ctx: Ctr<TContainer>, arg: TArg) => TValue
    ): (arg: TArg) => TValue;

    <TScope extends ContainerScope, T, This>(getScope: (ctr: Ctr<TContainer & This>) => TScope,
                                             factory: (ctr: Ctr<TContainer & This>) => T,
                                             _this: This
    ): () => T;

    <TScope extends ContainerScope, TArg, TValue, This>(
        getScope: (ctr: Ctr<TContainer & This>) => TScope,
        factory: (ctr: Ctr<TContainer & This>, arg: TArg) => TValue,
        _this: This
    ): (arg: TArg) => TValue;
}

export interface ModuleRegistrar<TContainer> {
    /** Register object as singleton. It will be created on first call and reused for all other calls */
    singleton: ObjectRegistrationFunc<TContainer>;
    /** Register object as singleton. It will be created on first call and reused for all other calls */
    singletonAsync: ObjectRegistrationFuncAsync<TContainer>;
    // TODO: add singletonArg. Manage caching with different args, but avoid memory leaks

    /** Register object as transient. It will be created on every call */
    transient: ObjectRegistrationFunc<TContainer>;
    /** Register object as transient. It will be created on every call */
    transientAsync: ObjectRegistrationFuncAsync<TContainer>;

    /** Register object in custom scope. It recreating behavior will be controller by this scope */
    inScopeOf: IsScopeOfFunc<TContainer>;
    /** Register object in custom scope. It recreating behavior will be controller by this scope */
    inAsyncScopeOf: IsAsyncScopeOfFunc<TContainer>;

    /** Register object as const. */
    const: <T>(value: T) => T;
}

export type RegisterModuleFunc<TRequired, TModule> = (c: ModuleRegistrar<TRequired>) => TModule;


export type CollisionStrategy = 'throw' | 'override';

interface ContainerBuilderConfig<TContainerData = {}, TModuleRegistrar extends ModuleRegistrar<TContainerData> = ModuleRegistrar<TContainerData>> {
    /** existing provider. Will be enhanced with following registers. */
    container?: TContainerData;

    /** global behavior on what to do when dependency names are colliding within container. */
    onNameCollision?: CollisionStrategy;

    decorateRegistrar?: (registrar: ModuleRegistrar<any>) => ModuleRegistrar<any>;

    decorateModule?: (module: Module<any>) => Module<any>;
}

export type Moniker = string | symbol;

export const registrarKey = Symbol.for('registrar');
export const skipKey = Symbol.for('skip');

interface InternalRegFn {
    (ctr: any, thisOrArg?: any, _this?: any): any;
}

export class ContainerBuilder<TContainerData extends {}> {
    private readonly container: any = {};
    private readonly collisionStrategy: CollisionStrategy;
    private readonly registrar: ModuleRegistrar<any>;
    private readonly decorateModule: (module: any) => void;

    constructor(config: ContainerBuilderConfig<TContainerData> = {}) {
        const container = config.container || {};
        this.container = container;
        this.collisionStrategy = config.onNameCollision || 'throw';
        this.decorateModule = config.decorateModule as any;
        this.registrar = this.createRegistrar(container, config);
    }

    /** register module as class */
    module<TModule extends BaseModule<TRequired>, TRequired = TContainerData>
    (ctor: { new(register: ModuleRegistrar<TRequired>): TModule })
        : ContainerBuilder<TContainerData & Omit<TModule, 'register'>>;

    /** register module as class with monikers*/
    module<TModule extends BaseModule<TRequired>, TMoniker extends Moniker, TRequired = TContainerData>
    (ctor: { new(register: ModuleRegistrar<TRequired>): TModule }, monikers: TMoniker[])
        : ContainerBuilder<TContainerData & Omit<TModule, 'register'> & { [key in TMoniker]: Omit<TModule, 'register'> }>;

    module(ctor: any, monikers?: string[]) {
        return this.register<any, any>(r => new ctor(r), monikers);
    }

    /** register module */
    register<TModule, TRequired = TContainerData>
    (register: RegisterModuleFunc<TRequired & TContainerData, TModule>)
        : ContainerBuilder<TContainerData & TModule>

    /** register module with monikers*/
    register<TModule, TMoniker extends Moniker, TRequired = TContainerData>
    (register: RegisterModuleFunc<TRequired & TContainerData, TModule>, monikers: TMoniker[])
        : ContainerBuilder<TContainerData & TModule & { [key in TMoniker]: TModule }>

    register(register: any, monikers?: Moniker[]): any {
        let moduleObj = register(this.registrar);
        let skipKeys: string[] = moduleObj[skipKey];
        for (const key in moduleObj) {
            if (!moduleObj.hasOwnProperty(key)) continue;
            if (skipKeys && skipKeys.indexOf(key) >= 0) continue;

            const value = moduleObj[key];

            // skipping service property
            if (value == this.registrar) continue;
            if (this.collisionStrategy == 'throw' && this.container.hasOwnProperty(key)) {
                throw new Error(`Name collision: service '${ key }'.`);
            }
            this.container[key] = value;
        }
        if (this.decorateModule) {
            moduleObj = this.decorateModule(moduleObj);
        }
        if (monikers) {
            for (const moniker of monikers) {
                this.container[moniker] = moduleObj;
            }
        }
        return this as any;
    }

    private createRegistrar(container: any, config: ContainerBuilderConfig<TContainerData>) {
        let registrar = {
            singleton: this.createSingleton(container),
            singletonAsync: this.createSingletonAsync(container),
            transient: this.createTransient(container),
            transientAsync: this.createTransientAsync(container),
            inScopeOf: this.createInScopeOf(container, false),
            inAsyncScopeOf: this.createInScopeOf(container, true),
            const: value => value,
        };
        if (config.decorateRegistrar) {
            registrar = config.decorateRegistrar(registrar);
        }
        for (let key in registrar) {
            if (typeof registrar[key] == 'function') {
                registrar[key][registrarKey] = registrar;
            }
        }
        return registrar;
    }

    private createTransientAsync = (ctr: any) => (
        waitFor: ((ctr: TContainerData) => Promise<any>),
        factory: (ctr: any, obj: any) => any
    ) => {
        return () => waitFor(ctr).then(obj => factory(ctr, obj));
    };

    private createSingleton = (ctr: any) => (factory: InternalRegFn) => {
        return (function (factory) {
            let instance;
            return (argOrThis?) => {
                let arg = argOrThis == ctr ? undefined : argOrThis;
                if (instance == undefined) instance = factory(ctr, arg);
                return instance;
            };
        })(factory);
    };

    private createSingletonAsync = (ctr: any) => (
        waitFor: ((ctr: TContainerData) => Promise<any>),
        factory: (ctr: any, obj: any) => any
    ) => {
        return (function (factory) {
            let instance;
            return () => waitFor(ctr).then(obj => {
                if (instance == undefined) instance = factory(ctr, obj);
                return instance;
            });
        })(factory);
    };

    private createInScopeOf = (ctr: any, isAsync: boolean) => {
        return (getScope: (ctr: any) => any, factory: (ctr: any, arg?: any) => any) => {
            // TODO: improve caching with arguments
            return (function (getScope, factory, tags) {
                let instance;
                return (argOrThis?) => {
                    let arg = argOrThis == ctr ? undefined : argOrThis;
                    const valuePromise = (async function (ctr, getScope, factory) {

                        if (instance !== undefined) {
                            let scope: AnyContainerScope = getScope(ctr);
                            if (scope instanceof Promise) {
                                isAsync = true;
                                scope = await scope;
                            }
                            let shouldCreateNew = scope.shouldCreateNew({ arg });
                            if (shouldCreateNew instanceof Promise) {
                                isAsync = true;
                                shouldCreateNew = await shouldCreateNew;
                            }

                            if (!shouldCreateNew) {
                                return instance;
                            }
                        }

                        instance = factory(ctr, arg);
                        if (instance instanceof Promise) isAsync = true;
                        return instance;
                    })(ctr, getScope, factory);
                    return isAsync ? valuePromise : instance
                }
            })(getScope, factory);
        }
    };

    private createTransient = (ctr: any) => {
        return factory => function (argOrThis?) {
            let arg = argOrThis == ctr ? undefined : argOrThis;
            return factory(ctr, arg)
        };
    };

    getContainer(): TContainerData {
        return this.container;
    }
}

export interface Module<TContext = {}> {
    register: ModuleRegistrar<TContext>;
}

export abstract class StatefulModule<TState, TContext = {}> implements Module<TContext> {
    [skipKey] = ['state'];

    constructor(public register: ModuleRegistrar<TContext>, protected state: TState) {
        this.register = register as any;
    }
}

export abstract class BaseModule<TContext = {}> implements Module<TContext> {
    constructor(public register: ModuleRegistrar<TContext>) {}
}

export interface ObjectRegistrationFunc<TContainer> {
    <T>(factory: (ctx: TContainer) => T): () => T;
    <T, TArg>(factory: (ctx: TContainer, arg: TArg) => T): (arg: TArg) => T;
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
        getScope: (ctr: TContainer) => TScope | Promise<TScope>,
        factory: (ctx: TContainer) => T | Promise<T>
    ): () => Promise<T>;
    <TScope extends AnyContainerScope, TArg, TValue>(
        getScope: (ctr: TContainer) => TScope | Promise<TScope>,
        factory: (ctx: TContainer, arg: TArg) => TValue | Promise<TValue>
    ): (arg: TArg) => Promise<TValue>;


    // async getScope
    <TScope extends AnyContainerScope, T>(getScope: (ctr: TContainer) => Promise<TScope>,
                                       factory: (ctx: TContainer) => T | Promise<T>
    ): () => Promise<T>;
    <TScope extends AnyContainerScope, TArg, TValue>(getScope: (ctr: TContainer) => Promise<TScope>,
                                                  factory: (ctx: TContainer, arg: TArg) => TValue | Promise<TValue>
    ): (arg: TArg) => Promise<TValue>;
}


export interface IsScopeOfFunc<TContainer> {
    <TScope extends ContainerScope, T>(getScope: (ctr: TContainer) => TScope,
                                       factory: (ctx: TContainer) => T
    ): () => T;
    <TScope extends ContainerScope, TArg, TValue>(getScope: (ctr: TContainer) => TScope,
                                       factory: (ctx: TContainer, arg: TArg) => TValue
    ): (arg: TArg) => TValue;
}

export interface ModuleRegistrar<TContainer> {
    /** Register object as singleton. It will be created on first call and reused for all other calls */
    singleton: ObjectRegistrationFunc<TContainer>;
    /** Register object as singleton. It will be created on first call and reused for all other calls */
    singletonAsync: <TObj, T>(waitFor: ((ctr: TContainer) => Promise<TObj>), factory: (ctr: TContainer, obj: TObj) => T) => () => Promise<T>;
    // TODO: add singletonArg. Manage caching with different args, but avoid memory leaks

    /** Register object as transient. It will be created on every call */
    transient: ObjectRegistrationFunc<TContainer>;
    /** Register object as transient. It will be created on every call */
    transientAsync: <TValue, TObj>(waitFor: (ctr: TContainer) => Promise<TValue>, factory: (ctr: TContainer, value: TValue) => TObj) => () => Promise<TObj>;

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

    /** register module */
    register<TModule, TRequired = TContainerData>
        (register: RegisterModuleFunc<TRequired & TContainerData, TModule>)
        : ContainerBuilder<TContainerData & TModule>

    /** register module with monikers*/
    register<TModule, TMoniker extends Moniker, TRequired = TContainerData>
        (register: RegisterModuleFunc<TRequired & TContainerData, TModule>, monikers: TMoniker[])
        : ContainerBuilder<TContainerData & TModule & { [key in TMoniker]: TModule}>

    register(register: any, monikers?: Moniker[]): any {
        let moduleObj = register(this.registrar);
        for (const key in moduleObj) {
            if (!moduleObj.hasOwnProperty(key)) continue;
            const value = moduleObj[key];

            // skipping service property
            if (value == this.registrar) continue;
            if (this.collisionStrategy == 'throw' && this.container.hasOwnProperty(key))  {
                throw new Error(`Name collision: service '${key}'.`);
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

    private createSingleton = (ctr: any) => (factory: (ctr: any, arg?: any) => any) => {
        return (function (factory) {
            let instance;
            return (arg?) => {
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
        return (function(getScope, factory, tags) {
            let instance;
            return (arg?) => {
                const valuePromise = (async function (ctr, getScope, factory) {

                    if (instance !== undefined) {
                        let scope: AnyContainerScope = getScope(ctr);
                        if (scope instanceof Promise) {
                            isAsync = true;
                            scope = await scope;
                        }
                        let shouldCreateNew = scope.shouldCreateNew({arg});
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
    } };

    private createTransient = (ctr: any) => {
        return factory => function (a?) {
            return factory(ctr, a)
        };
    };

    getContainer(): TContainerData {
        return this.container;
    }
}

export interface Module<TContext = {}> {
    register: ModuleRegistrar<TContext & this>;
}

export abstract class BaseModule<TContext = {}> implements Module<TContext>{
    public register: ModuleRegistrar<TContext & this>;
    constructor(register: ModuleRegistrar<TContext>) {
        this.register = register as any;
    }
}

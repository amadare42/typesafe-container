export interface ObjectRegistrationFunc<TContainer> {
    <T>(factory: (ctx: TContainer) => T): () => T;
}
export interface ArgObjectRegistrationFunc<TContainer> {
    <T, TArg>(factory: (ctx: TContainer, arg: TArg) => T): (arg: TArg) => T;
}

export interface ModuleRegistrar<TContainer> {
    /** Register object as singleton. It will be created on first call and reused for all other calls */
    singleton: ObjectRegistrationFunc<TContainer>;
    /** Register object as singleton. It will be created on first call and reused for all other calls */
    singletonAsync: <TObj, T>(waitFor: ((ctr: TContainer) => Promise<TObj>), factory: (ctr: TContainer, obj: TObj) => T) => () => Promise<T>;
    // TODO: add singletonArg. Manage caching with different args, but avoid memory leaks

    /** Register object as transient. It will be created on every call */
    transient: ObjectRegistrationFunc<TContainer>;
    /** Register object as transient with required argument. It will be created on every call */
    transientArg: ArgObjectRegistrationFunc<TContainer>;
    /** Register object as transient. It will be created on every call */
    transientAsync: <TObj, T>(waitFor: ((ctr: TContainer) => Promise<TObj>), factory: (ctr: TContainer, obj: TObj) => T) => () => Promise<T>;

    /** Register object as const. */
    const: <T>(value: T) => T;
}

export type RegisterModuleFunc<TRequired, TModule> = (c: ModuleRegistrar<TRequired>) => TModule;

export type CollisionStrategy = 'throw' | 'override';

interface ContainerBuilderConfig<TContainerData = {}> {
    /** existing provider. Will be enhanced with following registers. */
    container?: TContainerData;

    /** global behavior on what to do when dependency names are colliding within container. */
    onNameCollision?: CollisionStrategy;
}

export class ContainerBuilder<TContainerData = {}> {
    private readonly container: any = {};
    private readonly collisionStrategy: CollisionStrategy;
    private readonly registrar: ModuleRegistrar<any>;

    constructor(config: ContainerBuilderConfig<TContainerData> = {}) {
        const container = config.container || {};
        this.container = container;
        this.collisionStrategy = config.onNameCollision || 'throw';

        this.registrar = {
            singleton: this.createSingleton(container),
            singletonAsync: this.createSingletonAsync(container),
            transient: factory => () => factory(container),
            transientAsync: this.createTransientAsync(container),
            transientArg: factory => a => factory(container, a),
            const: value => value
        }
    }

    /** register module */
    register<TModule, TRequired = TContainerData>(register: RegisterModuleFunc<TRequired & TContainerData, TModule>): ContainerBuilder<TContainerData & TModule> {
        let moduleObj = register(this.registrar) as any;
        for (let key in moduleObj) {
            if (!moduleObj.hasOwnProperty(key)) continue;
            let value = moduleObj[key];

            // skipping service property
            if (value == this.registrar) continue;
            if (this.collisionStrategy == 'throw' && this.container.hasOwnProperty(key))  {
                throw new Error(`Name collision: service '${key}'.`);
            }
            this.container[key] = value;
        }
        return this as any;
    }

    private createTransientAsync = (ctr: any) => (
        waitFor: ((ctr: TContainerData) => Promise<any>),
        factory: (ctr: any, obj: any) => any
    ) => {
        return () => waitFor(ctr).then(obj => factory(ctr, obj));
    };

    private createSingleton = (ctr: any) => (factory: (ctr: any) => any) => {
        return (function (factory) {
            let instance;
            return () => {
                if (instance == undefined) instance = factory(ctr);
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
        console.log("Registering " + (this.constructor as any).name);
        this.register = register as any;
    }
}

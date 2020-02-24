import { BaseModule, ContainerBuilder, StatefulModule } from '../src';

describe('ContainerBuilder', () => {
    it('should build basic functioning container', () => {
        const sut = new ContainerBuilder()
            .register(r => ({ a: r.transient(() => 42 )}))
            .getContainer();

        expect(sut.a()).toBe(42);
    });

    it('should throw on name collision by default', () => {
        const act = () => {
            new ContainerBuilder()
                .register(r => ({ a: r.const('a') }))
                .register(r => ({ a: r.const('b') }))
                .getContainer();
        };

        expect(act).toThrowError('collision');
    });

    it('should override dependencies on name collision', () => {
        class Module extends BaseModule {
            a = this.register.const(1);
            b = this.register.transient(c => c.a + '!', this);
        }

        const container = new ContainerBuilder({ onNameCollision: 'override' })
            .register(r => new Module(r))
            .register(r => ({ a: r.const(42) }))
            .getContainer();

        expect(container.b()).toBe('42!');
    });

    it('should manage dependencies from different modules', () => {
        const sut = new ContainerBuilder()
            .register(r => ({ a: r.const('a') }))
            .register(r => ({ ab: r.transient(ctx => ctx.a + 'b')}))
            .getContainer();

        expect(sut.ab()).toBe('ab');
    });

    it('should enhance existing container', () => {
        const containerA = new ContainerBuilder()
            .register(r => ({ a: r.const('a') }))
            .register(r => ({ b: r.const('b') }))
            .getContainer();

        const containerB = new ContainerBuilder({ container: containerA })
            .register(r => ({ ab: r.transient(ctx => ctx.a + ctx.b) }))
            .getContainer();

        const ab = containerB.ab();
        expect(ab).toBe('ab');
    });
});

describe('module monikers', () => {

    class ModuleA extends BaseModule {
        a = this.register.transient(() => 'a');
    }


    it('should work with string keys', () => {
        class ModuleB extends BaseModule<{ moduleA: ModuleA }> {
            ab = this.register.transient(({moduleA}) => moduleA.a() + 'b');
        }

        const container = new ContainerBuilder()
            .register(r => new ModuleA(r), ['moduleA'])
            .register(r => new ModuleB(r))
            .getContainer();

        expect(container.ab()).toBe('ab');
    });

    it('should work with symbol keys', () => {

        const moduleA = Symbol.for('moduleA');

        class ModuleB extends BaseModule<{ [moduleA]: ModuleA }> {
            ab = this.register.transient(({[moduleA]: { a }}) => a() + 'b');
        }

        const container = new ContainerBuilder()
            .register(r => new ModuleA(r), [moduleA])
            .register(r => new ModuleB(r))
            .getContainer();

        expect(container.ab()).toBe('ab');

    });

    it('should work with module classes', () => {
        const container = new ContainerBuilder()
            .module(ModuleA)
            .register(r => ({
                b: r.singleton(ctr => ctr.a() + 'b')
            }))
            .getContainer();

        expect(container.b()).toBe('ab');
    });
    
    it('should work with module classes with monikers', () => {
        const container = new ContainerBuilder()
            .module(ModuleA, ['moduleA'])
            .register(r => ({
                b: r.singleton(ctr => ctr.moduleA.a() + 'b')
            }))
            .getContainer();

        expect(container.b()).toBe('ab');
    })
});

describe('stateful module', () => {
    interface MyState {
        foo: string,
        bar: number
    }

    class MyStatefulModule extends StatefulModule<MyState> {
        a = this.register.singleton(() => this.state.foo + this.state.bar);
    }

    it('should resolve state with "this"', () => {
        let state = {
            foo: 'foo',
            bar: 42
        };

        let container = new ContainerBuilder()
            .register(r => new MyStatefulModule(r, state))
            .getContainer();

        expect(container.a()).toBe('foo42');
    });

    it('should not collide with other stateful modules', () => {
        class MyOtherStatefulModule extends StatefulModule<MyState> {
            b = this.register.singleton(() => this.state.foo + this.state.bar);
        }
        let state1 = {
            foo: 'foo',
            bar: 42
        };
        let state2 = {
            foo: 'bar',
            bar: 43
        };

        let container = new ContainerBuilder()
            .register(r => new MyStatefulModule(r, state1))
            .register(r => new MyOtherStatefulModule(r, state2))
            .getContainer();

        console.log(Object.keys(container.a));

        expect(container.a()).toBe('foo42');
        expect(container.b()).toBe('bar43');
    })
});

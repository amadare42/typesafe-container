import { BaseModule, ContainerBuilder } from '../index';

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
            b = this.register.transient(c => c.a + '!');
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
});

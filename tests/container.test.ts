import { BaseModule, ContainerBuilder } from '../index';
import { TypeTester } from 'type-tester/dist';
import * as typescript from 'typescript';
import * as path from 'path';

describe('Typings', () => {
    new TypeTester(typescript).verify(
        [path.resolve(__dirname, './testTypesDeclaration.ts')],
        {}
    )
});

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
            b = this.register.transient(c => c.a + '!')
        }

        const container = new ContainerBuilder({ onNameCollision: 'override' })
            .register(r => new Module(r))
            .register(r => ({ a: r.const(42) }))
            .getContainer();

        expect(container.b()).toBe("42!");
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

describe('transient registrar', () => {
    it('should recreate objects every time', () => {
        let i = 0;

        const container = new ContainerBuilder()
            .register(r => ({ a: r.transient(() => i++ )}))
            .getContainer();

        expect(container.a()).toBe(0);
        expect(container.a()).toBe(1);
    });

    it('should wait for async dependency', async () => {
        let resolvePromise: (n: number) => void;
        let promise = new Promise<number>(r => resolvePromise = r);

        const container = new ContainerBuilder()
            .register(r => ({ a: r.transient(() => promise) }))
            .register(r => ({ b: r.transientAsync(c => c.a(), (c, a) => a + 1)}))
            .register(r => ({ c: r.transient(async (c) => await c.b() + 5)}))
            .getContainer();

        let resultPromise = container.b();
        resolvePromise(1);
        expect(await resultPromise).toBe(2);
        expect(await container.c()).toBe(7);
    });

    it('should create instances with argument', () => {
        const container = new ContainerBuilder()
            .register(r => ({ a: r.transientArg((ctx, a: number) => a + 4 )}))
            .getContainer();

        expect(container.a(1)).toBe(5);
    });
});

describe('singleton registrar', () => {
    it('should keep instance between calls', () => {
        let i = 0;

        const container = new ContainerBuilder()
            .register(r => ({ a: r.singleton(() => i++)}))
            .getContainer();

        expect(container.a()).toBe(0);
        expect(container.a()).toBe(0);
    });

    it('should wait for async dependency', async () => {
        let resolvePromise: (n: number) => void;
        let promise = new Promise<number>(r => resolvePromise = r);

        const container = new ContainerBuilder()
            .register(r => ({ a: r.transient(() => promise) }))
            .register(r => ({ b: r.singletonAsync(c => c.a(), (c, a) => a + 1)}))
            .getContainer();

        let resultPromise = container.b();
        resolvePromise(1);
        expect(await resultPromise).toBe(2);
        expect(await container.b()).toBe(2);
    });
});

import { ContainerBuilder } from '../index';


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
        let resolvePromise: (n: number) => void = () => {};
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
            .register(r => ({ a: r.transient((ctx, a: number) => a + 4 )}))
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
        let resolvePromise: (n: number) => void = () => {};
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

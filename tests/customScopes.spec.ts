import { ContainerBuilder, ContainerScope } from '../index';

describe('custom scopes', () => {
    it('should create new values only when scope updated', () => {

        // arrange
        let shouldCreateNew = false;
        let scope: ContainerScope = {
            shouldCreateNew: () => shouldCreateNew
        };
        let value = 0;

        const container = new ContainerBuilder()
            .register(r => ({
                value: r.inScopeOf(() => scope, () => value++)
            }))
            .getContainer();

        // act & assert
        expect(container.value()).toBe(0);
        expect(container.value()).toBe(0);
        shouldCreateNew = true;
        expect(container.value()).toBe(1);
        expect(container.value()).toBe(2);
        shouldCreateNew = false;
        expect(container.value()).toBe(2);
    });

    it('should pass factory argument', () => {
        // arrange
        let scope = {
            shouldCreateNew: jest.fn(() => true)
        };

        const container = new ContainerBuilder()
            .register(r => ({
                value: r.inScopeOf(() => scope, (ctr, v: string) => v)
            }))
            .getContainer();

        // act
        container.value('this arg will not be sent to scope');
        container.value('test-arg');

        // assert
        expect(scope.shouldCreateNew).toBeCalledWith({ arg: 'test-arg' });
    });

    it('should return promise for cached values if getScope() is async', async () => {
        // arrange
        let scope = {
            shouldCreateNew: () => false
        };

        const container = new ContainerBuilder()
            .register(r => ({
                value: r.inAsyncScopeOf(async () => scope, () => 42)
            }))
            .getContainer();

        // act
        await container.value();
        let result = container.value();

        // assert
        expect(result).toBeInstanceOf(Promise);
        expect(await result).toBe(42);
    });

    it('should return promise for cached values if shouldCreateNew() is async', async () => {
        // arrange
        let scope = {
            shouldCreateNew: async () => false
        };

        const container = new ContainerBuilder()
            .register(r => ({
                value: r.inAsyncScopeOf(() => scope, () => 42)
            }))
            .getContainer();

        // act
        await container.value();
        let result = container.value();

        // assert
        expect(result).toBeInstanceOf(Promise);
        expect(await result).toBe(42);
    });

    it('should return promise for cached values if factory is async', async () => {
        // arrange
        let scope = {
            shouldCreateNew: () => false
        };

        const container = new ContainerBuilder()
            .register(r => ({
                value: r.inScopeOf(() => scope, async () => 42)
            }))
            .getContainer();

        // act
        await container.value();
        let result = container.value();

        // assert
        expect(result).toBeInstanceOf(Promise);
        expect(await result).toBe(42);
    });
});

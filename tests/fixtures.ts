import { BaseModule, ContainerBuilder } from '../src';

class ModuleA extends BaseModule {
    a = () => 'a';
}

class ModuleB extends BaseModule<ModuleA> {
    ab = this.register.transient((ctx) => ctx.a() + 'b');
}

class ModuleAB extends BaseModule<ModuleA & ModuleB> {
    c = this.register.transient(() => 'c');
    abc = this.register.transient(ctx => ctx.ab() + ctx.c(), this);
}

// [TEST CASE] this should fail since ModuleB wasn't registered
new ContainerBuilder()
    .register(c => new ModuleA(c))
    .register(c => new ModuleAB(c)); //@expected 2345

// [TEST CASE] there should be no errors on creating value
let abc = new ContainerBuilder()
    .register(c => new ModuleA(c))
    .register(c => new ModuleB(c))
    .register(c => new ModuleAB(c))
    .getContainer()
    .abc();

// [TEST CASE] type should be specific
let a = new ContainerBuilder()
    .register(r => ({ a: r.transient(() => '42') }))
    .getContainer()
    .a();
// duck typing type of a: expected string will never extend an 1
let test: typeof a extends 1 ? 'any' : 'string' = 'any'; //@expected 2322

// [TEST CASE] same module type should be specific
function sameModuleSpecificTypes() {
    class ModuleC extends BaseModule {
        a = this.register.singleton(() => 42);
        b = this.register.singleton(ctr => ctr.a(), this);
    }
    let b = new ContainerBuilder()
        .module(ModuleC)
        .getContainer()
        .b();
    // duck typing type of a: expected string will never extend an 1
    let test: typeof b extends 1 ? 'any' : 'string' = 'any'; //@expected 2322
}

// [TEST CASE] error on missing module moniker
class ModuleAB2 extends BaseModule<{ moduleA: ModuleA }> {
    ab = this.register.transient((ctx) => ctx.moduleA.a() + 'b')
}
new ContainerBuilder()
    .register(r => new ModuleA(r))
    .register(r => new ModuleAB2(r)) //@expected 2345
    .getContainer();

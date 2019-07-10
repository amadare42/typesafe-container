import { BaseModule, ContainerBuilder } from '../index';

class ModuleA extends BaseModule {
    a = () => 'a';
}

class ModuleB extends BaseModule<ModuleA> {
    ab = this.register.transient((ctx) => ctx.a() + 'b');
}

class ModuleAB extends BaseModule<ModuleA & ModuleB> {
    c = this.register.transient(() => 'c');
    abc = this.register.transient(ctx => ctx.ab() + ctx.c());
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

// [TEST CASE] error on missing module moniker
class ModuleAB2 extends BaseModule<{ moduleA: ModuleA }> {
    ab = this.register.transient((ctx) => ctx.moduleA.a() + 'b')
}
new ContainerBuilder()
    .register(r => new ModuleA(r))
    .register(r => new ModuleAB2(r)) //@expected 2345
    .getContainer()

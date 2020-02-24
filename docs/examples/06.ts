import { ContainerBuilder, StatefulModule } from '../../src';

//START
interface MyState {
    foo: string;
}

class MyStatefulModule extends StatefulModule<MyState> {
    bar = this.register.const('bar');
    foobar = this.register.singleton(ctx => this.state.foo + ctx.bar, this);
}

const state = { foo: 'foo' };
const container = new ContainerBuilder()
    .register(r => new MyStatefulModule(r, state))
    .getContainer();

// prints 'foobar'
console.log(container.foobar());


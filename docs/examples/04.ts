import { BaseModule, ContainerBuilder } from '../../src';

//START
class EnvironmentModule extends BaseModule {
    currentTime = this.register.transient(() => new Date().toUTCString());
}

class DateModule extends BaseModule<{ env: EnvironmentModule }> {
    timeString = this.register.transient(({env}) => `Current date: ${env.currentTime()}`)
}

const container = new ContainerBuilder()
    .register(register => new EnvironmentModule(register), ['env'])
    .register(register => new DateModule(register))
    .getContainer();

const wontCompile = new ContainerBuilder()
    .register(register => new EnvironmentModule(register))
    // this will not compile since DateModule expects EnvironmentModule to be under 'env' key
    .register(register => new DateModule(register))
    .getContainer();

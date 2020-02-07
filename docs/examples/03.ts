import { BaseModule, ContainerBuilder } from '../../src';

//START
class EnvironmentModule extends BaseModule {
    currentTime = this.register.transient(() => new Date().toUTCString());
}

class DateModule extends BaseModule<EnvironmentModule> {
    timeString = this.register.transient(container => `Current date: ${container.currentTime()}`)
}

const container = new ContainerBuilder()
    .register(register => new EnvironmentModule(register))
    .register(register => new DateModule(register))
    .getContainer();

const wontCompile = new ContainerBuilder()
    .register(register => new DateModule(register)) // this will not compile since EnvironmentModule is not added yet
    .register(register => new EnvironmentModule(register))
    .getContainer();

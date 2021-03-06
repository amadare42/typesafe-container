import { BaseModule, ContainerBuilder } from '../../src';

//START
class DateModule extends BaseModule {
    currentTime = this.register.transient(() => new Date().toUTCString());
    timeString = this.register.transient(ctr => `Current date: ${ctr.currentTime()}`, this)
}

const container = new ContainerBuilder()
    .register(register => new DateModule(register))
    .getContainer();

// will output 'Current date: N', where N is current time
console.log(container.timeString());

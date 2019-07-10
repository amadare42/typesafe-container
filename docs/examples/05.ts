import { BaseModule, ContainerBuilder, ContainerScope } from '../../index';

//START
class TimeFreezeScope implements ContainerScope {
    isTimeFrozen: boolean = true;
    shouldCreateNew = () => !this.isTimeFrozen;
    toggleTimeFreeze = () => this.isTimeFrozen = !this.isTimeFrozen;
}

class TimeModule extends BaseModule {
    timeFreezeScope = this.register.singleton(() => new TimeFreezeScope());
    realDate = this.register.transient(() => new Date().toUTCString());
    currentDate = this.register.inScopeOf(ctr => ctr.timeFreezeScope(), ctr => ctr.realDate());
}
const container = new ContainerBuilder()
    .register(r => new TimeModule(r))
    .getContainer();

// will print current time T, because of first initialization
console.log(container.currentDate());
// will print same time T, because shouldCreateNew returned false
console.log(container.currentDate());
// will print T+elapsed time, since realDate declared without scope
console.log(container.realDate());

container.timeFreezeScope().toggleTimeFreeze();

// will print T+elapsed time, because shouldCreateNew returned true
console.log(container.currentDate());



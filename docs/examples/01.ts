import { ContainerBuilder } from '../../index';

//START
const container = new ContainerBuilder()
    .register(register => ({
        logger: register.singleton(() => ({
            log: a => console.log(a)
        })),
        currentTime: register.transient(() => new Date().toUTCString())
    }))
    .getContainer();
const logger = container.logger();
logger.log(container.currentTime()); // will output current time T
// <wait for 1 second>
logger.log(container.currentTime()); // will output T+1 second

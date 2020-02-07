//...

import { BaseModule, ContainerBuilder } from '../../src';
class DateModule extends BaseModule {
}

//START
const container = new ContainerBuilder()
    .module(DateModule)
    .getContainer();

//...

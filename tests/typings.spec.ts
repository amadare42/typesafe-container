import { TypeTester } from 'type-tester/dist';
import * as typescript from 'typescript';
import * as path from 'path';

describe('Typings', () => {
    new TypeTester(typescript).verify(
        [path.resolve(__dirname, './fixtures.ts')],
        {}
    )
});

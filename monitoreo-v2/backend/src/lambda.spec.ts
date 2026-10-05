jest.mock('./app.module', () => ({ AppModule: class {} }));
jest.mock('./http-app', () => ({ configureHttpApp: jest.fn() }));

import { handler } from './lambda';

describe('lambda handler', () => {
  it('uses the async signature required by the Node.js 24 runtime', () => {
    expect(handler.length).toBeLessThan(3);
  });
});

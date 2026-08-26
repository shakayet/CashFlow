/* eslint-disable no-undef, no-unused-vars */
jest.mock('tesseract.js', () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

import Tesseract from 'tesseract.js';
import { OCR_CONCURRENCY_LIMIT, recognizeImageText } from '../src/helpers/ocr';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('OCR concurrency limit', () => {
  it('runs no more than the configured number of Tesseract jobs at once', async () => {
    const resolvers: Array<(value: { data: { text: string } }) => void> = [];
    (Tesseract.recognize as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          resolvers.push(resolve);
        }),
    );

    const jobs = Array.from({ length: 4 }, (_, index) =>
      recognizeImageText(Buffer.from(String(index))),
    );

    await flushPromises();
    expect(Tesseract.recognize).toHaveBeenCalledTimes(OCR_CONCURRENCY_LIMIT);

    resolvers.shift()?.({ data: { text: 'first' } });
    await flushPromises();
    expect(Tesseract.recognize).toHaveBeenCalledTimes(
      OCR_CONCURRENCY_LIMIT + 1,
    );

    while (resolvers.length > 0) {
      resolvers.shift()?.({ data: { text: 'done' } });
      await flushPromises();
    }

    await expect(Promise.all(jobs)).resolves.toHaveLength(4);
  });
});

import deviceUtil from '../src/utils/device.util.js';

const { extractIpAddress } = deviceUtil;

describe('extractIpAddress', () => {
  test('should extract IP from x-forwarded-for header', () => {
    const req = {
      headers: {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1'
      },
      connection: {
        remoteAddress: '127.0.0.1'
      }
    };
    expect(extractIpAddress(req)).toBe('10.0.0.1');
  });

  test('should extract IP from x-real-ip header if x-forwarded-for is missing', () => {
    const req = {
      headers: {
        'x-real-ip': '10.0.0.2'
      },
      connection: {
        remoteAddress: '127.0.0.1'
      }
    };
    expect(extractIpAddress(req)).toBe('10.0.0.2');
  });

  test('should fall back to remoteAddress', () => {
    const req = {
      headers: {},
      connection: {
        remoteAddress: '127.0.0.1'
      }
    };
    expect(extractIpAddress(req)).toBe('127.0.0.1');
  });

  test('should handle whitespace in x-forwarded-for header', () => {
    const req = {
      headers: {
        'x-forwarded-for': '  10.0.0.1  , 192.168.1.1'
      },
      connection: {
        remoteAddress: '127.0.0.1'
      }
    };
    expect(extractIpAddress(req)).toBe('10.0.0.1');
  });
});

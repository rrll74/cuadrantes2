/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// NestJS/Jest type definitions for API tests
declare global {
  namespace jest {
    interface Matchers<R = void> {
      // Standard Jest matchers
      toBe(value: any): R;
      toEqual(value: any): R;
      toStrictEqual(value: any): R;
      toThrow(error?: string | RegExp | Error | Function): R;
      toThrowError(error?: string | RegExp | Error | Function): R;
      toBeDefined(): R;
      toBeUndefined(): R;
      toBeNull(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toContain(item: any): R;
      toContainEqual(item: any): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenCalledTimes(times: number): R;
      toHaveBeenLastCalledWith(...args: any[]): R;
      toMatch(pattern: string | RegExp): R;
      toMatchObject(obj: Record<string, any>): R;
      toHaveProperty(property: string, value?: any): R;
      toHaveLength(length: number): R;
      toBeGreaterThan(value: number): R;
      toBeGreaterThanOrEqual(value: number): R;
      toBeLessThan(value: number): R;
      toBeLessThanOrEqual(value: number): R;
      toBeCloseTo(value: number, numDigits?: number): R;
      toBeInstanceOf(cls: Function): R;
      toBeNaN(): R;
      toReject(): R;
      toRejectWith(value: any): R;
    }
  }
}

export {};

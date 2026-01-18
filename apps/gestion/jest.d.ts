/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import "@testing-library/jest-dom";

// Asegurar que los tipos de Testing Library jest-dom se carguen
declare global {
  namespace jest {
    // Sobrescribir Matchers para incluir Testing Library matchers
    interface Matchers<R = void> {
      // Standard Jest matchers
      toBe(value: any): R;
      toEqual(value: any): R;
      toStrictEqual(value: any): R;
      toThrow(error?: string | RegExp | Error | (() => void)): R;
      toThrowError(error?: string | RegExp | Error | (() => void)): R;
      toBeDefined(): R;
      toBeUndefined(): R;
      toBeNull(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toContain(item: any): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenCalledTimes(times: number): R;
      toMatch(pattern: string | RegExp): R;

      // Testing Library matchers from @testing-library/jest-dom
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeEmpty(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toBeRequired(): R;
      toBePartiallyChecked(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(cls: string | string[]): R;
      toHaveFormValues(values: Record<string, unknown>): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveTextContent(
        text: string | RegExp,
        options?: { normalizeWhitespace: boolean },
      ): R;
      toHaveValue(value: string | string[] | number): R;
      toHaveDisplayValue(value: string | string[]): R;
      toBeChecked(): R;
      toHaveErrorMessage(message: string): R;
      toBeInTheDOM(): R;
    }
  }

  // Extend expect with helper functions
  interface Expect {
    stringContaining(value: string): any;
    objectContaining(obj: Record<string, any>): any;
    arrayContaining(arr: any[]): any;
    anything(): any;
  }
}

export {};

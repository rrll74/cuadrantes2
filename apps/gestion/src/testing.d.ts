/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Este archivo sobrescribe los tipos problemáticos de TypeScript
// para asegurar que Jest y Testing Library funcionen correctamente

declare global {
  namespace jest {
    interface Matchers<R = void> {
      // Testing Library DOM matchers
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
}

declare const expect: {
  stringContaining(value: string): any;
  objectContaining(obj: Record<string, any>): any;
  arrayContaining(arr: any[]): any;
  anything(): any;
  (value: any): any;
};

export {};

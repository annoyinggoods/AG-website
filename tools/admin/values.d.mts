export interface ValueCheck {
  ok: boolean;
  message: string;
}

export function validateValue(property: string, value: string): ValueCheck;

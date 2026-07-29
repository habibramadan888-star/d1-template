export interface StandardResponse<T = unknown> {
  /**
   * 0 means success. Non-zero values map to a stable application error code.
   */
  code: number;
  message: string;
  data?: T;
}

export interface StandardErrorResponse {
  code: number;
  message: string;
  /**
   * Optional development detail. Do not expose secrets, raw SQL, tokens, or passwords.
   */
  error?: string;
}

/**
 * lib/httpError.ts – Errors carrying an HTTP status, rendered by plugins/errorHandler.
 */

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    name = 'Error',
  ) {
    super(message);
    this.name = name;
  }
}

export const notFound = (message = 'Not found') => new HttpError(404, message, 'Not Found');
export const conflict = (message: string) => new HttpError(409, message, 'Conflict');

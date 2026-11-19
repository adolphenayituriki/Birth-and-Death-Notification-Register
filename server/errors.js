export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message, code = 'VALIDATION_ERROR', details) =>
  new AppError(400, code, message, details)

export const notFound = (message, code = 'NOT_FOUND') => new AppError(404, code, message)

export const unauthorized = (message = 'Please log in to continue', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message)

export const forbidden = (message = 'You do not have permission to do that') =>
  new AppError(403, 'FORBIDDEN', message)

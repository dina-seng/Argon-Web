/**
 * plugins/errorHandler.ts – Centralised error handling.
 * Maps Zod validation errors, Prisma errors, and generic errors to standardized RFC-7807 problem details responses.
 */

import fp from 'fastify-plugin';

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler(async (error, request, reply) => {
    if (reply.sent) {
      request.log.error(error, 'Error occurred after response was sent');
      return;
    }

    let statusCode = error.statusCode ?? 500;
    let errorName = error.name ?? 'Error';
    let message = error.message;

    // Fastify / Zod validation error
    if (error.validation || (error as any).issues) {
      statusCode = 400;
      errorName = 'Bad Request';
      message = error.message || 'Validation error';
    }
    // Prisma known request errors
    else if ((error as any).code === 'P2002') {
      statusCode = 409;
      errorName = 'Conflict';
      message = 'A record with this unique value already exists.';
    } else if ((error as any).code === 'P2025') {
      statusCode = 404;
      errorName = 'Not Found';
      message = 'The requested resource was not found.';
    } else if ((error as any).code === 'P2003') {
      statusCode = 400;
      errorName = 'Bad Request';
      message = 'Foreign key constraint violation.';
    } else if (statusCode === 500) {
      request.log.error(error);
      if (process.env['NODE_ENV'] === 'production') {
        message = 'An unexpected internal server error occurred.';
      }
    }

    return reply.status(statusCode).send({
      statusCode,
      error: errorName,
      message,
    });
  });
});

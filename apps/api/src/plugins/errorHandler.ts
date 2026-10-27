/**
 * plugins/errorHandler.ts – Centralised error handling.
 * Maps Zod validation errors, Prisma errors, and generic errors to RFC 7807 responses.
 * TODO: Implement specific error type detection and mapping.
 */

import fp from 'fastify-plugin';

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler(async (error, _request, reply) => {
    // TODO: Map ZodError, Prisma known errors, custom AppError
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Error',
      message: error.message,
    });
  });
});

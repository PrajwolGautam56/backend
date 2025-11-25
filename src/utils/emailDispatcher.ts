import logger from './logger';

type Context = Record<string, any> | undefined;

/**
 * Utility to execute email sending functions in the background without blocking
 * the HTTP request lifecycle. Provides consistent logging for success/failure.
 */
export const sendEmailInBackground = (
  label: string,
  sendFn: () => Promise<any>,
  context?: Context
): void => {
  try {
    Promise.resolve(sendFn())
      .then((result) => {
        logger.info(`✅ ${label} email sent`, {
          label,
          resultSummary: summarizeResult(result),
          ...context
        });
      })
      .catch((error: any) => {
        logger.error(`❌ ${label} email failed`, {
          label,
          error: error?.message || error,
          errorCode: error?.code,
          errorResponse: error?.response,
          stack: error?.stack,
          ...context
        });
      });
  } catch (error: any) {
    logger.error(`❌ ${label} email threw synchronously`, {
      label,
      error: error?.message || error,
      stack: error?.stack,
      ...context
    });
  }
};

const summarizeResult = (result: any) => {
  if (!result) return null;
  const summary: Record<string, any> = {};
  if (result.messageId) summary.messageId = result.messageId;
  if (result.response) summary.response = result.response;
  return Object.keys(summary).length ? summary : undefined;
};



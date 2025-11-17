/**
 * Retry MongoDB operations with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const isMongoConnectionError = (error: any): boolean => {
  return (
    error?.name === 'MongoNetworkError' ||
    error?.name === 'MongoServerError' ||
    error?.name === 'MongoTimeoutError' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    (error?.message && error.message.includes('connection'))
  );
};

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retryMongoOperation = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  console.log("retryMongoOperation>>");
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffMultiplier = 2 } = options;

  let lastError: any;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a connection error
      if (!isMongoConnectionError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delayTime = Math.min(currentDelay, maxDelay);
      await delay(delayTime);
      currentDelay *= backoffMultiplier;
    }
  }

  // If we get here, all retries failed
  throw lastError;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

class ApiClient {
  private baseUrl: string;
  private retryOptions: RetryOptions;

  constructor(baseUrl: string, retryOptions: RetryOptions = {}) {
    this.baseUrl = baseUrl;
    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...retryOptions,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(error: any, status?: number): boolean {
    // Network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return true;
    }

    // Retryable HTTP status codes
    if (status) {
      return (
        status === 503 || // Service Unavailable (DB retries failed)
        status === 502 || // Bad Gateway
        status === 504 || // Gateway Timeout
        status === 429 // Too Many Requests (rate limited)
      );
    }

    return false;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data: ApiResponse<T> | ApiError = await response.json();

      if (!response.ok || !data.success) {
        const error: ApiError = {
          success: false,
          message: data.message || `HTTP error! status: ${response.status}`,
          errors: (data as any).errors,
          retryAfter: (data as any).retryAfter,
        };

        // Retry on retryable errors
        if (
          this.shouldRetry(error, response.status) &&
          retryCount < this.retryOptions.maxRetries!
        ) {
          const retryAfter = (data as any).retryAfter;
          const delayTime = retryAfter
            ? Math.min(retryAfter * 1000, this.retryOptions.maxDelay!)
            : Math.min(
                this.retryOptions.initialDelay! *
                  Math.pow(this.retryOptions.backoffMultiplier!, retryCount),
                this.retryOptions.maxDelay!
              );

          await this.delay(delayTime);
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        throw error;
      }

      return (data as ApiResponse<T>).data as T;
    } catch (error) {
      // Network errors - retry
      if (
        this.shouldRetry(error) &&
        retryCount < this.retryOptions.maxRetries!
      ) {
        const delayTime = Math.min(
          this.retryOptions.initialDelay! *
            Math.pow(this.retryOptions.backoffMultiplier!, retryCount),
          this.retryOptions.maxDelay!
        );

        await this.delay(delayTime);
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      // Transform network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw {
          success: false,
          message: "Network error. Please check your connection.",
        } as ApiError;
      }

      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

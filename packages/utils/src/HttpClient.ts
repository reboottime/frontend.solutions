// types.ts
export interface RequestOptions extends Omit<RequestInit, "signal"> {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  credentials?: RequestCredentials;
  retry?: RetryConfig;
  url?: string; // Added for interceptor usage
}

export interface HttpClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
  retry?: RetryConfig;
}

export interface HttpResponse<T = unknown> {
  data: T | null;
  status: number;
  headers: Headers;
  config: RequestOptions;
}

export interface HttpRequestError {
  message: string;
  status?: number;
  data?: any;
  config?: RequestOptions;
  cause?: Error;
}

export interface RetryConfig {
  count: number;
  delay?: number;
  shouldRetry?: (error: HttpRequestError) => boolean;
}

// Interceptor Types
export interface RequestInterceptor {
  onRequest?: (
    config: RequestOptions
  ) => RequestOptions | Promise<RequestOptions>;
  onRequestError?: (
    error: HttpRequestError
  ) => Promise<HttpRequestError | void>;
}

export interface ResponseInterceptor<T = any> {
  onResponse?: (
    response: HttpResponse<T>
  ) => HttpResponse<T> | Promise<HttpResponse<T>>;
  onResponseError?: (
    error: HttpRequestError
  ) => Promise<HttpResponse<T> | HttpRequestError>;
}

// Common interceptors
export const createAuthInterceptor = (
  getToken: () => string | Promise<string>
): RequestInterceptor => ({
  onRequest: async (config) => {
    const token = await Promise.resolve(getToken());
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  },
  onRequestError: async (error) => {
    console.error("Auth interceptor request error:", error);
    throw error;
  },
});

export const createRetryInterceptor = (
  retryConfig: RetryConfig
): ResponseInterceptor => ({
  onResponseError: async (error) => {
    if (error.status && error.status >= 500 && retryConfig.count > 0) {
      // Implement retry logic
      return error; // If retry fails, throw the error
    }
    throw error;
  },
});

export const createLoggingInterceptor = (
  logger: Console = console
): RequestInterceptor & ResponseInterceptor => ({
  onRequest: async (config) => {
    logger.log(`Request: ${config.method} ${config.url}`, {
      headers: config.headers,
      body: config.body,
    });
    return config;
  },
  onResponse: async (response) => {
    logger.log(`Response: ${response.status}`, {
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  onResponseError: async (error) => {
    logger.error(`Response Error: ${error.message}`, {
      status: error.status,
      data: error.data,
    });
    throw error;
  },
});

export const createErrorTransformInterceptor = (): ResponseInterceptor => ({
  onResponseError: async (error) => {
    // Transform error into a standardized format
    if (error.status === 401) {
      throw {
        ...error,
        message: "Authentication required",
      };
    }
    if (error.status === 403) {
      throw {
        ...error,
        message: "Permission denied",
      };
    }
    throw error;
  },
});

// Usage example of TypeScript utility types for better type inference
export type RequestInterceptorFn = NonNullable<RequestInterceptor["onRequest"]>;
export type ResponseInterceptorFn<T> = NonNullable<
  ResponseInterceptor<T>["onResponse"]
>;
export type ErrorInterceptorFn = NonNullable<
  ResponseInterceptor["onResponseError"]
>;

// HttpClient.ts
class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private defaultCredentials: RequestCredentials;
  private defaultRetry?: RetryConfig;
  private pendingRequests: Map<string, AbortController>;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];

  constructor(config: HttpClientConfig = {}) {
    this.baseURL = config.baseURL || "";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
    };
    this.defaultTimeout = config.timeout || 3000;
    this.defaultCredentials = config.credentials || "same-origin";
    this.defaultRetry = config.retry;
    this.pendingRequests = new Map();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  public addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index >= 0) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index >= 0) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  public cancelRequest(requestKey: string): void {
    const controller = this.pendingRequests.get(requestKey);

    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestKey);
    }
  }

  public cancelAllRequests(): void {
    this.pendingRequests.forEach((controller) => controller.abort());
    this.pendingRequests.clear();
  }

  public getRequestKey(url: string, options: RequestOptions = {}): string {
    return this.createRequestKey(url, options);
  }

  private createRequestKey(url: string, options: RequestOptions = {}): string {
    return `${options.method || "GET"}-${url}-${options.credentials || this.defaultCredentials}-${JSON.stringify(options.body || "")}`;
  }

  private createURLWithParams(
    url: string,
    params?: Record<string, string | number | boolean>
  ): string {
    if (!params) return url;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();

    return queryString
      ? `${url}${url.includes("?") ? "&" : "?"}${queryString}`
      : url;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async retryRequest<T>(
    url: string,
    options: RequestOptions,
    error: HttpRequestError,
    retryCount: number,
    retryConfig: RetryConfig
  ): Promise<HttpResponse<T>> {
    if (retryCount <= 0) throw error;

    const shouldRetry =
      retryConfig.shouldRetry?.(error) ??
      (error.status ? error.status >= 500 : true);

    if (!shouldRetry) throw error;

    if (retryConfig.delay) {
      await this.delay(retryConfig.delay);
    }

    return this.request<T>(url, {
      ...options,
      retry: {
        ...retryConfig,
        count: retryCount - 1,
      },
    });
  }

  private async handleResponse<T>(
    response: Response,
    config: RequestOptions
  ): Promise<HttpResponse<T>> {
    let data: T | null = null;

    try {
      // Only try to parse if there's content
      if (response.body && response.headers.get("content-length") !== "0") {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }
      }

      if (!response.ok) {
        throw {
          message: `HTTP error! status: ${response.status}`,
          status: response.status,
          data,
          config,
        } as HttpRequestError;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        config,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "SyntaxError") {
        throw {
          message: "Invalid response format",
          status: response.status,
          data: null,
          config,
          cause: error,
        } as HttpRequestError;
      }
      throw error;
    }
  }

  private async applyRequestInterceptors(
    config: RequestOptions
  ): Promise<RequestOptions> {
    let currentConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      try {
        if (interceptor.onRequest) {
          currentConfig = await interceptor.onRequest(currentConfig);
        }
      } catch (error) {
        for (const interceptor of this.requestInterceptors) {
          if (interceptor.onRequestError) {
            await interceptor.onRequestError(error);
          }
        }
        throw error;
      }
    }

    return currentConfig;
  }

  private async applyResponseInterceptors<T>(
    response: HttpResponse<T>
  ): Promise<HttpResponse<T>> {
    let currentResponse = { ...response };

    for (const interceptor of this.responseInterceptors) {
      try {
        if (interceptor.onResponse) {
          currentResponse = await interceptor.onResponse(currentResponse);
        }
      } catch (error) {
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onResponseError) {
            await interceptor.onResponseError(error as HttpRequestError);
          }
        }
        throw error;
      }
    }

    return currentResponse;
  }

  public async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const requestKey = this.createRequestKey(url, options);
    const retryConfig = options.retry || this.defaultRetry;

    const timeoutId = setTimeout(() => {
      controller.abort();
      this.pendingRequests.delete(requestKey);
    }, options.timeout || this.defaultTimeout);

    try {
      const interceptedOptions = await this.applyRequestInterceptors(options);

      const fullUrl = this.createURLWithParams(
        `${this.baseURL}${url}`,
        interceptedOptions.params
      );

      const fetchOptions: RequestInit = {
        ...interceptedOptions,
        headers: {
          ...this.defaultHeaders,
          ...interceptedOptions.headers,
        },
        credentials: interceptedOptions.credentials || this.defaultCredentials,
        signal: controller.signal,
      };

      if (["GET", "HEAD"].includes(fetchOptions.method?.toUpperCase() || "")) {
        delete fetchOptions.body;
      }

      const response = await fetch(fullUrl, fetchOptions);

      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);

      const handledResponse = await this.handleResponse<T>(
        response,
        interceptedOptions
      );

      return await this.applyResponseInterceptors(handledResponse);
    } catch (error) {
      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);

      const httpError = error as HttpRequestError;

      // Handle retry if configured
      if (retryConfig && retryConfig.count > 0) {
        return this.retryRequest(
          url,
          options,
          httpError,
          retryConfig.count,
          retryConfig
        );
      }

      // Handle errors through response interceptors
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onResponseError) {
          try {
            return await interceptor.onResponseError(httpError);
          } catch (interceptorError) {
            error = interceptorError;
          }
        }
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw {
          message: "Request was cancelled",
          config: options,
          cause: error,
        } as HttpRequestError;
      }
      throw error;
    }
  }

  public async get<T = any>(
    url: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  public async post<T = any, D = any>(
    url: string,
    data?: D,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async put<T = any, D = any>(
    url: string,
    data?: D,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async delete<T = any>(
    url: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

export default HttpClient;

/**
 * option request are handled by browser before sending the actual request using window.fetch
 * We don't need to explicitly handle the OPTIONS request in our HTTP client. The browser automatically handles preflight OPTIONS requests for CORS as part of its internal implementation of the Fetch API.
Here's why:

When we make a CORS request that requires preflight (like a POST with custom headers), the browser will:

First automatically send the OPTIONS request
Handle the preflight response
Then send our actual request if preflight succeeds
All of this happens before our fetch call even starts executing


Our client code only sees the main request, not the preflight OPTIONS request. The preflight is handled at the browser level before our code runs.
 */

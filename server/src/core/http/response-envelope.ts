export interface ApiEnvelopeMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiEnvelopeMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    message: string;
    code: string;
    correlationId: string;
  };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function successEnvelope<T>(data: T, meta?: ApiEnvelopeMeta): ApiSuccessEnvelope<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export function errorEnvelope(message: string, code: string, correlationId: string): ApiErrorEnvelope {
  return { success: false, error: { message, code, correlationId } };
}

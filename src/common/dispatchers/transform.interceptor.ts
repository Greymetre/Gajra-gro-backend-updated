import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
/**
 * Success response schema
 */
export interface Response<T> {
  data: T;
  message: string;
  isError: boolean;
}

/**
 * Response transformer
 * Transforms object to valid json response
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  public intercept(_context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((result) => {
        return {
          isError: false,
          message: result.message || 'SUCCESS',
          data: result.data,
        };
      }),
    );
  }
}

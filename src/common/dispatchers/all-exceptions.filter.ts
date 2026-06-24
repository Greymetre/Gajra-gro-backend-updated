/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import _ from 'lodash';

/**
 * All catched and uncatched error will parse throw this function
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  public catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
    }

    // console.log(exception);

    let firstErrorMessage;
    // If validation error
    if (exception.response && exception.response.type && exception.response.type === 'validation') {
      const firstErrorObject = this.getFirstErrorObject(exception.response.message);

      firstErrorMessage = firstErrorObject[Object.keys(firstErrorObject)[0]];
    }
    return response.status(status).json({
      isError: true,
      message: firstErrorMessage || exception.message || 'Internal server error.',
    });
  }

  private getFirstErrorObject(error: ValidationError) {
    if (error.constraints) {
      return error.constraints;
    } else {
      return this.getFirstErrorObject(error.children[0]);
    }
  }
}

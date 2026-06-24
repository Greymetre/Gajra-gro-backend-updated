import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * validation pipe is use like middleware
 * All validation error are parse throw this function
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  public async transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: true,
      validationError: {
        target: true,
        value: true,
      },
    });

    if (errors.length > 0) {
      throw new BadRequestException({ message: errors[0], type: 'validation' });
    }

    return object;
  }

  /**
   * Type validation
   * @param metatype
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

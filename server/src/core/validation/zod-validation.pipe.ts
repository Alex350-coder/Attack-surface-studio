import { Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ValidationError } from "../http/domain-error";

/** Validates a request payload against a Zod schema, converting failures into a 400 ValidationError. */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      throw new ValidationError(`Invalid request payload: ${issues}`);
    }
    return result.data;
  }
}

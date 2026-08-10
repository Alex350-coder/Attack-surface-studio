import { describe, expect, it } from "vitest";
import { of } from "rxjs";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { TransformResponseInterceptor } from "../../../src/core/http/transform-response.interceptor";

function makeCallHandler(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe("TransformResponseInterceptor", () => {
  const interceptor = new TransformResponseInterceptor();
  const context = {} as ExecutionContext;

  it("wraps a plain value in { success, data } with no meta", async () => {
    const result = await firstValue(interceptor.intercept(context, makeCallHandler({ id: "1" })));

    expect(result).toEqual({ success: true, data: { id: "1" } });
  });

  it("lifts a Paginated<T> shape's items into data and page/pageSize/total into meta", async () => {
    const paginated = { items: [{ id: "1" }, { id: "2" }], page: 1, pageSize: 25, total: 2 };

    const result = await firstValue(interceptor.intercept(context, makeCallHandler(paginated)));

    expect(result).toEqual({
      success: true,
      data: [{ id: "1" }, { id: "2" }],
      meta: { total: 2, page: 1, pageSize: 25 },
    });
  });

  it("does not treat an object with an unrelated 'items' array as paginated", async () => {
    const value = { items: [1, 2, 3] };

    const result = await firstValue(interceptor.intercept(context, makeCallHandler(value)));

    expect(result).toEqual({ success: true, data: { items: [1, 2, 3] } });
  });
});

function firstValue<T>(observable: { subscribe: (observer: { next: (value: T) => void }) => void }): Promise<T> {
  return new Promise((resolve) => {
    observable.subscribe({ next: resolve });
  });
}

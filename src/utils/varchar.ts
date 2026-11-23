import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

export function toVarchar<const Length extends number>(
  value: string,
  maxLength: Length,
): Varchar<Length> {
  if ([...value].length > maxLength) {
    throw new RangeError(`Value exceeds the maximum length of ${maxLength}`);
  }
  return value as Varchar<Length>;
}

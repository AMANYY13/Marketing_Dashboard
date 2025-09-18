/**
 * This function is used to map actual model name to it's prisma manager.
 * Ref: https://github.com/prisma/prisma/blob/ba74c81fdbc9e6405946fdc6f9d42d103d008dc2/packages/client/src/runtime/utils/common.ts#L452
 * @param name    string value
 * @returns       `name` with it's first character converted to lowercase
 */
export declare const lowerCase: (name: string) => string;
export declare const isNumeric: (value: null | string | number | boolean | Record<string, any> | undefined) => boolean;
export declare const safeParseNumber: (value?: null | string | number | boolean | Record<string, any>) => string | number | null | boolean | Record<string, any> | undefined;
export declare const safeParseJSON: (json: string) => Record<string, any> | null;

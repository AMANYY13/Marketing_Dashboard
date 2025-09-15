/* eslint-disable no-restricted-globals */
/* eslint-disable max-len */
/**
 * This function is used to map actual model name to it's prisma manager.
 * Ref: https://github.com/prisma/prisma/blob/ba74c81fdbc9e6405946fdc6f9d42d103d008dc2/packages/client/src/runtime/utils/common.ts#L452
 * @param name    string value
 * @returns       `name` with it's first character converted to lowercase
 */
export const lowerCase = (name) => name.substring(0, 1).toLowerCase() + name.substring(1);
/* eslint-enable max-len */
export const isNumeric = (value) => {
    const stringValue = (String(value)).replace(/,/g, '.');
    if (isNaN(parseFloat(stringValue)))
        return false;
    return isFinite(Number(stringValue));
};
export const safeParseNumber = (value) => {
    if (isNumeric(value))
        return Number(value);
    return value;
};
export const safeParseJSON = (json) => {
    try {
        return JSON.parse(json);
    }
    catch (e) {
        return null;
    }
};
//# sourceMappingURL=helpers.js.map
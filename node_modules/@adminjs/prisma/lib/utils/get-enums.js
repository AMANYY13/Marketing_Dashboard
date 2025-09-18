import { Prisma } from '@prisma/client';
export const getEnums = (clientModule) => {
    const dmmf = clientModule?.Prisma.dmmf.datamodel ?? Prisma.dmmf.datamodel;
    return dmmf.enums.reduce((memo, current) => {
        // eslint-disable-next-line no-param-reassign
        memo[current.name] = current;
        return memo;
    }, {});
};
//# sourceMappingURL=get-enums.js.map
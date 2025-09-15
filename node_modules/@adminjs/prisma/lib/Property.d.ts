import { DMMF } from '@prisma/client/runtime/library.js';
import { BaseProperty, PropertyType } from 'adminjs';
import { Enums } from './types.js';
export declare class Property extends BaseProperty {
    column: DMMF.Field;
    protected enums: Enums;
    protected columnPosition: number;
    constructor(column: DMMF.Field, columnPosition: number | undefined, enums: Enums);
    isEditable(): boolean;
    isId(): boolean;
    name(): string;
    isRequired(): boolean;
    isSortable(): boolean;
    reference(): string | null;
    referencedColumnName(): string | null;
    foreignColumnName(): string | null;
    availableValues(): Array<string> | null;
    position(): number;
    isEnum(): boolean;
    type(): PropertyType;
}

import { DMMF } from '@prisma/client/runtime/library.js';
import { Filter } from 'adminjs';
import { Property } from '../Property.js';
export declare const convertParam: (property: Property, fields: DMMF.Model['fields'], value: string | boolean | number | Record<string, any> | null | undefined) => string | boolean | number | Record<string, any> | null | undefined;
export declare const convertFilter: (modelFields: DMMF.Model['fields'], filterObject?: Filter) => Record<string, any>;

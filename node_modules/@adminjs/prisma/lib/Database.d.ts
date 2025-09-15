import { PrismaClient } from '@prisma/client';
import { BaseDatabase } from 'adminjs';
import { Resource } from './Resource.js';
export declare class Database extends BaseDatabase {
    protected client: PrismaClient;
    protected clientModule?: any;
    constructor(args: {
        client: PrismaClient;
        clientModule?: any;
    });
    resources(): Array<Resource>;
    static isAdapterFor(args: {
        client?: PrismaClient;
        clientModule?: any;
    }): boolean;
}

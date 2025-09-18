/* eslint-disable class-methods-use-this */
import { Prisma } from '@prisma/client';
import { BaseDatabase } from 'adminjs';
import { Resource } from './Resource.js';
export class Database extends BaseDatabase {
    client;
    clientModule;
    constructor(args) {
        super(args);
        const { client, clientModule } = args;
        this.client = client;
        this.clientModule = clientModule;
    }
    resources() {
        const dmmf = this.clientModule?.Prisma.dmmf.datamodel ?? Prisma.dmmf.datamodel;
        if (!dmmf?.models)
            return [];
        return dmmf.models.map((model) => {
            const resource = new Resource({ model, client: this.client });
            return resource;
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static isAdapterFor(args) {
        const { clientModule } = args;
        const dmmf = clientModule?.Prisma.dmmf.datamodel ?? Prisma.dmmf.datamodel;
        return dmmf?.models?.length > 0;
    }
}
//# sourceMappingURL=Database.js.map
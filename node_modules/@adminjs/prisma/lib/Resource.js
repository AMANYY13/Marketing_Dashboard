/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { BaseResource, BaseRecord, flat } from 'adminjs';
import { Property } from './Property.js';
import { lowerCase } from './utils/helpers.js';
import { convertFilter, convertParam } from './utils/converters.js';
import { getEnums } from './utils/get-enums.js';
export class Resource extends BaseResource {
    client;
    model;
    enums;
    manager;
    propertiesObject;
    idProperty;
    constructor(args) {
        super(args);
        const { model, client, clientModule } = args;
        this.model = model;
        this.client = client;
        this.enums = getEnums(clientModule);
        this.manager = this.client[lowerCase(model.name)];
        this.propertiesObject = this.prepareProperties();
        this.idProperty = this.properties().find((p) => p.isId());
    }
    databaseName() {
        return 'prisma';
    }
    databaseType() {
        return this.client._engineConfig?.activeProvider ?? 'database';
    }
    id() {
        return this.model.name;
    }
    properties() {
        return [...Object.values(this.propertiesObject)];
    }
    property(path) {
        return this.propertiesObject[path] ?? null;
    }
    build(params) {
        return new BaseRecord(flat.unflatten(params), this);
    }
    async count(filter) {
        return this.manager.count({
            where: convertFilter(this.model.fields, filter),
        });
    }
    async find(filter, params = {}) {
        const { limit = 10, offset = 0, sort = {} } = params;
        const orderBy = this.buildSortBy(sort);
        const results = await this.manager.findMany({
            where: convertFilter(this.model.fields, filter),
            skip: offset,
            take: limit,
            orderBy,
        });
        return results.map((result) => new BaseRecord(this.prepareReturnValues(result), this));
    }
    buildSortBy(sort = {}) {
        let { sortBy: path } = sort;
        const { direction = 'desc' } = sort;
        if (!path)
            path = this.idProperty.path();
        const [basePath, sortBy] = path.split('.');
        const sortByProperty = this.property(basePath);
        if (sortByProperty?.column.relationName
            && sortByProperty?.column.kind === 'object'
            && sortByProperty.column.relationToFields?.length) {
            return {
                [basePath]: {
                    [sortBy ?? sortByProperty.column.relationToFields[0]]: direction,
                },
            };
        }
        return {
            [basePath]: direction,
        };
    }
    async findOne(id) {
        const idProperty = this.properties().find((property) => property.isId());
        if (!idProperty)
            return null;
        const result = await this.manager.findUnique({
            where: {
                [idProperty.path()]: convertParam(idProperty, this.model.fields, id),
            },
        });
        if (!result)
            return null;
        return new BaseRecord(this.prepareReturnValues(result), this);
    }
    async findMany(ids) {
        const idProperty = this.properties().find((property) => property.isId());
        if (!idProperty)
            return [];
        const results = await this.manager.findMany({
            where: {
                [idProperty.path()]: {
                    in: ids.map((id) => convertParam(idProperty, this.model.fields, id)),
                },
            },
        });
        return results.map((result) => new BaseRecord(this.prepareReturnValues(result), this));
    }
    async create(params) {
        const preparedParams = this.prepareParams(params);
        const result = await this.manager.create({ data: preparedParams });
        return this.prepareReturnValues(result);
    }
    async update(pk, params = {}) {
        const idProperty = this.properties().find((property) => property.isId());
        if (!idProperty)
            return {};
        const preparedParams = this.prepareParams(params);
        const result = await this.manager.update({
            where: {
                [idProperty.path()]: convertParam(idProperty, this.model.fields, pk),
            },
            data: preparedParams,
        });
        return this.prepareReturnValues(result);
    }
    async delete(id) {
        const idProperty = this.properties().find((property) => property.isId());
        if (!idProperty)
            return;
        await this.manager.delete({
            where: {
                [idProperty.path()]: convertParam(idProperty, this.model.fields, id),
            },
        });
    }
    static isAdapterFor(args) {
        const { model, client } = args;
        return (!!model?.name
            && !!model?.fields.length
            && !!client?.[lowerCase(model.name)]);
    }
    prepareProperties() {
        const { fields = [] } = this.model;
        const properties = fields.reduce((memo, field) => {
            if (field.isReadOnly
                || (field.relationName && !field.relationFromFields?.length)) {
                return memo;
            }
            const property = new Property(field, Object.keys(memo).length, this.enums);
            memo[property.path()] = property;
            return memo;
        }, {});
        return properties;
    }
    prepareParams(params) {
        const preparedParams = {};
        for (const property of this.properties()) {
            const param = flat.get(params, property.path());
            const key = property.path();
            // eslint-disable-next-line no-continue
            if (param === undefined)
                continue;
            const type = property.type();
            const foreignColumnName = property.foreignColumnName();
            if (type === 'reference' && foreignColumnName) {
                preparedParams[foreignColumnName] = convertParam(property, this.model.fields, param);
                // eslint-disable-next-line no-continue
                continue;
            }
            if (property.isArray()) {
                preparedParams[key] = param
                    ? param.map((p) => convertParam(property, this.model.fields, p))
                    : param;
            }
            else {
                preparedParams[key] = convertParam(property, this.model.fields, param);
            }
        }
        return preparedParams;
    }
    prepareReturnValues(params) {
        const preparedValues = {};
        for (const property of this.properties()) {
            const param = flat.get(params, property.path());
            const key = property.path();
            if (param !== undefined && property.type() !== 'reference') {
                preparedValues[key] = param;
                // eslint-disable-next-line no-continue
                continue;
            }
            const foreignColumnName = property.foreignColumnName();
            // eslint-disable-next-line no-continue
            if (!foreignColumnName)
                continue;
            preparedValues[key] = params[foreignColumnName];
        }
        return preparedValues;
    }
}
//# sourceMappingURL=Resource.js.map
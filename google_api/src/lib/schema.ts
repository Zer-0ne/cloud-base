import { SchemaField } from "@/utils/Interfaces";
import { Client, Pool } from 'pg';

// Base interface for all schema types
interface BaseSchemaType {
    id?: number | string; // Optional ID
    createdTime?: string; // Optional creation timestamp
    modifiedTime?: string; // Optional modification timestamp
    // Add more common properties if needed
    [key: string]: string | number | boolean | null | undefined | Array<any> | object; // Allow various types for additional properties
}


export class Schema<T extends BaseSchemaType> {
    protected rules: Record<string, SchemaField>;
    protected name: string;
    private pool: Pool;


    constructor(rules: Record<string, SchemaField>, option: { name: string }) {
        this.rules = rules;
        this.name = option.name;
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL!
        });
        this.create_table();
    }

    private getUniqueFieldKeys(): string[] {
        return Object.entries(this.rules)
            .filter(([_, rule]) => rule.unique)
            ?.map(([key]) => key);
    }

    private async withConnection<R>(callback: (client: Pool) => Promise<R>): Promise<R> {
        try {
            return await callback(this.pool);
        } catch (error) {
            throw error;
        }
    }
    checkTableExists = async (tableName: string): Promise<boolean | undefined> => {
        return this.withConnection(async (client) => {
            try {
                const query = `SELECT to_regclass($1) IS NOT NULL AS table_exists;`;
                const res = await client.query(query, [tableName]);
                return res.rows[0].table_exists || undefined;
            } catch (err) {
                console.error('Error checking table existence:', err);
                return undefined;
            }
        });
    }

    private create_table = async () => {
        const sql = this.generateSQLCreateStatements(this.rules, this.name);
        // console.log(sql)
        return this.withConnection(async (client) => {
            const exists = await this.checkTableExists(this.name);
            if (!exists) {
                return client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; ${sql.split(/\n/g).join('\n')}`);
            }
        });
    }

    private generateSQLCreateStatements = (schema: Record<string, SchemaField>, tableName: string = this.name): string => {
        let sql = `CREATE TABLE "${tableName}" (`;
        const arrayTables: Array<{ name: string; schema: Record<string, SchemaField> }> = [];
        const objectTables: Array<{ name: string; schema: Record<string, SchemaField> }> = [];

        const schemaKeys = Object.keys(schema);
        for (const key of schemaKeys) {
            const value = schema[key];

            if (value.type === String) {
                sql += `  "${key}" VARCHAR(255)`;
            } else if (value.type === Number) {
                sql += `  "${key}" INTEGER`;
            } else if (value.type === Boolean) {
                sql += `  "${key}" BOOLEAN`;
            } else if (value.type === Array) {
                if (value.itemType === Object && value.properties) {
                    // Handle array of objects (create separate table with parent_id reference)
                    const arrayTableName = `${tableName}_${key}`;
                    arrayTables.push({ name: arrayTableName, schema: value.properties });
                    // Don't add any column in the main table for arrays
                } else {
                    // Handle array of primitive types
                    const arrayTableName = `${tableName}_${key}`;
                    arrayTables.push({
                        name: arrayTableName,
                        schema: {
                            [key]: {
                                type: String,
                                ...(value.required && { required: true }),
                                ...(value.unique && { unique: true }),
                                ...(value.default !== undefined && Array.isArray(value.default) && value.default.length > 0 && { default: value.default })
                            }
                        }
                    });
                    continue;
                    // sql += `  "${key}" TEXT[]`;
                }
            } else if (value.type === Object && value.properties) {
                const nestedTableName = `${tableName}_${key}`;
                objectTables.push({ name: nestedTableName, schema: value.properties });
                sql += `  ${key}_id INTEGER`;
                sql += `,  FOREIGN KEY (${key}_id) REFERENCES ${nestedTableName}(id) ON DELETE CASCADE`;
            } else if (value.type === Object) {
                sql += `  "${key}" JSONB`;
            } else {
                throw new Error(`Unsupported type for key ${key}`);
            }

            if (value.type !== Array || (value.type === Array && value.itemType !== Object)) {
                if (value.required) {
                    sql += ' NOT NULL';
                }

                if (value.unique) {
                    sql += ' UNIQUE';
                }

                if (value.default !== undefined) {
                    let defaultValue;

                    if (typeof value.default === 'string') {
                        // Check if the string is exactly 'uuid_generate_v4()'
                        if (value.default === 'uuid_generate_v4()') {
                            defaultValue = 'uuid_generate_v4()';  // Use the function directly without quotes
                            // console.log(value.default)
                        } else {
                            defaultValue = `'${value.default}'`;  // Wrap other string values in quotes
                        }
                    } else {
                        defaultValue = value.default;  // Use the default value as is for non-string types
                    }

                    sql += ` DEFAULT ${defaultValue}`;
                }

                sql += ',';
            }
        }

        sql += '  id SERIAL PRIMARY KEY);\n';

        // Generate tables for arrays of objects
        for (const arrayTable of arrayTables) {
            sql += `CREATE TABLE ${arrayTable.name} (`;
            sql += '  id SERIAL PRIMARY KEY,';
            sql += `  parent_id INTEGER REFERENCES ${tableName}(id) ON DELETE CASCADE,`;

            for (const [key, value] of Object.entries(arrayTable.schema)) {
                if (value.type === String) {
                    sql += `  "${key}" VARCHAR(255)`;
                } else if (value.type === Number) {
                    sql += `  "${key}" INTEGER`;
                } else if (value.type === Boolean) {
                    sql += `  "${key}" BOOLEAN`;
                } else if (value.type === Object) {
                    sql += `  "${key}" JSONB`;
                } else if (value.type === Date) {
                    sql += `  "${key}" TIMESTAMPTZ`;
                }

                if (value.required) {
                    sql += ' NOT NULL';
                }
                if (value.unique) {
                    sql += ' UNIQUE';
                }
                if (value.default !== undefined) {
                    let defaultValue;

                    if (typeof value.default === 'string') {
                        // Check if the string is exactly 'uuid_generate_v4()'
                        // console.log(value.default)
                        if (value.default === 'uuid_generate_v4()') {
                            defaultValue = 'uuid_generate_v4()';  // Use the function directly without quotes
                        } else {
                            defaultValue = `'${value.default}'`;  // Wrap other string values in quotes
                        }
                    } else {
                        // if (value.default === Array || value.default === Object) {
                        //     defaultValue = '{}';
                        // }
                        defaultValue = value.default;  // Use the default value as is for non-string types
                    }

                    sql += ` DEFAULT ${defaultValue}`;
                }
                sql += ',';
            }
            sql = sql.slice(0, -1); // Remove last comma 
            sql += ');\n';
        }

        // Generate tables for nested objects
        for (const objectTable of objectTables) {
            sql += this.generateSQLCreateStatements(objectTable.schema, objectTable.name);
        }

        return sql;
    };

    create = async (newData: Partial<T>): Promise<T> => {
        return this.withConnection(async (client) => {
            await client.query('BEGIN');
            try {
                const mainData: any = { ...newData };
                const arrayData: Record<string, any[]> = {};
                const objectData: Record<string, any> = {};

                // Separate array and object data
                for (const [key, value] of Object.entries(newData)) {
                    const rule = this.rules[key];
                    if (rule?.type === Array && rule.itemType === Object) {
                        arrayData[key] = value as any[];
                        delete mainData[key];
                    } else if (rule?.type === Object && rule.properties) {
                        objectData[key] = value;
                        delete mainData[key];
                    }
                }

                // Insert nested objects first
                for (const [key, value] of Object.entries(objectData)) {
                    const nestedTableName = `${this.name}_${key}`;
                    const columns = Object.keys(value).join(', ');
                    const placeholders = Object.keys(value)
                        .map((_, idx) => `$${idx + 1}`)
                        .join(', ');
                    const result = await client.query(
                        `INSERT INTO ${nestedTableName} (${columns}) VALUES (${placeholders}) RETURNING id`,
                        Object.values(value)
                    );
                    mainData[`${key}_id`] = result.rows[0].id;
                }

                // Insert main record
                const columns = Object.keys(mainData).join(', ');
                const placeholders = Object.keys(mainData)
                    .map((_, idx) => `$${idx + 1}`)
                    .join(', ');
                const mainResult = await client.query(
                    `INSERT INTO ${this.name} (${columns}) VALUES (${placeholders}) RETURNING *`,
                    Object.values(mainData)
                );

                const insertedId = mainResult.rows[0].id;

                // Insert array data
                for (const [key, arrays] of Object.entries(arrayData)) {
                    const arrayTableName = `${this.name}_${key}`;
                    for (const item of arrays) {
                        const columns = ['parent_id', ...Object.keys(item)].join(', ');
                        const placeholders = Array(Object.keys(item).length + 1)
                            .fill(null)
                            .map((_, idx) => `$${idx + 1}`)
                            .join(', ');
                        const values = [insertedId, ...Object.values(item)];
                        await client.query(
                            `INSERT INTO ${arrayTableName} (${columns}) VALUES (${placeholders})`,
                            values
                        );
                    }
                }

                // Fetch complete record
                const result = await this.getById(insertedId);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        });
    }

    delete = async (id: number): Promise<boolean> => {
        return this.withConnection(async (client) => {
            await client.query('BEGIN');
            try {
                const record = await client.query(
                    `SELECT * FROM ${this.name} WHERE id = $1`,
                    [id]
                );

                if (record.rows.length === 0) {
                    throw new Error('Record not found');
                }

                for (const [key, value] of Object.entries(this.rules)) {
                    if (value.type === Array && value.itemType === Object) {
                        const nestedTableName = `${this.name}_${key}`;
                        const foreignKeyId = record.rows[0][`${key}_id`];

                        if (foreignKeyId) {
                            await client.query(
                                `DELETE FROM ${nestedTableName} WHERE id = $1`,
                                [foreignKeyId]
                            );
                        }
                    }
                }

                await client.query(
                    `DELETE FROM ${this.name} WHERE id = $1`,
                    [id]
                );

                await client.query('COMMIT');
                return true;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        });
    }

    update = async (id: number, updateData: Partial<T>): Promise<T> => {
        return this.withConnection(async (client) => {
            await client.query('BEGIN');
            try {
                // Handle array and object updates separately
                const mainData: any = { ...updateData };

                // Process arrays
                for (const [key, value] of Object.entries(updateData)) {
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                        const arrayTableName = `${this.name}_${key}`;

                        for (const item of value) {
                            if ('id' in item) {
                                // Update existing array item
                                const { id: itemId, ...updateFields } = item;
                                const setClause = Object.keys(updateFields)
                                    .map((col, idx) => `${col} = $${idx + 1}`)
                                    .join(', ');
                                const values = Object.values(updateFields);

                                await client.query(
                                    `UPDATE ${arrayTableName} 
                                     SET ${setClause} 
                                     WHERE id = $${values.length + 1} AND parent_id = $${values.length + 2}`,
                                    [...values, itemId, id]
                                );
                            } else {
                                // Add new array item
                                const columns = ['parent_id', ...Object.keys(item)].join(', ');
                                const placeholders = Array(Object.keys(item).length + 1)
                                    .fill(null)
                                    .map((_, idx) => `$${idx + 1}`)
                                    .join(', ');
                                const values = [id, ...Object.values(item)];

                                await client.query(
                                    `INSERT INTO ${arrayTableName} (${columns}) 
                                     VALUES (${placeholders})`,
                                    values
                                );
                            }
                        }

                        // Remove from mainData since we handled it separately
                        delete mainData[key];
                    }
                }

                // Handle object fields
                for (const [key, value] of Object.entries(mainData)) {
                    if (value && typeof value === 'object' && !Array.isArray(value) && this.rules[key]?.type === Object && this.rules[key]?.properties) {
                        const objectTableName = `${this.name}_${key}`;
                        const record = await client.query(
                            `SELECT ${key}_id FROM ${this.name} WHERE id = $1`,
                            [id]
                        );

                        const foreignKeyId = record.rows[0]?.[`${key}_id`];
                        if (foreignKeyId) {
                            // Update existing object
                            const setClause = Object.keys(value)
                                .map((col, idx) => `${col} = $${idx + 1}`)
                                .join(', ');
                            const values = Object.values(value);

                            await client.query(
                                `UPDATE ${objectTableName} 
                                 SET ${setClause} 
                                 WHERE id = $${values.length + 1}`,
                                [...values, foreignKeyId]
                            );
                        } else {
                            // Insert new object and update foreign key
                            const columns = Object.keys(value).join(', ');
                            const placeholders = Object.keys(value)
                                .map((_, idx) => `$${idx + 1}`)
                                .join(', ');
                            const result = await client.query(
                                `INSERT INTO ${objectTableName} (${columns}) 
                                 VALUES (${placeholders}) 
                                 RETURNING id`,
                                Object.values(value)
                            );
                            mainData[`${key}_id`] = result.rows[0].id;
                        }
                        delete mainData[key];
                    }
                }

                // Update main table if there are any remaining fields
                if (Object.keys(mainData).length > 0) {
                    const setClause = Object.keys(mainData)
                        .map((key, idx) => `${key} = $${idx + 1}`)
                        .join(', ');
                    const values = Object.values(mainData);

                    await client.query(
                        `UPDATE ${this.name} 
                         SET ${setClause} 
                         WHERE id = $${values.length + 1}`,
                        [...values, id]
                    );
                }

                // Fetch and return updated record
                const result = await this.getById(id);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        });
    }

    private getUniqueFields(): string[] {
        return Object.entries(this.rules)
            .filter(([_, rule]) => rule.unique)
            .map(([key]) => key);
    }

    getByID = async (query: Partial<T>): Promise<T> => {
        return this.withConnection(async (client) => {
            // Get all unique fields
            const uniqueFields = this.getUniqueFields();

            // Build WHERE clause based on provided unique fields
            const conditions: string[] = [];
            const values: any[] = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(query)) {
                if (uniqueFields.includes(key) || key === 'id') {
                    conditions.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (conditions.length === 0) {
                throw new Error('No valid unique field provided for query');
            }

            const whereClause = conditions.join(' OR ');
            const result = await client.query(
                `SELECT * FROM ${this.name} WHERE ${whereClause}`,
                values
            );

            if (result.rows.length === 0) {
                throw new Error('Record not found');
            }

            const record = result.rows[0];

            // Fetch array data
            for (const [key, value] of Object.entries(this.rules)) {
                if (value.type === Array && value.itemType === Object) {
                    const arrayTableName = `${this.name}_${key}`;
                    const arrayResult = await client.query(
                        `SELECT * FROM ${arrayTableName} WHERE parent_id = $1`,
                        [record.id]
                    );
                    record[key] = arrayResult.rows.map(row => {
                        const { id, parent_id, ...rest } = row;
                        return rest;
                    });
                } else if (value.type === Object && value.properties) {
                    const nestedTableName = `${this.name}_${key}`;
                    const foreignKeyId = record[`${key}_id`];
                    if (foreignKeyId) {
                        const nestedResult = await client.query(
                            `SELECT * FROM ${nestedTableName} WHERE id = $1`,
                            [foreignKeyId]
                        );
                        if (nestedResult.rows.length > 0) {
                            const { id, ...rest } = nestedResult.rows[0];
                            record[key] = rest;
                        }
                    }
                }
            }

            return record as T;
        });
    }

    // Keep the original getById for backward compatibility
    getById = async (id: number): Promise<T> => {
        return this.getByID({ id } as Partial<T>);
    }

    getAll = async (): Promise<T[]> => {
        return this.withConnection(async (client) => {
            const result = await client.query(`SELECT * FROM ${this.name}`);

            const records = await Promise.all(
                result.rows.map(async (record) => {
                    for (const [key, value] of Object.entries(this.rules)) {
                        if (value.type === Array && value.itemType === Object) {
                            const arrayTableName = `${this.name}_${key}`;
                            // Get all related rows from array table using parent_id
                            const arrayResult = await client.query(
                                `SELECT * FROM ${arrayTableName} WHERE parent_id = $1`,
                                [record.id]
                            );
                            // Remove internal fields and assign array data
                            record[key] = arrayResult.rows.map(row => {
                                const { id, parent_id, ...rest } = row;
                                return rest;
                            });
                        } else if (value.type === Object && value.properties) {
                            // Handle nested objects (non-array) using foreign key
                            const nestedTableName = `${this.name}_${key}`;
                            const foreignKeyId = record[`${key}_id`];
                            if (foreignKeyId) {
                                const nestedResult = await client.query(
                                    `SELECT * FROM ${nestedTableName} WHERE id = $1`,
                                    [foreignKeyId]
                                );
                                if (nestedResult.rows.length > 0) {
                                    const { id, ...rest } = nestedResult.rows[0];
                                    record[key] = rest;
                                }
                            }
                        }
                    }
                    return record;
                })
            );

            return records as T[];
        });
    }

    getByIdAndDelete = async (id: number): Promise<T> => {
        return this.withConnection(async (client) => {
            await client.query('BEGIN');
            try {
                const record = await this.getById(id);
                await this.delete(id);
                await client.query('COMMIT');
                return record;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        });
    }

    getByIdAndUpdate = async (id: number, updateData: Partial<T>): Promise<{ before: T, after: T }> => {
        return this.withConnection(async (client) => {
            await client.query('BEGIN');
            try {
                const before = await this.getById(id);
                const after = await this.update(id, updateData);
                await client.query('COMMIT');
                return { before, after };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        });
    }
}
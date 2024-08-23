export default class DB {
    private tables: string[] = [];
    private columns: string[] = ['*'];
    private joinData: string[] = [];
    private conditions: string[] = [];
    private havingConditions: string[] = [];
    private limitClause: string = '';
    private orderBystr: string = '';
    private aggregateFunction: string | null = null;
    private aggregateColumn: string = '';
    private inNotInClause: 'IN' | 'NOT IN' | null = null;
    private subquery: string | null = null;
    private unionQueries: string[] = [];
    private groupByColumns: string[] = [];
    private existsSubquery: string | null = null;

    table(tableName: string, alias?: string): this {
        this.tables.push(alias ? `${tableName} AS ${alias}` : tableName);
        return this;
    }

    select(...columns: (string | { [columnName: string]: string })[]): this {
        this.columns = columns.map(col => {
            if (typeof col === 'string') {
                return col;
            } else {
                return Object.entries(col).map(([colName, alias]) => `${colName} AS ${alias}`).join(', ');
            }
        });
        return this;
    }

    union(query: string): this {
        this.unionQueries.push(`(${query})`);
        return this;
    }

    min(columnName: string): this {
        this.aggregateFunction = 'MIN';
        this.aggregateColumn = columnName;
        return this;
    }

    max(columnName: string): this {
        this.aggregateFunction = 'MAX';
        this.aggregateColumn = columnName;
        return this;
    }

    sum(columnName: string): this {
        this.aggregateFunction = 'SUM';
        this.aggregateColumn = columnName;
        return this;
    }

    avg(columnName: string): this {
        this.aggregateFunction = 'AVG';
        this.aggregateColumn = columnName;
        return this;
    }

    in(subquery: string): this {
        this.inNotInClause = 'IN';
        this.subquery = subquery;
        return this;
    }

    notIn(subquery: string): this {
        this.inNotInClause = 'NOT IN';
        this.subquery = subquery;
        return this;
    }

    exists(subquery: string | DB): this {
        if (subquery instanceof DB) {
            this.existsSubquery = `(${subquery.get()})`;
        } else {
            this.existsSubquery = subquery;
        }
        return this;
    }

    orderBy(sortColumns: { [columnName: string]: 'ASC' | 'DESC' } = {}): this {
        const orderClauses = Object.entries(sortColumns).map(
            ([columnName, direction]) => `${columnName} ${direction}`
        ).join(', ');

        if (orderClauses) {
            this.orderBystr = `ORDER BY ${orderClauses}`;
        }

        return this;
    }

    groupBy(...columns: string[]): this {
        this.groupByColumns = columns;
        return this;
    }

    having(condition: string): this {
        this.havingConditions.push(condition);
        return this;
    }

    whereOp(condition1: string, operator: string, condition2: string): this {
        const whereClause = `${condition1} ${operator} ${condition2}`;
        this.conditions.push(whereClause);
        return this;
    }

    where(conditions: { [key: string]: any }): this {
        const conditionStrings = Object.entries(conditions).map(
            ([column, value]) => {
                if (Array.isArray(value) && value.length === 2) {
                    const [start, end] = value;
                    return `${column} BETWEEN '${start}' AND '${end}'`;
                } else if (Array.isArray(value) && value.length > 2) {
                    return `${column} IN (${value.map(v => `'${v}'`).join(', ')})`;
                } else {
                    return `${column} = '${value}'`;
                }
            }
        );
        const whereClause = conditionStrings.join(' AND ');
        this.conditions.push(whereClause);
        return this;
    }

    orWhere(conditions: { [key: string]: any }): this {
        const conditionStrings = Object.entries(conditions).map(
            ([column, value]) => {
                if (Array.isArray(value) && value.length === 2) {
                    const [start, end] = value;
                    return `${column} BETWEEN '${start}' AND '${end}'`;
                } else if (Array.isArray(value) && value.length > 2) {
                    return `${column} IN (${value.map(v => `'${v}'`).join(', ')})`;
                } else {
                    return `${column} = '${value}'`;
                }
            }
        );
        const whereClause = conditionStrings.join(' OR ');
        this.conditions.push(`(${whereClause})`);
        return this;
    }

    like(column: string, patterns: string | string[]): this {
        if (Array.isArray(patterns)) {
            const likeClauses = patterns.map(pattern => `${column} LIKE '${pattern}'`).join(' OR ');
            this.conditions.push(`(${likeClauses})`);
        } else {
            this.conditions.push(`${column} LIKE '${patterns}'`);
        }
        return this;
    }

    join(tableName: string, first: string, operator: string, second: string, alias?: string): this {
        this.joinData.push(`INNER JOIN ${tableName} ${alias ? 'AS ' + alias : ''} ON ${first} ${operator} ${second}`);
        return this;
    }

    leftJoin(tableName: string, first: string, operator: string, second: string, alias?: string): this {
        this.joinData.push(`LEFT JOIN ${tableName} ${alias ? 'AS ' + alias : ''} ON ${first} ${operator} ${second}`);
        return this;
    }

    rightJoin(tableName: string, first: string, operator: string, second: string, alias?: string): this {
        this.joinData.push(`RIGHT JOIN ${tableName} ${alias ? 'AS ' + alias : ''} ON ${first} ${operator} ${second}`);
        return this;
    }

    fullJoin(tableName: string, first: string, operator: string, second: string, alias?: string): this {
        this.joinData.push(`FULL OUTER JOIN ${tableName} ${alias ? 'AS ' + alias : ''} ON ${first} ${operator} ${second}`);
        return this;
    }

    first(): string {
        this.limitClause = 'LIMIT 1';
        return this.buildQuery();
    }

    get(): string {
        return this.buildQuery();
    }

    insert(data: { [key: string]: any }[]): string {
        if (data.length === 0) {
            throw new Error('No data to insert');
        }

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        data.forEach(row => row.createdAt = now);
        data.forEach(row => row.updatedAt = now);

        const keys = Object.keys(data[0]);
        const values = data.map(row => `(${keys.map(key => `'${row[key]}'`).join(', ')})`).join(', ');

        return `INSERT INTO ${this.tables.join(', ')} (${keys.join(', ')}) VALUES ${values}`;
    }

    update(data: { [key: string]: any }[]): string {
        if (data.length === 0) {
            throw new Error('No data to update');
        }

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        data.forEach(row => row.updatedAt = now);

        const keys = Object.keys(data[0]);
        const values = keys.map(key => `${key} = '${data[0][key]}'`).join(', ');

        if (this.conditions.length < 1) {
            throw new Error('WHERE condition is required');
        }

        return `UPDATE ${this.tables.join(', ')} SET ${values} WHERE ${this.conditions.join(' AND ')}`;
    }

    delete(): string {
        let query = `DELETE FROM ${this.tables.join(', ')}`;
        if (this.conditions.length > 0) {
            query += ` WHERE ${this.conditions.join(' AND ')}`;
        }
        return query;
    }

    count(countType: string | "*"): string {
        let query = `SELECT COUNT(${countType}) FROM ${this.tables.join(', ')}`;

        if (this.joinData.length > 0) {
            query += ` ${this.joinData.join(' ')}`;
        }

        if (this.conditions.length > 0) {
            query += ` WHERE ${this.conditions.join(' AND ')}`;
        }

        return query;
    }

    private buildQuery(): string {
        let query = `SELECT ${this.columns.join(', ')} FROM ${this.tables.join(', ')}`;

        if (this.unionQueries.length > 0) {
            query += ` ${this.unionQueries.join(' UNION ')}`;
        }

        if (this.joinData.length > 0) {
            query += ` ${this.joinData.join(' ')}`;
        }

        if (this.conditions.length > 0) {
            query += ` WHERE ${this.conditions.join(' AND ')}`;
        }

        if (this.existsSubquery) {
            query += ` AND EXISTS ${this.existsSubquery}`;
        }

        if (this.groupByColumns.length > 0) {
            query += ` GROUP BY ${this.groupByColumns.join(', ')}`;
        }

        if (this.havingConditions.length > 0) {
            query += ` HAVING ${this.havingConditions.join(' AND ')}`;
        }

        if (this.inNotInClause && this.subquery) {
            query += ` ${this.inNotInClause} (${this.subquery})`;
        }

        if (this.orderBystr) {
            query += ` ${this.orderBystr}`;
        }

        if (this.limitClause) {
            query += ` ${this.limitClause}`;
        }

        if (this.aggregateFunction && this.aggregateColumn) {
            query = `SELECT ${this.aggregateFunction}(${this.aggregateColumn}) FROM ${this.tables.join(', ')}`;
            if (this.conditions.length > 0) {
                query += ` WHERE ${this.conditions.join(' AND ')}`;
            }
        }

        return query;
    }
}

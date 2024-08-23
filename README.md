# sql-query-builder-ts
sql-query-builder-ts is made for constructing SQL queries programmatically. it contain all `select`,`insert`,`update`,`delete`,`join`,`groupBy`,`having`,`orderBy` all of them.

Complex Query with Joins and Aggregation
query example

const query = new DB()
    .table('table1')
    .join('table2', 'table1.table1id2', '=', 'table2.table2id2')
    .select('table2.table2feildName', 'COUNT(table1.table1Id1) AS table1Count')
    .where({ 'table2.table2contrydName': 'IND' })
    .groupBy('table2.table2feildName')
    .having('COUNT(table1.table1Id1) > 5')
    .orderBy({ 'table1Count': 'DESC' })
    .get();

Query with Subquery and EXISTS
import DB from 'sql-query-builder-js';

  const subquery = new DB()
        .table('subquery')
        .select('1')
        .where('subquery.subqueryID', '=', 'mainquery.mainqueryID')
        .get();
    
  const query = new DB()
        .table('mainquery')
        .select('mainqueryName')
        .whereExists(subquery)
        .get();
    

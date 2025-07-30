import { PrismaClient,PrismaPromise } from "@prisma/client";



export const $db = new PrismaClient({
  // datasourceUrl: DB_URL,
});
/**
 * Query and count results (for pagination)
 * @param queryList
 * @returns
 */
export const findAndCount = async <T>(queryList: [PrismaPromise<T>, PrismaPromise<number>]) => {
  const queryRes = await Promise.all(queryList);
  return {
    data: queryRes[0],
    total: queryRes[1],
    success: true,
  };
};

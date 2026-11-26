// What a jsonb column holds: an object or an array. (A fully recursive JSON type is too deep for TypeORM's insert types.)
export type Json = object;

import { Query } from 'mongoose';

declare module 'mongoose' {
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    lean<T = ResultType>(): Promise<T>;
  }
} 
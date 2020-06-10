import { IncomingMessage, ServerResponse } from 'http'

export interface IOptions {
  // Default: false
  useHeader?: boolean
  // Default: 'X-Request-Id'
  headerName?: string
}

export interface IHapiPlugin<T> {
  name: string
  once: boolean
  register: (server: any, options: T) => void | Promise<void>
}

export declare const expressMiddleware: (
  options?: IOptions,
) => (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: any) => void,
) => void

export declare const fastifyMiddleware: (
  options?: IOptions,
) => (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: any) => void,
) => void

export declare const koaMiddleware: (
  options?: IOptions,
) => (
  ctx: { request: IncomingMessage; response: ServerResponse },
  next: () => Promise<void>,
) => Promise<void>

export declare const koaV1Middleware: (
  options?: IOptions,
) => GeneratorFunction

export declare const hapiPlugin: IHapiPlugin<IOptions>

export declare const runWithId: (fn: Function, id?: any) => any

export declare const id: () => string | undefined

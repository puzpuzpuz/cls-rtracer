import { IncomingMessage, ServerResponse } from 'http'

export interface IMiddlewareOptions {
  // Default: false
  useHeader?: boolean
  // Default: 'X-Request-Id'
  headerName?: string
}

export declare const id: () => string | undefined

export declare const expressMiddleware: (
  options?: IMiddlewareOptions,
) => (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: any) => void,
) => void

export declare const koaMiddleware: (
  options?: IMiddlewareOptions,
) => (
  ctx: { request: IncomingMessage; response: ServerResponse },
  next: () => Promise<void>,
) => Promise<void>

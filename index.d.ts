import { IncomingMessage, ServerResponse } from 'http'
import { Plugin } from 'hapi'

export interface IOptions {
  // Default: false
  useHeader?: boolean
  // Default: 'X-Request-Id'
  headerName?: string
}

export declare const id: () => string | undefined

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

export declare const hapiPlugin: Plugin<IOptions>

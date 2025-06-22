"use strict";

/// Module scoped variables
let logger;
let path;

export default class Logger {

    constructor(winston, __path){

        /// Set module variables
        path = __path;

        /// Custom format to include file name and line number
        let logFormat = winston.format.printf(({ timestamp, level, path, message }) => {
            
            /// Structure the format of the logs
            return `${ timestamp } [${ level.toUpperCase() }] [${path }]: ${ message }`;
        });

        /// Create a Winston logger
        logger = winston.createLogger({
            level: process.env.LOG_LEVEL,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSSSS' }),
                winston.format.errors({ stack: true }),
                logFormat
            ),
            transports: [
                new winston.transports.Console()
            ],
        });
    }


    debug(message) {
        logger.debug({ message, path : this.#getCaller() })
    }

    info(message) {
        logger.info({ message, path : this.#getCaller() })
    }
    
    error(message) {
        logger.error({ message, path : this.#getCaller() })
    }

    #getCaller(depth = 2) {
        const orig = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, stack) => stack;
        const err = new Error();
        const stack = err.stack;
        Error.prepareStackTrace = orig;

        const frame = stack[depth];
        if (!frame) return null;
        const file = path.basename(frame.getFileName());
        const line = frame.getLineNumber();
        return `${file}:${line}`;
    }
}
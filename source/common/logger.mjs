"use strict";

/// Import 3rd party libraries
import Winston from 'winston';

/// Module scoped variables
let logger;
let path;

export default class Logger {

    constructor(__path){

        /// Set module variables
        path = __path;

        /// Custom format to include file name and line number
        let logFormat = Winston.format.printf(({ timestamp, level, path, message }) => {
            
            /// Structure the format of the logs
            return `${ timestamp } [${ level.toUpperCase() }] [${ path }]: ${ message }`;
        });

        let transports = [ new Winston.transports.Console() ]

        /// Configure logging to file if present
        if(process.env.hasOwnProperty("LOG_FILE") == true)  {

            transports = [ new Winston.transports.File({ filename: process.env.LOG_FILE })]
        }

        /// Create a Winston logger
        logger = Winston.createLogger({
            level: process.env.LOG_LEVEL,
            format: Winston.format.combine(
                Winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSSSS' }),
                Winston.format.errors({ stack: true }),
                logFormat
            ),
            transports: transports,
        });
    }


    debug(message = "") {
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
        if (frame == false) return null;
        const file = path.basename(frame.getFileName());
        const line = frame.getLineNumber();
        return `${file}:${line}`;
    }
}